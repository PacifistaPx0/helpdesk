@echo off
REM Development setup script for Windows

echo Help Desk Development Environment Setup
echo =======================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    exit /b 1
)

echo SUCCESS: Docker is running

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found. Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo Please edit .env file with your configuration before continuing.
        echo Press Enter to continue or Ctrl+C to exit...
        pause >nul
    ) else (
        echo ERROR: Neither .env nor .env.example found.
        exit /b 1
    )
)

REM Build backend with no cache (recommended for development)
echo Building backend image (no cache)...
docker compose build --no-cache backend

REM Start development environment
echo Starting development environment...
docker compose up -d

REM Wait for services to be healthy
echo Waiting for services to be ready...
ping -n 16 127.0.0.1 >nul

REM Check service status
echo Service Status:
docker compose ps

echo.
echo SUCCESS: Development environment is ready!
echo.
echo Available services:
echo   - Backend API: http://localhost:8080 (with Air hot reload)
echo   - Health check: http://localhost:8080/health
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6380
echo   - pgAdmin: http://localhost:5050
echo.
echo Useful commands:
echo   - View logs: docker compose logs -f backend
echo   - Stop services: docker compose down
echo   - Restart backend: docker compose restart backend
echo   - Rebuild backend: docker compose build --no-cache backend
echo   - Run Air locally: cd backend ^&^& air -c .air.toml
echo.
pause
