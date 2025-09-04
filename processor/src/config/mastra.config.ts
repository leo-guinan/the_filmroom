import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create logger
export const logger = createLogger('recording-processor');

// Initialize Mastra
export const mastra = new Mastra({
  name: 'recording-processor',
  version: '1.0.0',
  logger,
});

// Agent configurations
export const AGENT_CONFIGS = {
  transcription: {
    name: 'transcription-agent',
    description: 'Processes audio recordings to generate transcriptions',
    model: 'whisper-1',
  },
  insights: {
    name: 'insights-agent',
    description: 'Analyzes transcriptions to generate coaching insights',
    model: 'gpt-4-turbo-preview',
  },
  summary: {
    name: 'summary-agent',
    description: 'Creates concise summaries of coaching sessions',
    model: 'gpt-4-turbo-preview',
  },
};