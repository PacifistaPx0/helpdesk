FROM golang:1.25-alpine

WORKDIR /app

# Install required tools
RUN apk add --no-cache git curl build-base

# Install Air globally
RUN go install github.com/air-verse/air@latest

# Copy go.mod first for dependency caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire project (though volume will override in dev)
COPY . .

# Expose backend port
EXPOSE 8080

# Run Air with config
CMD ["air", "-c", ".air.toml"]
