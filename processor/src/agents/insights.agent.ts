import { Agent } from '@mastra/core';
import { openai, logger } from '../config/mastra.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface InsightsJobData {
  sessionId: string;
  transcriptionId?: string;
}

interface InsightsResult {
  summary: string;
  keyTopics: string[];
  actionItems: Array<{ item: string; assignee: string; priority: string }>;
  sentiment: {
    overall: string;
    scores: {
      positive: number;
      neutral: number;
      negative: number;
    };
    emotionalMoments: Array<{ timestamp: string; emotion: string; context: string }>;
  };
  coaching: {
    goalsDiscussed: string[];
    progressIndicators: string[];
    challengesIdentified: string[];
    breakthroughs: string[];
    suggestedFollowups: string[];
    clientEngagementScore: number;
    sessionEffectivenessScore: number;
  };
}

export class InsightsAgent extends Agent {
  constructor() {
    super({
      name: 'insights-agent',
      description: 'Analyzes session transcriptions to generate coaching insights',
    });
  }

  async execute(data: InsightsJobData): Promise<any> {
    const { sessionId } = data;
    
    logger.info(`Starting insights generation for session ${sessionId}`);

    try {
      // Get transcription
      const transcription = await prisma.sessionTranscription.findUnique({
        where: { session_id: sessionId },
        include: {
          session: {
            include: {
              coach: true,
              client: true,
            },
          },
        },
      });

      if (!transcription) {
        throw new Error(`Transcription not found for session ${sessionId}`);
      }

      // Update job status
      await prisma.processingJob.upsert({
        where: { session_id: sessionId },
        update: {
          job_type: 'insights',
          status: 'processing',
          started_at: new Date(),
        },
        create: {
          session_id: sessionId,
          job_type: 'insights',
          status: 'processing',
          started_at: new Date(),
        },
      });

      // Generate insights using GPT-4
      const insights = await this.generateInsights(
        transcription.formatted_transcription || transcription.raw_transcription,
        {
          coachName: transcription.session.coach.first_name + ' ' + transcription.session.coach.last_name,
          clientName: transcription.session.client.first_name + ' ' + transcription.session.client.last_name,
          sessionTitle: transcription.session.title,
          duration: transcription.session.duration_minutes,
        }
      );

      // Save insights to database
      await prisma.sessionInsight.create({
        data: {
          session_id: sessionId,
          summary: insights.summary,
          key_topics: insights.keyTopics,
          action_items: insights.actionItems,
          overall_sentiment: insights.sentiment.overall,
          sentiment_scores: insights.sentiment.scores,
          emotional_moments: insights.sentiment.emotionalMoments,
          goals_discussed: insights.coaching.goalsDiscussed,
          progress_indicators: insights.coaching.progressIndicators,
          challenges_identified: insights.coaching.challengesIdentified,
          breakthroughs: insights.coaching.breakthroughs,
          suggested_followups: insights.coaching.suggestedFollowups,
          client_engagement_score: insights.coaching.clientEngagementScore,
          session_effectiveness_score: insights.coaching.sessionEffectivenessScore,
          ai_model: 'gpt-4-turbo-preview',
          processing_completed_at: new Date(),
        },
      });

      // Update job status
      await prisma.processingJob.update({
        where: { session_id: sessionId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          result: insights,
        },
      });

      logger.info(`Insights generation completed for session ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        insightsGenerated: true,
      };

    } catch (error) {
      logger.error(`Insights generation failed for session ${sessionId}:`, error);
      
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

  private async generateInsights(
    transcription: string,
    context: {
      coachName: string;
      clientName: string;
      sessionTitle: string;
      duration: number;
    }
  ): Promise<InsightsResult> {
    const systemPrompt = `You are an expert coaching session analyst. Analyze the following coaching session transcript and provide detailed insights. The session was between coach ${context.coachName} and client ${context.clientName}, titled "${context.sessionTitle}" and lasted ${context.duration} minutes.

Your analysis should be thorough, actionable, and focused on helping both the coach and client improve their future sessions.`;

    const userPrompt = `Analyze this coaching session transcript and provide insights in the following JSON format:

{
  "summary": "A 2-3 paragraph summary of the session",
  "keyTopics": ["List of main topics discussed"],
  "actionItems": [
    {
      "item": "Specific action item",
      "assignee": "coach or client",
      "priority": "high/medium/low"
    }
  ],
  "sentiment": {
    "overall": "positive/neutral/negative",
    "scores": {
      "positive": 0.0-1.0,
      "neutral": 0.0-1.0,
      "negative": 0.0-1.0
    },
    "emotionalMoments": [
      {
        "timestamp": "MM:SS",
        "emotion": "emotion type",
        "context": "brief description"
      }
    ]
  },
  "coaching": {
    "goalsDiscussed": ["List of goals mentioned"],
    "progressIndicators": ["Signs of progress identified"],
    "challengesIdentified": ["Challenges or obstacles discussed"],
    "breakthroughs": ["Any breakthrough moments"],
    "suggestedFollowups": ["Recommendations for next session"],
    "clientEngagementScore": 0-100,
    "sessionEffectivenessScore": 0-100
  }
}

Transcript:
${transcription}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(response) as InsightsResult;
    } catch (error) {
      logger.error('Failed to parse insights JSON:', response);
      throw new Error('Failed to parse insights from AI response');
    }
  }
}

export const insightsAgent = new InsightsAgent();