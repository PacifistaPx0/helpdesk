package api

import (
	"log"
	"net/http"
	"strconv"

	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// User management handlers (for admin/agent operations)

func listUsersHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Test hot reload - added logging
		log.Printf("📝 Fetching users list...")

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

		users, err := userService.ListUsers(c.Request.Context(), limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}

		log.Printf("✅ Successfully fetched %d users", len(users))
		c.JSON(http.StatusOK, users)
	}
}

func getUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		user, err := userService.GetUserByID(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		user.Password = ""
		c.JSON(http.StatusOK, user)
	}
}

func updateUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		var req struct {
			FirstName  string          `json:"first_name"`
			LastName   string          `json:"last_name"`
			Role       domain.UserRole `json:"role"`
			Department string          `json:"department"`
			IsActive   *bool           `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user, err := userService.GetUserByID(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		// Update fields
		if req.FirstName != "" {
			user.FirstName = req.FirstName
		}
		if req.LastName != "" {
			user.LastName = req.LastName
		}
		if req.Role != "" {
			user.Role = req.Role
		}
		if req.Department != "" {
			user.Department = req.Department
		}
		if req.IsActive != nil {
			user.IsActive = *req.IsActive
		}

		err = userService.UpdateUser(c.Request.Context(), user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}

		user.Password = ""
		c.JSON(http.StatusOK, user)
	}
}

func deleteUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		err = userService.DeleteUser(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
	}
}
