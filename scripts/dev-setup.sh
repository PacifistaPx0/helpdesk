#!/bin/bash
# Development setup script

echo "Help Desk Development Environment Setup"
echo "======================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    exit 1
fi

echo "SUCCESS: Docker is running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found. Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Please edit .env file with your configuration before continuing."
        echo "Press Enter to continue or Ctrl+C to exit..."
        read
    else
        echo "ERROR: Neither .env nor .env.example found."
        exit 1
    fi
fi

# Build backend with no cache (recommended for development)
echo "Building backend image (no cache)..."
docker compose build --no-cache backend

# Start development environment
echo "Starting development environment..."
docker compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 15

# Check service status
echo "Service Status:"
docker compose ps

echo ""
echo "SUCCESS: Development environment is ready!"
echo ""
echo "Available services:"
echo "  - Backend API: http://localhost:8080 (with Air hot reload)"
echo "  - Health check: http://localhost:8080/health" 
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6380"
echo "  - pgAdmin: http://localhost:5050"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f backend"
echo "  - Stop services: docker compose down"
echo "  - Restart backend: docker compose restart backend"
echo "  - Rebuild backend: docker compose build --no-cache backend"
echo "  - Run Air locally: cd backend && air -c .air.toml"
echo ""
