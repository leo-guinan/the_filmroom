#!/bin/bash
set -e

echo "Starting backend application..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "WARNING: DATABASE_URL is not set, using default"
else
    echo "DATABASE_URL is configured"
fi

# Change to backend directory
cd /app/backend

# Run database migrations
echo "Running database migrations..."
/opt/venv/bin/alembic upgrade head || echo "Migration failed, continuing anyway"

# Start the application
echo "Starting Uvicorn server..."
PYTHONPATH=/app/backend/src /opt/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000