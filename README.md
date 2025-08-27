# The Film Room

A secure coaching platform enabling encrypted video sessions with AI-powered transcription and client management.

## Overview

The Film Room provides coaches with a comprehensive platform for conducting secure video sessions with clients. It combines:
- **Encrypted video conferencing** via LiveKit for privacy and security
- **Seamless scheduling** through Cal.com integration
- **AI-powered session insights** with automatic transcription and analysis
- **Client management tools** for tracking progress and session notes

## Tech Stack

### Backend (Python)
- **Package Manager**: uv
- **Framework**: FastAPI
- **Key Responsibilities**:
  - LiveKit agent for session recording and transcription
  - AI agent orchestration for session analysis
  - Client data management and tracking
  - API for frontend integration

### Frontend (Next.js)
- **Package Manager**: pnpm
- **Language**: TypeScript
- **Key Features**:
  - LiveKit video conference integration
  - Cal.com scheduling widget
  - Coach dashboard for client management
  - Session history and insights viewer

### Core Services
- **Video Infrastructure**: LiveKit.io (self-hosted or cloud)
- **Scheduling**: Cal.com integration
- **Database**: PostgreSQL
- **AI Processing**: OpenAI/Anthropic APIs for transcription analysis

## Deployment
- **Platform**: FlightControl
- **Services**:
  - Python backend API
  - Next.js frontend application
  - PostgreSQL database

## Project Structure
```
the_filmroom/
├── backend/           # Python FastAPI + LiveKit Agent
│   ├── pyproject.toml
│   ├── src/
│   │   ├── agents/    # LiveKit agents for transcription
│   │   ├── api/       # FastAPI routes
│   │   ├── models/    # Database models
│   │   └── services/  # AI and business logic
│   └── tests/
├── frontend/          # Next.js coaching platform
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── video/     # LiveKit components
│   │   │   ├── scheduling/ # Cal.com integration
│   │   │   └── dashboard/  # Coach dashboard
│   │   ├── pages/
│   │   └── lib/
│   └── public/
├── flightcontrol.json # FlightControl configuration
├── docker-compose.yml # Local development
└── README.md
```

## Key Features

### For Coaches
- **Secure Video Sessions**: End-to-end encrypted video calls with clients
- **Automated Transcription**: Every session is automatically transcribed for review
- **AI-Powered Insights**: Get summaries, action items, and progress tracking from session content
- **Client Management**: Track client progress, session history, and notes in one place
- **Integrated Scheduling**: Seamless Cal.com integration for booking and calendar management

### For Clients
- **Easy Booking**: Simple scheduling through Cal.com
- **Secure Access**: Private, encrypted sessions with their coach
- **Session History**: Access to past session recordings and notes

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- uv (Python package manager)
- pnpm (Node package manager)
- LiveKit server (local or cloud)
- PostgreSQL database
- Cal.com account (for scheduling integration)

### Development Setup

#### Backend
```bash
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
uv run fastapi dev src/main.py
```

#### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

#### LiveKit Server (Local Development)
```bash
# Using Docker
docker run -d \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server
```

## Deployment

Deployments are handled via FlightControl. Push to main branch to trigger automatic deployment.