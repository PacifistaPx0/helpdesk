package api

import (
	"net/http"
	"strconv"

	"helpdesk-backend/internal/auth"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func getDashboardStatsHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID and role from JWT context (same pattern as Profile handler)
		userID, exists := auth.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		userRole, exists := auth.GetCurrentUserRole(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			return
		}

		stats, err := ticketService.GetDashboardStats(c.Request.Context(), userID, userRole)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard stats"})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}

func getRecentTicketsHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))

		// Ensure limit is reasonable
		if limit > 50 {
			limit = 50
		}
		if limit < 1 {
			limit = 5
		}

		tickets, err := ticketService.GetRecentTickets(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent tickets"})
			return
		}

		c.JSON(http.StatusOK, tickets)
	}
}
