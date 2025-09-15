package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server Configuration
	Port        string
	Environment string

	// Database Configuration
	DatabaseURL string
	RedisURL    string

	// JWT Configuration
	JWTSecret             string
	JWTAccessTokenExpiry  time.Duration
	JWTRefreshTokenExpiry time.Duration

	// SMTP Configuration
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPass      string
	SMTPFromEmail string
	SMTPFromName  string

	// Application Configuration
	AppName     string
	AppURL      string
	FrontendURL string

	// File Upload Configuration
	MaxFileSize      string
	AllowedFileTypes string
	UploadPath       string

	// Security Configuration
	BcryptCost        int
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// SLA Configuration
	DefaultSLAResponseHours   int
	DefaultSLAResolutionHours int

	// Template Configuration
	EmailTemplatePath string

	// Logging Configuration
	LogLevel  string
	LogFormat string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	// Parse JWT token expiry
	accessTokenExpiry, _ := time.ParseDuration(getEnv("JWT_ACCESS_TOKEN_EXPIRY", "15m"))
	refreshTokenExpiry, _ := time.ParseDuration(getEnv("JWT_REFRESH_TOKEN_EXPIRY", "168h"))

	// Parse rate limiting
	rateLimitWindow, _ := time.ParseDuration(getEnv("RATE_LIMIT_WINDOW", "1h"))

	config := &Config{
		// Server Configuration
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),

		// Database Configuration
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6380"),

		// JWT Configuration
		JWTSecret:             getEnv("JWT_SECRET", "your-secret-key"),
		JWTAccessTokenExpiry:  accessTokenExpiry,
		JWTRefreshTokenExpiry: refreshTokenExpiry,

		// SMTP Configuration
		SMTPHost:      getEnv("SMTP_HOST", "localhost"),
		SMTPPort:      getEnv("SMTP_PORT", "1025"),
		SMTPUser:      getEnv("SMTP_USER", ""),
		SMTPPass:      getEnv("SMTP_PASS", ""),
		SMTPFromEmail: getEnv("SMTP_FROM_EMAIL", "noreply@helpdesk.local"),
		SMTPFromName:  getEnv("SMTP_FROM_NAME", "Help Desk System"),

		// Application Configuration
		AppName:     getEnv("APP_NAME", "Help Desk System"),
		AppURL:      getEnv("APP_URL", "http://localhost:8080"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		// File Upload Configuration
		MaxFileSize:      getEnv("MAX_FILE_SIZE", "10MB"),
		AllowedFileTypes: getEnv("ALLOWED_FILE_TYPES", "jpg,jpeg,png,gif,pdf,doc,docx,txt"),
		UploadPath:       getEnv("UPLOAD_PATH", "./uploads"),

		// Security Configuration
		BcryptCost:        getEnvAsInt("BCRYPT_COST", 12),
		RateLimitRequests: getEnvAsInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   rateLimitWindow,

		// SLA Configuration
		DefaultSLAResponseHours:   getEnvAsInt("DEFAULT_SLA_RESPONSE_HOURS", 4),
		DefaultSLAResolutionHours: getEnvAsInt("DEFAULT_SLA_RESOLUTION_HOURS", 24),

		// Template Configuration
		EmailTemplatePath: getEnv("EMAIL_TEMPLATE_PATH", "./templates/emails"),

		// Logging Configuration
		LogLevel:  getEnv("LOG_LEVEL", "debug"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
