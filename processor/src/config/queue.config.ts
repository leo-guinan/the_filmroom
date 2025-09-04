import Bull from 'bull';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL
const redisOptions = (() => {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
})();

// Create Redis clients for Bull
export const createRedisClient = () => new Redis(redisOptions);

// Define queue names
export const QUEUE_NAMES = {
  RECORDING_PROCESSING: 'recording-processing',
  TRANSCRIPTION: 'transcription',
  INSIGHTS_GENERATION: 'insights-generation',
  NOTIFICATION: 'notification',
} as const;

// Create queues
export const recordingQueue = new Bull(QUEUE_NAMES.RECORDING_PROCESSING, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const transcriptionQueue = new Bull(QUEUE_NAMES.TRANSCRIPTION, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const insightsQueue = new Bull(QUEUE_NAMES.INSIGHTS_GENERATION, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

// Queue event handlers
recordingQueue.on('completed', (job, result) => {
  console.log(`Recording processing job ${job.id} completed`);
});

recordingQueue.on('failed', (job, err) => {
  console.error(`Recording processing job ${job.id} failed:`, err);
});

transcriptionQueue.on('completed', (job, result) => {
  console.log(`Transcription job ${job.id} completed`);
});

transcriptionQueue.on('failed', (job, err) => {
  console.error(`Transcription job ${job.id} failed:`, err);
});

insightsQueue.on('completed', (job, result) => {
  console.log(`Insights generation job ${job.id} completed`);
});

insightsQueue.on('failed', (job, err) => {
  console.error(`Insights generation job ${job.id} failed:`, err);
});