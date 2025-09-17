package api

import (
	"helpdesk-backend/internal/auth"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, userService *service.UserService, ticketService *service.TicketService, commentService *service.CommentService, jwtService *auth.JWTService) {
	api := router.Group("/api/v1")

	// Health check
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Initialize auth handlers
	authHandlers := NewAuthHandlers(userService, jwtService)

	// Public auth routes (no authentication required)
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", authHandlers.Register)
		authGroup.POST("/login", authHandlers.Login)
		authGroup.POST("/refresh", authHandlers.RefreshToken)
		authGroup.POST("/logout", authHandlers.Logout)
	}

	// Protected routes (require authentication)
	protected := api.Group("")
	protected.Use(auth.AuthMiddleware(jwtService))
	{
		// Profile route
		protected.GET("/profile", authHandlers.Profile)

		// User routes (admin/agent only for most operations)
		users := protected.Group("/users")
		{
			users.GET("", auth.RequireAdminOrAgent(), listUsersHandler(userService))
			users.GET("/:id", getUserHandler(userService))                            // Users can see their own profile
			users.PUT("/:id", updateUserHandler(userService))                         // Users can update their own profile
			users.DELETE("/:id", auth.RequireAdmin(), deleteUserHandler(userService)) // Only admin can delete
		}

		// Ticket routes
		tickets := protected.Group("/tickets")
		{
			tickets.POST("", createTicketHandler(ticketService))
			tickets.GET("", listTicketsHandler(ticketService))
			tickets.GET("/recent", getRecentTicketsHandler(ticketService))
			tickets.GET("/:id", getTicketHandler(ticketService))
			tickets.PUT("/:id", updateTicketHandler(ticketService))
			tickets.DELETE("/:id", auth.RequireAdminOrAgent(), deleteTicketHandler(ticketService))
			tickets.POST("/:id/assign", auth.RequireAdminOrAgent(), assignTicketHandler(ticketService))
		}

		// Dashboard routes
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/stats", getDashboardStatsHandler(ticketService))
		}

		// Comment routes
		comments := protected.Group("/comments")
		{
			comments.POST("", createCommentHandler(commentService))
			comments.GET("/ticket/:ticketId", listCommentsHandler(commentService))
			comments.PUT("/:id", updateCommentHandler(commentService))
			comments.DELETE("/:id", deleteCommentHandler(commentService))
		}
	}
}
