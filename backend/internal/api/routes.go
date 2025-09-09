package api

import (
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, userService *service.UserService, ticketService *service.TicketService, commentService *service.CommentService) {
	api := router.Group("/api/v1")

	// Health check
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", registerHandler(userService))
		auth.POST("/login", loginHandler(userService))
	}

	// Protected routes
	// TODO: Add JWT middleware here
	// protected.Use(middleware.JWTAuth())
	{
		// User routes
		users := api.Group("/users")
		{
			users.GET("", listUsersHandler(userService))
			users.GET("/:id", getUserHandler(userService))
			users.PUT("/:id", updateUserHandler(userService))
			users.DELETE("/:id", deleteUserHandler(userService))
		}

		// Ticket routes
		tickets := api.Group("/tickets")
		{
			tickets.POST("", createTicketHandler(ticketService))
			tickets.GET("", listTicketsHandler(ticketService))
			tickets.GET("/:id", getTicketHandler(ticketService))
			tickets.PUT("/:id", updateTicketHandler(ticketService))
			tickets.DELETE("/:id", deleteTicketHandler(ticketService))
			tickets.POST("/:id/assign", assignTicketHandler(ticketService))
		}

		// Comment routes
		comments := api.Group("/comments")
		{
			comments.POST("", createCommentHandler(commentService))
			comments.GET("/ticket/:ticketId", listCommentsHandler(commentService))
			comments.PUT("/:id", updateCommentHandler(commentService))
			comments.DELETE("/:id", deleteCommentHandler(commentService))
		}
	}
}
