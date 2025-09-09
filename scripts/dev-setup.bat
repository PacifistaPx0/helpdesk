@echo off
REM Development setup script for Windows

echo 🐳 Help Desk Development Environment Setup
echo ==========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop.
    exit /b 1
)

echo ✅ Docker is running

REM Stop any existing containers to avoid conflicts
echo 🔄 Stopping any existing containers...
docker-compose down >nul 2>&1

REM Start development environment
echo 🚀 Starting development environment...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

REM Wait for services to be healthy (Windows timeout syntax)
echo ⏳ Waiting for services to be ready...
ping -n 11 127.0.0.1 >nul

REM Check service status
echo 📊 Service Status:
docker-compose ps

echo.
echo 🎉 Development environment is ready!
echo.
echo 📍 Available services:
echo    • Backend API: http://localhost:8080 (start manually: go run cmd/server/main.go)
echo    • Health check: http://localhost:8080/health
echo    • PostgreSQL: localhost:5432
echo    • Redis (Docker): localhost:6380 (Your existing Redis: localhost:6379)
echo    • Mailhog Web UI: http://localhost:8025
echo    • pgAdmin: http://localhost:5050 (admin@helpdesk.local / admin123)
echo.
echo 🛠️  Useful commands:
echo    • View logs: docker-compose logs -f
echo    • Stop services: docker-compose down
echo    • Start backend: cd backend ^&^& go run cmd/server/main.go
echo.
echo 💡 Note: Redis port changed to 6380 to avoid conflict with your existing Redis
echo    Update your .env file: REDIS_URL=redis://localhost:6380
echo.
pause
