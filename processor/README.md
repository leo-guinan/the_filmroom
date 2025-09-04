# Recording Processor Service

A TypeScript backend service using Mastra agents to process coaching session recordings asynchronously.

## Features

- **Automatic Recording Processing**: Processes recordings when they complete
- **Transcription**: Uses OpenAI Whisper to transcribe audio/video
- **Insights Generation**: Analyzes sessions with GPT-4 for coaching insights
- **Queue-Based Processing**: Uses Bull queues with Redis for reliable async processing
- **Mastra Agents**: Modular agent-based architecture for processing tasks

## Architecture

```
Recording Completed (Webhook)
    ↓
Recording Queue
    ↓
Transcription Agent (Whisper)
    ↓
Insights Agent (GPT-4)
    ↓
Database Update & Notifications
```

## Prerequisites

- Node.js 18+
- Redis server
- PostgreSQL database (shared with main backend)
- OpenAI API key (for transcription and insights)
- AWS S3 credentials (optional, for cloud storage)

## Installation

```bash
npm install
npx prisma generate
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/filmroom_db
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

- `POST /webhooks/recording-completed` - Webhook for recording completion
- `POST /api/sessions/:sessionId/process` - Manual trigger for processing
- `GET /api/sessions/:sessionId/processing-status` - Get processing status
- `GET /api/sessions/:sessionId/insights` - Get session insights
- `GET /api/sessions/:sessionId/transcription` - Get session transcription
- `GET /api/queues/stats` - Queue statistics
- `GET /health` - Health check

## Queue Management

The service uses three main queues:
1. **Recording Queue** - Initial processing of completed recordings
2. **Transcription Queue** - Audio/video transcription jobs
3. **Insights Queue** - AI-powered insights generation

## Processing Pipeline

1. **Recording Webhook**: Main backend notifies when recording completes
2. **Queue Job**: Job added to recording queue with delay
3. **Download**: Recording downloaded from S3 (if applicable)
4. **Transcription**: OpenAI Whisper processes audio
5. **Insights**: GPT-4 analyzes transcription for insights
6. **Storage**: Results saved to PostgreSQL database
7. **Notification**: Optional notifications sent to users

## Development

### Adding New Agents

Create new agents in `src/agents/`:

```typescript
export class MyAgent extends Agent {
  async execute(data: JobData): Promise<Result> {
    // Processing logic
  }
}
```

### Database Migrations

The service shares the database with the main backend. Use the main backend's Alembic migrations for schema changes.

## Monitoring

- Queue stats available at `/api/queues/stats`
- Processing status per session at `/api/sessions/:id/processing-status`
- Logs use structured logging with Mastra logger

## Deployment

The service can be deployed separately from the main backend:

1. Set up Redis instance
2. Configure environment variables
3. Build: `npm run build`
4. Start: `npm start`

## Integration with Main Backend

The main backend automatically notifies this service when:
- Recording completes (via webhook)
- Manual processing requested

Configure `PROCESSOR_SERVICE_URL` in the main backend to point to this service.