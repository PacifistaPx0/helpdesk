package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"helpdesk-backend/internal/auth"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func createTicketHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Title       string                `json:"title" binding:"required"`
			Description string                `json:"description"`
			Priority    domain.TicketPriority `json:"priority"`
			Category    string                `json:"category"`
			RequesterID uint                  `json:"requester_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ticket := &domain.Ticket{
			Title:       req.Title,
			Description: req.Description,
			Priority:    req.Priority,
			Category:    req.Category,
			RequesterID: req.RequesterID,
			Status:      domain.OpenStatus,
		}

		if ticket.Priority == "" {
			ticket.Priority = domain.MediumPriority
		}

		err := ticketService.CreateTicket(c.Request.Context(), ticket)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket"})
			return
		}

		c.JSON(http.StatusCreated, ticket)
	}
}

func listTicketsHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

		// Get filter parameters
		status := c.Query("status")
		assignedToMe := c.Query("assignedToMe") == "true"
		slaBreached := c.Query("slaBreached") == "true"
		requesterID := c.Query("requester_id")
		assigneeID := c.Query("assignee_id")

		// Get current user ID for assignedToMe filter
		var currentUserID uint
		if assignedToMe {
			userID, exists := auth.GetCurrentUserID(c)
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
				return
			}
			currentUserID = userID
		}

		var tickets []domain.Ticket
		var err error

		// Handle different filtering scenarios
		if requesterID != "" {
			id, _ := strconv.ParseUint(requesterID, 10, 32)
			tickets, err = ticketService.ListTicketsByRequester(c.Request.Context(), uint(id), limit, offset)
		} else if assigneeID != "" {
			id, _ := strconv.ParseUint(assigneeID, 10, 32)
			tickets, err = ticketService.ListTicketsByAssignee(c.Request.Context(), uint(id), limit, offset)
		} else if assignedToMe {
			tickets, err = ticketService.ListTicketsByAssignee(c.Request.Context(), currentUserID, limit, offset)
		} else {
			tickets, err = ticketService.ListTickets(c.Request.Context(), limit, offset)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
			return
		}

		// Apply additional filters after getting the tickets
		filteredTickets := tickets
		if status != "" {
			var statusFiltered []domain.Ticket
			for _, ticket := range filteredTickets {
				if string(ticket.Status) == strings.ToLower(status) {
					statusFiltered = append(statusFiltered, ticket)
				}
			}
			filteredTickets = statusFiltered
		}

		if slaBreached {
			var slaFiltered []domain.Ticket
			now := time.Now()
			for _, ticket := range filteredTickets {
				if ticket.SLABreachAt != nil && now.After(*ticket.SLABreachAt) &&
					ticket.Status != domain.ResolvedStatus && ticket.Status != domain.ClosedStatus {
					slaFiltered = append(slaFiltered, ticket)
				}
			}
			filteredTickets = slaFiltered
		}

		c.JSON(http.StatusOK, filteredTickets)
	}
}

func getTicketHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
			return
		}

		ticket, err := ticketService.GetTicketByID(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
			return
		}

		c.JSON(http.StatusOK, ticket)
	}
}

func updateTicketHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
			return
		}

		var req struct {
			Title       string                `json:"title"`
			Description string                `json:"description"`
			Status      domain.TicketStatus   `json:"status"`
			Priority    domain.TicketPriority `json:"priority"`
			Category    string                `json:"category"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ticket, err := ticketService.GetTicketByID(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
			return
		}

		// Update fields
		if req.Title != "" {
			ticket.Title = req.Title
		}
		if req.Description != "" {
			ticket.Description = req.Description
		}
		if req.Status != "" {
			ticket.Status = req.Status
		}
		if req.Priority != "" {
			ticket.Priority = req.Priority
		}
		if req.Category != "" {
			ticket.Category = req.Category
		}

		err = ticketService.UpdateTicket(c.Request.Context(), ticket)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
			return
		}

		c.JSON(http.StatusOK, ticket)
	}
}

func deleteTicketHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
			return
		}

		err = ticketService.DeleteTicket(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ticket"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Ticket deleted successfully"})
	}
}

func assignTicketHandler(ticketService *service.TicketService) gin.HandlerFunc {
	return func(c *gin.Context) {
		ticketID, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
			return
		}

		var req struct {
			AssigneeID uint `json:"assignee_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err = ticketService.AssignTicket(c.Request.Context(), uint(ticketID), req.AssigneeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign ticket"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Ticket assigned successfully"})
	}
}
