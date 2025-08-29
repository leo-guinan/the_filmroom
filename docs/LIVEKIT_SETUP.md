# LiveKit Setup Guide

## Local Development

### Option 1: Using Docker (Recommended)

1. Start the local LiveKit server:
```bash
docker-compose -f docker-compose.livekit.yml up -d
```

2. The backend `.env.local` file is already configured with:
```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

3. Start your backend and frontend as usual:
```bash
# Backend
cd backend
uvicorn src.main:app --reload

# Frontend
cd frontend
pnpm dev
```

4. Test the video by clicking "Test Video" on the dashboard

### Option 2: LiveKit CLI (Alternative)

1. Install LiveKit CLI:
```bash
brew install livekit-cli
```

2. Run LiveKit server in dev mode:
```bash
livekit-server --dev
```

This will start LiveKit with default dev credentials (same as Docker option).

## Production Setup

### Option 1: LiveKit Cloud (Recommended for Production)

1. Sign up for LiveKit Cloud: https://cloud.livekit.io

2. Create a new project and get your credentials:
   - API Key
   - API Secret
   - Server URL (usually `wss://your-project.livekit.cloud`)

3. In FlightControl, set these environment variables for your backend:
   - `LIVEKIT_API_KEY`: Your LiveKit API key
   - `LIVEKIT_API_SECRET`: Your LiveKit API secret
   - `LIVEKIT_URL`: Your LiveKit server URL (without wss:// prefix)

### Option 2: Self-Hosted LiveKit

1. Deploy LiveKit server on your infrastructure (AWS, GCP, etc.)
   - See: https://docs.livekit.io/realtime/self-hosting/deployment/

2. Configure SSL/TLS for production use

3. Update environment variables with your server details

## Troubleshooting

### Connection Failed Error
If you see "WebSocket connection to 'wss://localhost:7880/rtc' failed":
- Ensure LiveKit server is running (check with `docker ps`)
- Verify environment variables are loaded correctly
- Check that ports 7880-7882 are not blocked

### Token Generation Error
If tokens fail to generate:
- Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET match your server config
- Check backend logs for JWT encoding errors

### CORS Issues
LiveKit WebRTC connections bypass CORS, but ensure:
- Frontend can reach backend API for token generation
- WebSocket connections are not blocked by firewall

## Testing

1. Click "Test Video" button on dashboard
2. Allow camera/microphone permissions when prompted
3. You should see your video feed
4. Open another browser/tab and join the same test room to test multi-participant