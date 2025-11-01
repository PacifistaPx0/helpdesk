package api

import (
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ComputerHandler handles HTTP requests for computers
type ComputerHandler struct {
	computerService *service.ComputerService
}

// NewComputerHandler creates a new computer handler
func NewComputerHandler(computerService *service.ComputerService) *ComputerHandler {
	return &ComputerHandler{computerService: computerService}
}

// CreateComputer handles POST /api/computers
func (h *ComputerHandler) CreateComputer(c *gin.Context) {
	var computer domain.Computer
	if err := c.ShouldBindJSON(&computer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.computerService.CreateComputer(&computer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, computer)
}

// GetComputer handles GET /api/computers/:id
func (h *ComputerHandler) GetComputer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid computer ID"})
		return
	}

	computer, err := h.computerService.GetComputer(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "computer not found"})
		return
	}

	c.JSON(http.StatusOK, computer)
}

// GetAllComputers handles GET /api/computers
func (h *ComputerHandler) GetAllComputers(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filters := make(map[string]interface{})
	if os := c.Query("os"); os != "" {
		filters["os"] = os
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if assigneeID := c.Query("assignee_id"); assigneeID != "" {
		if id, err := strconv.ParseUint(assigneeID, 10, 32); err == nil {
			filters["assignee_id"] = uint(id)
		}
	}
	if location := c.Query("location"); location != "" {
		filters["location"] = location
	}
	if search := c.Query("search"); search != "" {
		filters["search"] = search
	}

	computers, total, err := h.computerService.GetAllComputers(filters, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve computers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"computers": computers,
		"total":     total,
		"page":      page,
		"limit":     limit,
		"pages":     (total + int64(limit) - 1) / int64(limit),
	})
}

// GetComputersByOS handles GET /api/computers/by-os
func (h *ComputerHandler) GetComputersByOS(c *gin.Context) {
	computersByOS, err := h.computerService.GetComputersByOS()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve computers by OS"})
		return
	}

	c.JSON(http.StatusOK, computersByOS)
}

// UpdateComputer handles PUT /api/computers/:id
func (h *ComputerHandler) UpdateComputer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid computer ID"})
		return
	}

	var updates domain.Computer
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.computerService.UpdateComputer(uint(id), &updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	computer, _ := h.computerService.GetComputer(uint(id))
	c.JSON(http.StatusOK, computer)
}

// DeleteComputer handles DELETE /api/computers/:id
func (h *ComputerHandler) DeleteComputer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid computer ID"})
		return
	}

	if err := h.computerService.DeleteComputer(uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "computer not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "computer deleted successfully"})
}

// GetComputerStats handles GET /api/computers/stats
func (h *ComputerHandler) GetComputerStats(c *gin.Context) {
	stats, err := h.computerService.GetComputerStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve computer statistics"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// AssignComputer handles POST /api/computers/:id/assign
func (h *ComputerHandler) AssignComputer(c *gin.Context) {
	computerID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid computer ID"})
		return
	}

	var req struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.computerService.AssignComputer(uint(computerID), req.UserID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	computer, _ := h.computerService.GetComputer(uint(computerID))
	c.JSON(http.StatusOK, computer)
}

// UnassignComputer handles POST /api/computers/:id/unassign
func (h *ComputerHandler) UnassignComputer(c *gin.Context) {
	computerID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid computer ID"})
		return
	}

	if err := h.computerService.UnassignComputer(uint(computerID)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "computer not found"})
		return
	}

	computer, _ := h.computerService.GetComputer(uint(computerID))
	c.JSON(http.StatusOK, computer)
}
