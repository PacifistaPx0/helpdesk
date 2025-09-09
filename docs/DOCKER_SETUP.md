# Docker Setup for Help Desk System

## Overview

This repository uses Docker Compose for development and production workflows. The current development Dockerfile is a single-stage image that installs Air for hot reload; volume mounts are used for fast local feedback during development.

## Project layout (relevant files)

```
helpdesk/
├── docker-compose.yml           # Development and production configuration (single file)
├── docker/
│   └── init/postgres/01_init.sql # Database initialization scripts
├── backend/
│   ├── Dockerfile               # Single-stage development image (Air hot reload)
│   └── .air.toml                # Air configuration for hot reload
├── scripts/
│   ├── dev-setup.sh            # Linux/Mac/WSL setup script
│   └── dev-setup.bat           # Windows setup script
└── .env                         # Environment variables used by docker-compose
```

## 🚀 Quick Start

### Development Environment

#### Option 1: Using Scripts (Recommended)
```bash
# Linux/Mac
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# Windows
scripts\dev-setup.bat
```

#### Option 2: Manual Setup
```bash
# Start all development services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or start specific services
docker-compose up postgres redis mailhog -d

# View logs
docker-compose logs -f
```

### Database Only (if you want to run Go server locally)
```bash
# Start just PostgreSQL and Redis
docker-compose up postgres redis -d

# Check if running
docker-compose ps
```

## 🛠️ Services

### PostgreSQL Database
- **Port**: 5432
- **Database**: helpdesk
- **User**: helpdesk_user
- **Password**: helpdesk_password
- **Connection**: `postgres://helpdesk_user:helpdesk_password@localhost:5432/helpdesk?sslmode=disable`

### Redis Cache
- **Port**: 6380
- **Connection**: `redis://localhost:6379`

### Mailhog (Development Email Testing)
- **SMTP Port**: 1025
- **Web UI**: http://localhost:8025
- **Purpose**: Catch all outgoing emails for testing

### pgAdmin (Development Database Management)
- **URL**: http://localhost:5050
- **Email**: admin@helpdesk.local
- **Password**: admin123

### Backend API (when running in Docker)
- **Port**: 8080
- **Health Check**: http://localhost:8080/health
- **Hot Reload**: Enabled in development mode

## 🔧 Development Workflow

### 1. Start Development Environment
```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or use the setup script
./scripts/dev-setup.sh
```

### 2. View Service Status
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs -f  # Follow all logs
```

### 3. Connect to Database
```bash
# Using Docker exec
docker-compose exec postgres psql -U helpdesk_user -d helpdesk

# Using pgAdmin web interface
# Go to http://localhost:5050
```

### 4. Backend Development
```bash
# Option 1: Run backend in Docker with hot reload
docker-compose up backend

# Option 2: Run backend locally (recommended for development)
docker-compose up postgres redis mailhog -d
cd backend
go run cmd/server/main.go
```

### 5. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

## 🏗️ Build Process

### Multi-Stage Dockerfile

The backend Dockerfile has three stages:

1. **Builder Stage**: Compiles Go application
2. **Development Stage**: Includes Air for hot reload
3. **Production Stage**: Minimal Alpine image with just the binary

### Building Images
```bash
# Build development image
docker-compose build backend

# Build production image
docker build --target production -t helpdesk-backend:prod ./backend

# Build with no cache
docker-compose build --no-cache backend
```

## 🚢 Production Deployment

### Using Production Configuration
```bash
# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Production Features
- ✅ **Minimal Images**: Alpine-based for small size
- ✅ **Non-root User**: Security best practices
- ✅ **Health Checks**: Automatic service monitoring
- ✅ **Restart Policies**: Automatic recovery
- ✅ **No Hot Reload**: Optimized for performance
- ✅ **Nginx Proxy**: Load balancing and SSL termination

## 📊 Monitoring and Debugging

### View Container Stats
```bash
# Resource usage
docker stats

# Container details
docker-compose exec backend ps aux
docker-compose exec postgres ps aux
```

### Database Operations
```bash
# Create database backup
docker-compose exec postgres pg_dump -U helpdesk_user helpdesk > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U helpdesk_user -d helpdesk

# Check database size
docker-compose exec postgres psql -U helpdesk_user -d helpdesk -c "SELECT pg_size_pretty(pg_database_size('helpdesk'));"
```

### Log Management
```bash
# View recent logs
docker-compose logs --tail=50 backend

# Follow logs for specific service
docker-compose logs -f postgres

# Save logs to file
docker-compose logs backend > backend.log
```

