package api

import (
	"log"
	"net/http"
	"strconv"

	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// Auth handlers
func registerHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email      string          `json:"email" binding:"required,email"`
			FirstName  string          `json:"first_name" binding:"required"`
			LastName   string          `json:"last_name" binding:"required"`
			Password   string          `json:"password" binding:"required,min=6"`
			Role       domain.UserRole `json:"role"`
			Department string          `json:"department"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user := &domain.User{
			Email:      req.Email,
			FirstName:  req.FirstName,
			LastName:   req.LastName,
			Password:   req.Password,
			Role:       req.Role,
			Department: req.Department,
		}

		if user.Role == "" {
			user.Role = domain.EndUserRole
		}

		err := userService.CreateUser(c.Request.Context(), user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		// Don't return password in response
		user.Password = ""
		c.JSON(http.StatusCreated, user)
	}
}

func loginHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user, err := userService.AuthenticateUser(c.Request.Context(), req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// TODO: Generate JWT token
		// token, err := auth.GenerateToken(user.ID, user.Role)
		// if err != nil {
		//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		//     return
		// }

		user.Password = ""
		c.JSON(http.StatusOK, gin.H{
			"user": user,
			// "token": token,
		})
	}
}

// User handlers
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
