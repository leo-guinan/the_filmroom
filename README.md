# The Film Room

A secure coaching platform with AI-powered insights. Connect with clients through encrypted video sessions, get automatic transcriptions, and track progress—all in one platform.

## 🚀 Production URLs

- **Frontend**: https://filmroom.leoasaservice.com
- **Backend API**: https://coachapi.leoasaservice.com
- **Status**: MVP in active development

## 📋 Current Project Status

### ✅ Completed Features

#### Authentication System
- ✅ User registration with email/password
- ✅ Login with JWT tokens  
- ✅ Role-based access (Coach/Client)
- ✅ Protected dashboard routes
- ✅ Logout functionality
- ✅ Password hashing with bcrypt

#### Frontend Application
- ✅ Modern landing page with product overview
- ✅ User registration page with form validation
- ✅ Login page with error handling
- ✅ Protected dashboard with role-based UI
- ✅ Responsive design with Tailwind CSS
- ✅ Dark mode support
- ✅ Custom domain setup (filmroom.leoasaservice.com)

#### Backend API
- ✅ RESTful API with FastAPI
- ✅ PostgreSQL database with SQLAlchemy ORM
- ✅ Database migrations with Alembic
- ✅ JWT-based authentication
- ✅ CORS configuration for production domains
- ✅ Structured logging with structlog
- ✅ Health check endpoints
- ✅ Custom domain setup (coachapi.leoasaservice.com)

#### Infrastructure & Deployment
- ✅ Deployed on AWS via FlightControl
- ✅ PostgreSQL RDS database configured
- ✅ CloudFront CDN distribution
- ✅ Custom domain configuration with SSL
- ✅ Automated deployments from GitHub main branch
- ✅ Environment-based configuration

### 🚧 Currently Working On

- 🔄 Finalizing RDS database connectivity
- 🔄 Running initial database migrations
- 🔄 Testing user registration flow end-to-end

### 📝 Upcoming Features (Prioritized)

1. **Core User Features**
   - User profile management
   - Password reset functionality
   - Email verification

2. **Video Sessions** (LiveKit Integration)
   - Encrypted video conferencing
   - Session recording capabilities
   - Real-time collaboration features

3. **AI-Powered Features**
   - Automatic session transcription
   - AI-generated session summaries
   - Action item extraction
   - Progress tracking analytics

4. **Scheduling Integration**
   - Cal.com integration for appointment booking
   - Calendar synchronization
   - Automated reminders

5. **Advanced Features**
   - Payment processing (Stripe)
   - File sharing and document management
   - Client progress dashboards
   - Coach analytics and reporting

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks
- **API Client**: Native Fetch API

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with python-jose
- **Password Hashing**: Passlib with bcrypt
- **Migrations**: Alembic
- **Logging**: Structlog
- **API Documentation**: OpenAPI/Swagger

### Infrastructure
- **Hosting**: AWS (managed by FlightControl)
- **Database**: RDS PostgreSQL 16
- **CDN**: CloudFront
- **Container**: Docker with Nixpacks
- **CI/CD**: GitHub → FlightControl automatic deployments

## 🏃‍♂️ Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 14+
- pnpm (for frontend)
- pip/venv (for backend)

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://filmroom:filmroom@localhost:5432/filmroom_db
APP_ENV=development
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
EOF

# Run database migrations
alembic upgrade head

# Start development server
uvicorn src.main:app --reload --port 8000
```

API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Start development server
pnpm dev
```

Frontend available at: http://localhost:3000

## 📁 Project Structure

```
the_filmroom/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── page.tsx     # Landing page
│   │   │   ├── login/       # Login page
│   │   │   ├── signup/      # Registration page
│   │   │   └── dashboard/   # Protected dashboard
│   │   └── lib/             # Utilities and helpers
│   ├── public/              # Static assets
│   ├── package.json
│   └── .env.production      # Production environment
│
├── backend/                 # FastAPI backend application
│   ├── src/
│   │   ├── api/            # API route handlers
│   │   │   ├── auth.py     # Authentication endpoints
│   │   │   ├── users.py    # User management
│   │   │   └── health.py   # Health checks
│   │   ├── core/           # Core configuration
│   │   │   ├── config.py   # Settings management
│   │   │   └── logging.py  # Logging setup
│   │   ├── models/         # Database models
│   │   │   ├── user.py     # User model
│   │   │   └── session.py  # Session model
│   │   ├── services/       # Business logic
│   │   │   └── auth.py     # Authentication service
│   │   └── main.py         # Application entry point
│   ├── alembic/            # Database migrations
│   ├── tests/              # Test suite
│   ├── pyproject.toml      # Python dependencies
│   └── startup.sh          # Production startup script
│
├── flightcontrol.json      # Deployment configuration
├── nixpacks.toml           # Build configuration
└── README.md               # This file
```

## 🚀 Deployment

### FlightControl Configuration

The application deploys automatically when pushing to the `main` branch:

1. **PostgreSQL Database** (RDS)
   - PostgreSQL 16
   - db.t4g.micro instance
   - 20GB storage
   - Database name: `filmroom_db`

2. **Backend API Service** (Fargate)
   - 0.5 vCPU, 2GB RAM
   - Auto-scaling: 1-3 instances
   - Health check: `/health`
   - Custom domain: coachapi.leoasaservice.com

3. **Frontend Web Service** (Fargate)
   - 0.5 vCPU, 2GB RAM
   - Auto-scaling: 1-3 instances
   - Custom domain: filmroom.leoasaservice.com

### Environment Variables

#### Backend (Production)
- `DATABASE_URL` - Automatically set by FlightControl from RDS
- `APP_ENV` - Set to "production"
- `SECRET_KEY` - Generate secure random string
- `CORS_ORIGINS` - Set to frontend domain

#### Frontend (Production)
- `NEXT_PUBLIC_API_URL` - Set to https://coachapi.leoasaservice.com

## 🔒 Security Features

- **Authentication**: JWT tokens with secure httpOnly cookies (planned)
- **Password Security**: Bcrypt hashing with salt
- **CORS Protection**: Strict origin validation
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **Environment Variables**: Sensitive data stored in environment
- **HTTPS Only**: All production traffic over SSL
- **Rate Limiting**: Coming soon

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (coming soon)
cd frontend
pnpm test
```

## 📊 Monitoring & Logs

- Application logs available in FlightControl dashboard
- Structured JSON logging for easy parsing
- Request IDs for tracing
- Performance metrics in CloudWatch

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

## 📄 License

Proprietary - All Rights Reserved

---

**Last Updated**: August 29, 2024
**Current Focus**: Establishing RDS database connectivity and completing user registration flow