## 🔒 Security Considerations

### Development
- Default passwords (change in production)
- All services exposed locally
- Debug mode enabled

### Production
- Strong passwords required
- Limited port exposure
- Non-root containers
- SSL/TLS termination
- Security scanning recommended

## 🧪 Testing

### Test Database Connection
```bash
# Quick connection test
docker-compose exec postgres pg_isready -U helpdesk_user -d helpdesk

# Run SQL command
docker-compose exec postgres psql -U helpdesk_user -d helpdesk -c "SELECT version();"
```

### Test Backend API
```bash
# Health check
curl http://localhost:8080/health

# API status
curl http://localhost:8080/api/v1/status

# Pretty print JSON
curl -s http://localhost:8080/health | jq
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :5432
lsof -i :5432

# Solution: Change port in docker-compose.yml or stop conflicting service
```

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Hot Reload Not Working
```bash
# Check if Air is installed in container
docker-compose exec backend which air

# Rebuild backend image
docker-compose build --no-cache backend
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Cleanup unused resources
docker system prune -f
docker volume prune -f
```

## 📈 Performance Optimization

### Development
- Use volume mounts for hot reload
- Exclude unnecessary directories from volumes
- Use local DNS for faster container communication

### Production
- Multi-stage builds for smaller images
- Health checks for reliability
- Connection pooling
- Resource limits

## 🎯 Next Steps

1. **Set up CI/CD Pipeline**
   - Automated testing in containers
   - Image scanning for security
   - Automated deployment

2. **Monitoring Stack**
   - Prometheus for metrics
   - Grafana for dashboards
   - Log aggregation

3. **Backup Strategy**
   - Automated database backups
   - Volume backup procedures
   - Disaster recovery plan

This Docker setup provides a robust, scalable foundation for both development and production environments while maintaining the lightweight principles outlined in the project guidelines.

## Quick start (development)

### Option 1: Using setup scripts (recommended)

```bash
# Linux/Mac/WSL
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# Windows
scripts\dev-setup.bat
```

The scripts will:
- Check Docker is running
- Copy `.env.example` to `.env` if needed
- Build backend image with no cache
- Start all services
- Show service status and useful commands

### Option 2: Manual setup

1. Copy the example env and update values if needed:

```bash
cp .env.example .env
# edit .env to set POSTGRES_PASSWORD, PGADMIN credentials, etc.
```

2. Build the backend image (no cache recommended during active development):

```bash
docker compose build --no-cache backend
```

3. Start the services (detached):

```bash
docker compose up -d
```

4. Follow backend logs:

```bash
docker compose logs -f backend
```

If you prefer to run the Go server locally and only need the DB/Redis, start only those services:

```bash
docker compose up -d postgres redis
```

## Services summary

- PostgreSQL
   - Port: mapped from `${POSTGRES_PORT}` in `.env` (default 5432)
   - DB: `helpdesk`
   - User: `${POSTGRES_USER}` (default `helpdesk_user`)
   - Note: changing `POSTGRES_PASSWORD` in `.env` does not update an existing volume — use `ALTER USER` inside the running container to change passwords in-place.

- Redis
   - Port: mapped from `${REDIS_PORT}` (default 6380)

- Backend API
   - Port: mapped from `${BACKEND_PORT}` (default 8080)
   - Health: `GET /health`
   - Development hot reload: Air (configured in `backend/.air.toml`), the Dockerfile installs Air and the container runs `air -c .air.toml` by default.

- pgAdmin
   - URL: http://localhost:${PGADMIN_PORT} (default 5050)

## Development workflow notes

- Rebuild without cache when Dockerfile or dependencies change:

```bash
docker compose build --no-cache backend
docker compose up -d --force-recreate backend
```

- Quick restart (no rebuild) when editing application code (Air should pick up changes):

```bash
docker compose restart backend
```

- To run Air locally (outside Docker):

```bash
# Ensure $GOBIN or $(go env GOPATH)/bin is on PATH
go install github.com/air-verse/air@latest
cd backend
air -c .air.toml
```

## Recommended commands summary

```bash
# Build backend without cache and start
docker compose build --no-cache backend
docker compose up -d

# Rebuild and force recreate backend container
docker compose up -d --build --force-recreate backend

# Restart backend only
docker compose restart backend

# Run Air locally
cd backend && air -c .air.toml
```

---

This file now reflects the current development Dockerfile (single-stage with Air) and the active docker-compose setup. Adjust `.env` values before running in your environment.
