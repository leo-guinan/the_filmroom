import { Agent } from '@mastra/core';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { openai, logger } from '../config/mastra.config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface TranscriptionJobData {
  sessionId: string;
  recordingS3Key?: string;
  recordingUrl?: string;
  localPath?: string;
}

export class TranscriptionAgent extends Agent {
  constructor() {
    super({
      name: 'transcription-agent',
      description: 'Processes audio/video recordings to generate transcriptions',
    });
  }

  async execute(data: TranscriptionJobData): Promise<any> {
    const { sessionId, recordingS3Key, recordingUrl, localPath } = data;
    
    logger.info(`Starting transcription for session ${sessionId}`);

    try {
      // Update job status
      await prisma.processingJob.upsert({
        where: { session_id: sessionId },
        update: {
          status: 'processing',
          started_at: new Date(),
        },
        create: {
          session_id: sessionId,
          job_type: 'transcription',
          status: 'processing',
          started_at: new Date(),
        },
      });

      // Get the audio file
      let audioBuffer: Buffer;
      let tempFilePath: string | null = null;

      if (recordingS3Key) {
        // Download from S3
        logger.info(`Downloading recording from S3: ${recordingS3Key}`);
        audioBuffer = await this.downloadFromS3(recordingS3Key);
        
        // Save to temporary file for OpenAI
        tempFilePath = path.join('/tmp', `${sessionId}_recording.mp4`);
        await fs.writeFile(tempFilePath, audioBuffer);
      } else if (localPath) {
        // Read from local file
        logger.info(`Reading recording from local path: ${localPath}`);
        audioBuffer = await fs.readFile(localPath);
        tempFilePath = localPath;
      } else {
        throw new Error('No recording source provided');
      }

      // Transcribe using OpenAI Whisper
      logger.info('Sending to OpenAI Whisper for transcription');
      const transcription = await this.transcribeWithWhisper(tempFilePath);

      // Process speaker diarization (simplified - you might want to use a more sophisticated approach)
      const formattedTranscription = this.formatTranscription(transcription);

      // Save transcription to database
      await prisma.sessionTranscription.create({
        data: {
          session_id: sessionId,
          raw_transcription: transcription.text,
          formatted_transcription: formattedTranscription,
          processing_started_at: new Date(),
          processing_completed_at: new Date(),
          transcription_engine: 'whisper-1',
          speakers: {
            coach: { segments: [] },
            client: { segments: [] },
          },
        },
      });

      // Update job status
      await prisma.processingJob.update({
        where: { session_id: sessionId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          result: {
            transcription_id: sessionId,
            word_count: transcription.text.split(' ').length,
          },
        },
      });

      // Clean up temporary file
      if (tempFilePath && tempFilePath !== localPath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }

      logger.info(`Transcription completed for session ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        wordCount: transcription.text.split(' ').length,
        transcriptionLength: transcription.text.length,
      };

    } catch (error) {
      logger.error(`Transcription failed for session ${sessionId}:`, error);
      
      // Update job status to failed
      await prisma.processingJob.update({
        where: { session_id: sessionId },
        data: {
          status: 'failed',
          completed_at: new Date(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private async downloadFromS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  private async transcribeWithWhisper(filePath: string): Promise<any> {
    const file = await fs.readFile(filePath);
    
    // Create a File object from the buffer
    const audioFile = new File([file], path.basename(filePath), { type: 'audio/mp4' });
    
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word'],
    });

    return response;
  }

  private formatTranscription(transcription: any): string {
    // Simple formatting - you can enhance this with actual speaker diarization
    const { text, segments } = transcription;
    
    if (!segments || segments.length === 0) {
      return text;
    }

    let formatted = '';
    segments.forEach((segment: any, index: number) => {
      const timestamp = this.formatTimestamp(segment.start);
      const speaker = index % 2 === 0 ? 'Coach' : 'Client'; // Simplified - you'd want better speaker identification
      formatted += `[${timestamp}] ${speaker}: ${segment.text}\n\n`;
    });

    return formatted;
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const transcriptionAgent = new TranscriptionAgent();