import express from 'express';
import { PrismaClient } from '@prisma/client';
import { recordingQueue, transcriptionQueue, insightsQueue } from '../config/queue.config';
import { queueRecordingProcessing } from '../processors/recording.processor';
import { logger } from '../config/mastra.config';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'recording-processor',
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoint for recording completion
app.post('/webhooks/recording-completed', async (req, res) => {
  try {
    const { sessionId, recordingS3Key, recordingUrl } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Queue the recording for processing
    const job = await queueRecordingProcessing(
      sessionId,
      recordingS3Key,
      recordingUrl,
      10000 // Wait 10 seconds to ensure recording is fully uploaded
    );

    res.json({
      success: true,
      jobId: job.id,
      sessionId,
      message: 'Recording queued for processing',
    });

  } catch (error) {
    logger.error('Failed to queue recording:', error);
    res.status(500).json({
      error: 'Failed to queue recording for processing',
    });
  }
});

// Manual trigger for processing a session
app.post('/api/sessions/:sessionId/process', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session details
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Queue for processing
    const job = await queueRecordingProcessing(
      sessionId,
      session.recording_s3_key || undefined,
      session.recording_url || undefined
    );

    res.json({
      success: true,
      jobId: job.id,
      sessionId,
      message: 'Session queued for processing',
    });

  } catch (error) {
    logger.error('Failed to process session:', error);
    res.status(500).json({
      error: 'Failed to process session',
    });
  }
});

// Get processing status for a session
app.get('/api/sessions/:sessionId/processing-status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get processing jobs
    const processingJob = await prisma.processingJob.findUnique({
      where: { session_id: sessionId },
    });

    // Get transcription and insights
    const transcription = await prisma.sessionTranscription.findUnique({
      where: { session_id: sessionId },
    });

    const insights = await prisma.sessionInsight.findUnique({
      where: { session_id: sessionId },
    });

    res.json({
      sessionId,
      processingJob: processingJob ? {
        type: processingJob.job_type,
        status: processingJob.status,
        startedAt: processingJob.started_at,
        completedAt: processingJob.completed_at,
        errorMessage: processingJob.error_message,
      } : null,
      transcription: transcription ? {
        id: transcription.id,
        completedAt: transcription.processing_completed_at,
        wordCount: transcription.raw_transcription.split(' ').length,
      } : null,
      insights: insights ? {
        id: insights.id,
        completedAt: insights.processing_completed_at,
        hasSummary: !!insights.summary,
        hasActionItems: !!insights.action_items,
      } : null,
    });

  } catch (error) {
    logger.error('Failed to get processing status:', error);
    res.status(500).json({
      error: 'Failed to get processing status',
    });
  }
});

// Get queue statistics
app.get('/api/queues/stats', async (req, res) => {
  try {
    const [recordingStats, transcriptionStats, insightsStats] = await Promise.all([
      recordingQueue.getJobCounts(),
      transcriptionQueue.getJobCounts(),
      insightsQueue.getJobCounts(),
    ]);

    res.json({
      recording: recordingStats,
      transcription: transcriptionStats,
      insights: insightsStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue statistics',
    });
  }
});

// Get insights for a session
app.get('/api/sessions/:sessionId/insights', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const insights = await prisma.sessionInsight.findUnique({
      where: { session_id: sessionId },
      include: {
        session: {
          include: {
            coach: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
            client: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    if (!insights) {
      return res.status(404).json({ error: 'Insights not found' });
    }

    res.json(insights);

  } catch (error) {
    logger.error('Failed to get insights:', error);
    res.status(500).json({
      error: 'Failed to get insights',
    });
  }
});

// Get transcription for a session
app.get('/api/sessions/:sessionId/transcription', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const transcription = await prisma.sessionTranscription.findUnique({
      where: { session_id: sessionId },
    });

    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json({
      id: transcription.id,
      sessionId: transcription.session_id,
      text: transcription.formatted_transcription || transcription.raw_transcription,
      completedAt: transcription.processing_completed_at,
      engine: transcription.transcription_engine,
    });

  } catch (error) {
    logger.error('Failed to get transcription:', error);
    res.status(500).json({
      error: 'Failed to get transcription',
    });
  }
});

export function startServer() {
  app.listen(PORT, () => {
    logger.info(`Recording processor API listening on port ${PORT}`);
    console.log(`🚀 Recording processor service running at http://localhost:${PORT}`);
  });
}

export default app;