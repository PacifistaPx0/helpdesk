package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"helpdesk-backend/internal/api"
	"helpdesk-backend/internal/config"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/repository"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize router with basic health check routes
	router := setupBasicRouter(cfg)

	// Try to initialize database (optional for development)
	db, err := initDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Printf("WARNING: Database connection failed: %v", err)
	} else {
		// Initialize full API when database is available
		setupFullAPI(router, db, cfg)

		// Run seeder after database setup
		seeder := repository.NewSeeder(db)
		if err := seeder.SeedInitialData(); err != nil {
			log.Printf("WARNING: Failed to seed initial data: %v", err)
		}
	}

	// Start server in a goroutine
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		log.Printf("Environment: %s", cfg.Environment)
		log.Printf("Health check: http://localhost:%s/health", cfg.Port)
		log.Printf("API users: http://localhost:%s/api/v1/users", cfg.Port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	// Close database connection if it exists
	if db != nil {
		sqlDB, err := db.DB()
		if err == nil {
			sqlDB.Close()
		}
	}

	log.Println("Server exited gracefully")
}

func initDatabase(databaseURL string) (*gorm.DB, error) {
	// Return early if no database URL is provided
	if databaseURL == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("SUCCESS: Database connected successfully")

	// Auto-migrate the schema
	err = db.AutoMigrate(&domain.User{}, &domain.Ticket{}, &domain.Comment{}, &domain.SLA{})
	if err != nil {
		return nil, fmt.Errorf("failed to auto-migrate database: %w", err)
	}

	log.Println("SUCCESS: Database schema migrated successfully")

	return db, nil
}

func setupBasicRouter(cfg *config.Config) *gin.Engine {
	router := gin.Default()

	// Basic health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "🚀 Hot reload is working this time i tell you!",
			"timestamp":   time.Now().UTC(),
			"environment": cfg.Environment,
			"message":     "Health check updated via hot reload",
		})
	})

	// API group with basic routes
	api := router.Group("/api/v1")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		api.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"service": "helpdesk-backend",
				"version": "1.0.0",
				"status":  "running",
			})
		})
	}

	return router
}

// This function will be used when database is available
func setupFullAPI(router *gin.Engine, db *gorm.DB, cfg *config.Config) {
	log.Println("🔧 Setting up API with database...")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	ticketRepo := repository.NewTicketRepository(db)
	commentRepo := repository.NewCommentRepository(db)

	// Initialize services
	userService := service.NewUserService(userRepo)
	ticketService := service.NewTicketService(ticketRepo)
	commentService := service.NewCommentService(commentRepo)

	// Setup API routes
	api.SetupRoutes(router, userService, ticketService, commentService)

	log.Println("✅ Full API setup complete!")
}
