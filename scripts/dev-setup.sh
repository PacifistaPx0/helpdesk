#!/bin/bash
# Development setup script

echo "🐳 Help Desk Development Environment Setup"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "✅ Docker is running"

# Start development environment
echo "🚀 Starting development environment..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📍 Available services:"
echo "   • Backend API: http://localhost:8080"
echo "   • Health check: http://localhost:8080/health" 
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • Mailhog Web UI: http://localhost:8025"
echo "   • pgAdmin: http://localhost:5050 (admin@helpdesk.local / admin123)"
echo ""
echo "🛠️  Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart backend: docker-compose restart backend"
echo ""
