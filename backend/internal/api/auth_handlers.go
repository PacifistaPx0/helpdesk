package api

import (
	"net/http"

	"helpdesk-backend/internal/auth"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// AuthHandlers contains handlers for authentication endpoints
type AuthHandlers struct {
	userService *service.UserService
	jwtService  *auth.JWTService
}

// NewAuthHandlers creates a new instance of auth handlers
func NewAuthHandlers(userService *service.UserService, jwtService *auth.JWTService) *AuthHandlers {
	return &AuthHandlers{
		userService: userService,
		jwtService:  jwtService,
	}
}

// Login handles user authentication
func (h *AuthHandlers) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Authenticate user
	user, err := h.userService.AuthenticateUser(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Account is deactivated",
		})
		return
	}

	// Generate JWT tokens
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate tokens",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
			"department": user.Department,
		},
		"tokens": tokenPair,
	})
}

// Register handles user registration
func (h *AuthHandlers) Register(c *gin.Context) {
	var req domain.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Set default role if not provided
	if req.Role == "" {
		req.Role = domain.EndUserRole
	}

	// Check if only admins can create admin users
	currentUserRole, hasRole := auth.GetCurrentUserRole(c)
	if req.Role == domain.AdminRole && (!hasRole || currentUserRole != domain.AdminRole) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only admins can create admin users",
		})
		return
	}

	// Create user object
	user := &domain.User{
		Email:      req.Email,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Password:   req.Password, // Will be hashed in service
		Role:       req.Role,
		Department: req.Department,
		IsActive:   true,
	}

	// Create user
	if err := h.userService.CreateUser(c.Request.Context(), user); err != nil {
		// Check for duplicate email
		if err.Error() == "email already exists" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already exists",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create user",
			"details": err.Error(),
		})
		return
	}

	// Generate JWT tokens for the new user
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "User created but failed to generate tokens",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
			"department": user.Department,
		},
		"tokens": tokenPair,
	})
}

// RefreshToken handles token refresh
func (h *AuthHandlers) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Refresh token is required",
		})
		return
	}

	// Generate new access token
	tokenPair, err := h.jwtService.RefreshAccessToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid or expired refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
		"tokens":  tokenPair,
	})
}

// Logout handles user logout
func (h *AuthHandlers) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is handled client-side
	// The client should:
	// 1. Remove tokens from local storage/cookies
	// 2. Clear any cached user data
	// 3. Redirect to login page

	// For additional security, you could:
	// - Use shorter token expiry times (15-30 minutes)
	// - Implement token blacklisting with Redis
	// - Use refresh token rotation

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
		"note":    "Please remove tokens from client storage",
	})
}

// Profile returns the current user's profile
func (h *AuthHandlers) Profile(c *gin.Context) {
	userID, exists := auth.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
			"department": user.Department,
			"is_active":  user.IsActive,
			"created_at": user.CreatedAt,
		},
	})
}
