# Help Desk Backend

Go backend API for the Help Desk Ticketing System.

## Architecture

This backend follows clean architecture principles with the following structure:

- **cmd/server**: Application entry point
- **internal/api**: HTTP handlers and routes
- **internal/auth**: Authentication middleware
- **internal/config**: Configuration management
- **internal/domain**: Business entities and interfaces
- **internal/repository**: Data access layer
- **internal/service**: Business logic layer
- **internal/util**: Utility functions
- **pkg**: Public packages
- **migrations**: Database migrations
- **tests**: Integration tests

## Features

- JWT-based authentication
- Role-based access control (Admin, Agent, End-User)
- RESTful API for tickets, users, and comments
- SLA management with automatic breach calculation
- PostgreSQL database with GORM
- Redis for caching (future implementation)
- Email notifications via SMTP (Mailhog for development)

## Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. Clone the repository
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Update database connection in `.env` file
4. Install dependencies:
   ```bash
   go mod download
   ```
5. Run the application:
   ```bash
   go run cmd/server/main.go
   ```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login

#### Users
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

#### Tickets
- `POST /api/v1/tickets` - Create new ticket
- `GET /api/v1/tickets` - List tickets
- `GET /api/v1/tickets/:id` - Get ticket by ID
- `PUT /api/v1/tickets/:id` - Update ticket
- `DELETE /api/v1/tickets/:id` - Delete ticket
- `POST /api/v1/tickets/:id/assign` - Assign ticket to agent

#### Comments
- `POST /api/v1/comments` - Create comment
- `GET /api/v1/comments/ticket/:ticketId` - List comments for ticket
- `PUT /api/v1/comments/:id` - Update comment
- `DELETE /api/v1/comments/:id` - Delete comment

### Testing

```bash
go test ./...
```

### Building

```bash
go build -o bin/server cmd/server/main.go
```

## Environment Variables

See `.env.example` for all available configuration options.

## Contributing

1. Follow Go conventions and best practices
2. Write tests for new features
3. Update documentation as needed
4. Use meaningful commit messages
