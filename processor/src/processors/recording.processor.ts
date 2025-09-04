import { Job } from 'bull';
import { recordingQueue, transcriptionQueue, insightsQueue } from '../config/queue.config';
import { transcriptionAgent } from '../agents/transcription.agent';
import { insightsAgent } from '../agents/insights.agent';
import { logger } from '../config/mastra.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RecordingProcessingData {
  sessionId: string;
  recordingS3Key?: string;
  recordingUrl?: string;
  triggerType: 'webhook' | 'manual' | 'scheduled';
}

// Process recording jobs
recordingQueue.process(async (job: Job<RecordingProcessingData>) => {
  const { sessionId, recordingS3Key, recordingUrl, triggerType } = job.data;
  
  logger.info(`Processing recording for session ${sessionId}`);
  
  try {
    // Get session details
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if recording is ready
    if (session.recording_status !== 'completed') {
      logger.info(`Recording not yet completed for session ${sessionId}, skipping`);
      return { skipped: true, reason: 'Recording not completed' };
    }

    // Queue transcription job
    await transcriptionQueue.add('transcribe', {
      sessionId,
      recordingS3Key: recordingS3Key || session.recording_s3_key,
      recordingUrl: recordingUrl || session.recording_url,
    }, {
      delay: 5000, // Wait 5 seconds before starting
    });

    logger.info(`Queued transcription job for session ${sessionId}`);
    
    return {
      success: true,
      sessionId,
      nextStep: 'transcription',
    };

  } catch (error) {
    logger.error(`Failed to process recording for session ${sessionId}:`, error);
    throw error;
  }
});

// Process transcription jobs
transcriptionQueue.process(async (job: Job) => {
  const data = job.data;
  
  logger.info(`Starting transcription for session ${data.sessionId}`);
  
  try {
    // Execute transcription agent
    const result = await transcriptionAgent.execute(data);
    
    // Queue insights generation job
    await insightsQueue.add('generate-insights', {
      sessionId: data.sessionId,
    }, {
      delay: 2000, // Wait 2 seconds before starting
    });

    logger.info(`Transcription completed, queued insights generation for session ${data.sessionId}`);
    
    return result;

  } catch (error) {
    logger.error(`Transcription failed for session ${data.sessionId}:`, error);
    throw error;
  }
});

// Process insights generation jobs
insightsQueue.process(async (job: Job) => {
  const data = job.data;
  
  logger.info(`Starting insights generation for session ${data.sessionId}`);
  
  try {
    // Execute insights agent
    const result = await insightsAgent.execute(data);
    
    // Send notification to coach and client (optional)
    await notifySessionProcessed(data.sessionId);
    
    logger.info(`Insights generation completed for session ${data.sessionId}`);
    
    return result;

  } catch (error) {
    logger.error(`Insights generation failed for session ${data.sessionId}:`, error);
    throw error;
  }
});

// Helper function to notify when processing is complete
async function notifySessionProcessed(sessionId: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        coach: true,
        client: true,
        insights: true,
      },
    });

    if (!session || !session.insights) {
      return;
    }

    // Here you would implement notification logic
    // For example, send an email or push notification
    logger.info(`Session ${sessionId} processing complete, notifications would be sent`);
    
    // Update session to indicate processing is complete
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        updated_at: new Date(),
      },
    });

  } catch (error) {
    logger.error(`Failed to send notifications for session ${sessionId}:`, error);
  }
}

// Export function to queue a new recording processing job
export async function queueRecordingProcessing(
  sessionId: string,
  recordingS3Key?: string,
  recordingUrl?: string,
  delay: number = 0
) {
  const job = await recordingQueue.add('process-recording', {
    sessionId,
    recordingS3Key,
    recordingUrl,
    triggerType: 'webhook',
  }, {
    delay,
  });

  logger.info(`Queued recording processing job ${job.id} for session ${sessionId}`);
  
  return job;
}