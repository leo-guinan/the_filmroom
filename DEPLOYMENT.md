# The Film Room - Deployment Guide

## FlightControl Deployment

This project is configured for deployment on FlightControl with the following services:

### Services Architecture

1. **PostgreSQL Database** (RDS)
   - Instance type: `db.t4g.micro` with 20GB storage
   - Engine: PostgreSQL 15.6
   - Private networking for security

2. **Backend API** (Python/FastAPI)
   - Deployed from `/backend` directory
   - Runs on port 8000
   - Auto-scaling: 1-3 instances (0.5 vCPU, 2GB RAM each)
   - Health check endpoint: `/health`

3. **Frontend Web App** (Next.js)
   - Deployed from `/frontend` directory
   - Runs on port 3000
   - Auto-scaling: 1-3 instances (0.5 vCPU, 2GB RAM each)

### Environment Configuration

- **Branch**: `main`
- **Region**: `us-east-1`
- **URLs**: Will be provided by FlightControl after deployment

### Required Environment Variables

Before deploying, you need to set up the following environment variables in FlightControl's Parameter Store:

#### Backend Variables
- `SECRET_KEY` - JWT secret key for authentication (generate a strong random string)
- `LIVEKIT_API_KEY` - LiveKit API key from your LiveKit Cloud account
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `LIVEKIT_URL` - LiveKit server URL (e.g., `wss://your-project.livekit.cloud`)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `REDIS_URL` - Redis connection URL (optional for initial deployment)

#### Frontend Variables
- `LIVEKIT_URL` - Same LiveKit server URL for client connections
- `CAL_LINK` - Your Cal.com scheduling link (e.g., `your-username`)

### Deployment Steps

1. **Prepare Your Code**
   ```bash
   # Ensure your code is committed
   git add .
   git commit -m "Ready for deployment"
   
   # Push to main branch
   git push origin main
   ```

2. **FlightControl Setup**
   - Sign up/Login to [FlightControl](https://app.flightcontrol.dev)
   - Click "Create Project" and connect your GitHub repository
   - FlightControl will automatically detect the `flightcontrol.json` file
   - Review the configuration and confirm

3. **Configure Environment Variables**
   - In FlightControl dashboard, go to your project
   - Navigate to "Parameter Store" or "Environment Variables"
   - Add all required variables listed above
   - Save the configuration

4. **Deploy**
   - Click "Deploy" in FlightControl dashboard
   - Monitor the deployment logs
   - Wait for all services to become healthy

5. **Post-Deployment Setup**
   ```bash
   # Once deployed, you may need to run database migrations
   # Use FlightControl's console or SSH access
   cd /app/backend
   alembic upgrade head
   ```

### Monitoring & Logs

- **Dashboard**: Monitor service health in FlightControl's dashboard
- **Logs**: View real-time logs for each service
- **Health Check**: `https://[your-backend-url]/health`
- **Metrics**: CPU, memory, and request metrics in FlightControl

### Database Connection

The `DATABASE_URL` is automatically injected from the PostgreSQL service. The format will be:
```
postgresql://username:password@host:5432/database_name
```

### CORS Configuration

The backend automatically configures CORS to accept requests from the frontend URL, which is dynamically injected during deployment.

### Cost Estimation

Approximate monthly costs (AWS pricing):
- **PostgreSQL RDS**: ~$15/month (db.t4g.micro)
- **Backend Fargate**: ~$20-40/month (depending on usage)
- **Frontend Fargate**: ~$20-40/month (depending on usage)
- **Total**: ~$55-95/month

### Troubleshooting

#### Backend fails to start
- Check all environment variables are set in Parameter Store
- Verify Python dependencies are in `pyproject.toml`
- Check deployment logs for import errors
- Ensure nixpacks.toml is properly configured
- Check that Procfile exists with correct start command

#### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is being injected correctly
- Check backend health endpoint is responding
- Ensure CORS is configured properly

#### Database connection issues
- Check security groups allow connection from backend
- Verify DATABASE_URL format is correct
- Ensure database and backend are in same VPC

### Scaling Considerations

As your application grows, consider:

1. **Database**: Upgrade to `db.t4g.small` or larger
2. **Services**: Increase min/max instances in `flightcontrol.json`
3. **Redis**: Add ElastiCache for session storage and caching
4. **CDN**: Add CloudFront for static asset delivery
5. **Storage**: Add S3 for recording storage

### Security Best Practices

1. **Secrets Management**
   - Use strong, unique values for SECRET_KEY
   - Rotate API keys regularly
   - Never commit secrets to git

2. **Network Security**
   - Database is private (not internet-accessible)
   - Use HTTPS for all communications
   - Implement rate limiting on API

3. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Regular security audits

### Backup & Recovery

1. **Database Backups**
   - Enable automated RDS backups (7-day retention)
   - Take manual snapshots before major updates
   - Document restore procedures

2. **Code Backups**
   - Use git tags for release versions
   - Maintain changelog of deployments

### Local Development vs Production

Key differences:
- **Database**: Local uses Docker, production uses RDS
- **LiveKit**: Local uses self-hosted, production uses LiveKit Cloud
- **Environment**: Local uses `.env` file, production uses Parameter Store
- **Workers**: Local runs 1 worker, production runs multiple

### Support & Monitoring

- FlightControl support: support@flightcontrol.dev
- AWS CloudWatch for detailed metrics
- Consider adding Sentry for error tracking
- Set up alerts for service health