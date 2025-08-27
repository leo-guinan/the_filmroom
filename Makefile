.PHONY: help dev stop clean test backend frontend db-up db-down db-reset lint format

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev        - Start all services for development"
	@echo "  make stop       - Stop all services"
	@echo "  make clean      - Stop services and clean volumes"
	@echo "  make backend    - Start only backend API"
	@echo "  make frontend   - Start only frontend app"
	@echo "  make db-up      - Start database services"
	@echo "  make db-down    - Stop database services"
	@echo "  make db-reset   - Reset database (WARNING: deletes all data)"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Run linters"
	@echo "  make format     - Format code"

# Development commands
dev: db-up
	@echo "Starting development environment..."
	@echo "Starting backend..."
	@cd backend && uv run python src/main.py &
	@echo "Backend started on http://localhost:8000"
	@echo "Starting frontend..."
	@cd frontend && pnpm dev &
	@echo "Frontend will start on http://localhost:3000"
	@echo "All services started!"

stop:
	@echo "Stopping all services..."
	@pkill -f "python src/main.py" || true
	@pkill -f "pnpm dev" || true
	@docker-compose stop

clean: stop
	@echo "Cleaning up..."
	@docker-compose down -v

# Backend commands
backend:
	@echo "Starting backend API..."
	@cd backend && uv run python src/main.py

backend-test:
	@echo "Running backend tests..."
	@cd backend && uv run pytest

backend-lint:
	@echo "Linting backend..."
	@cd backend && uv run ruff check src tests

backend-format:
	@echo "Formatting backend..."
	@cd backend && uv run ruff format src tests

# Frontend commands
frontend:
	@echo "Starting frontend..."
	@cd frontend && pnpm dev

frontend-build:
	@echo "Building frontend..."
	@cd frontend && pnpm build

frontend-test:
	@echo "Running frontend tests..."
	@cd frontend && pnpm test

frontend-lint:
	@echo "Linting frontend..."
	@cd frontend && pnpm lint

# Database commands
db-up:
	@echo "Starting database services..."
	@docker-compose up -d postgres redis livekit
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "Database services started!"

db-down:
	@echo "Stopping database services..."
	@docker-compose stop postgres redis livekit

db-reset: db-down
	@echo "WARNING: This will delete all data in the database!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v postgres redis
	@echo "Database reset complete"

db-migrate:
	@echo "Running database migrations..."
	@cd backend && uv run alembic upgrade head

db-create-migration:
	@echo "Creating new migration..."
	@read -p "Enter migration message: " msg; \
	cd backend && uv run alembic revision --autogenerate -m "$$msg"

# Testing commands
test: backend-test frontend-test
	@echo "All tests complete!"

# Linting and formatting
lint: backend-lint frontend-lint
	@echo "Linting complete!"

format: backend-format
	@echo "Formatting complete!"

# Docker commands
docker-logs:
	@docker-compose logs -f

docker-ps:
	@docker-compose ps

# LiveKit specific
livekit-logs:
	@docker-compose logs -f livekit

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	@cd backend && uv venv && uv pip install -e .
	@echo "Installing frontend dependencies..."
	@cd frontend && pnpm install
	@echo "All dependencies installed!"

# FlightControl deployment
deploy-staging:
	@echo "Deploying to staging..."
	@git push origin main:staging

deploy-production:
	@echo "Deploying to production..."
	@git push origin main:production