import dotenv from 'dotenv';
import { startServer } from './api/server';
import { logger } from './config/mastra.config';
import { recordingQueue, transcriptionQueue, insightsQueue } from './config/queue.config';
import './processors/recording.processor';

// Load environment variables
dotenv.config();

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    // Close queue connections
    await Promise.all([
      recordingQueue.close(),
      transcriptionQueue.close(),
      insightsQueue.close(),
    ]);
    
    logger.info('All queues closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the service
async function start() {
  try {
    logger.info('Starting recording processor service...');
    
    // Log configuration
    logger.info('Configuration:', {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || 3001,
      redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured',
      awsS3: process.env.APP_AWS_ACCESS_KEY_ID ? 'configured' : 'not configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    });

    // Check queue health
    const queueHealthChecks = await Promise.all([
      recordingQueue.isReady(),
      transcriptionQueue.isReady(),
      insightsQueue.isReady(),
    ]);

    if (queueHealthChecks.every(Boolean)) {
      logger.info('All queues are healthy');
    } else {
      logger.warn('Some queues may not be ready');
    }

    // Start the Express server
    startServer();

    logger.info('Recording processor service started successfully');
    
  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Start the application
start();