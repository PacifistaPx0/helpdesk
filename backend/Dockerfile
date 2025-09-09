# Multi-stage Docker build for Go backend
# Following lightweight principles from copilot instructions

# Stage 1: Build stage
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files first (for better layer caching)
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
# Using CGO_ENABLED=0 for static binary (lightweight deployment)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# Stage 2: Development stage (for docker-compose development)
FROM golang:1.25-alpine AS development

# Install air for hot reload in development
RUN go install github.com/air-verse/air@latest

WORKDIR /app

# Copy go mod files and air config
COPY go.mod go.sum ./
RUN go mod download

# This stage mounts source code as volume for hot reload
EXPOSE 8080

CMD ["air", "-c", ".air.toml"]

# Stage 3: Production stage (minimal image)
FROM alpine:latest AS production

# Install ca-certificates for HTTPS calls
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Change ownership to non-root user
RUN chown appuser:appgroup main

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]
