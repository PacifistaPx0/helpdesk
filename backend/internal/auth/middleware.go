package auth

import (
	"net/http"
	"strings"

	"helpdesk-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware returns a gin middleware that allows requests from allowedOrigins.
// allowedOrigins can be ["*"] or a list like ["http://localhost:5173","https://example.com"].
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	// normalize allowedOrigins: trim spaces
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := false

		// If allowedOrigins is empty or contains "*", allow all origins.
		if len(allowedOrigins) == 0 {
			allowed = true
		} else {
			for _, o := range allowedOrigins {
				if o == "*" || o == origin {
					allowed = true
					break
				}
			}
		}

		if allowed {
			if origin == "" {
				c.Header("Access-Control-Allow-Origin", "*")
			} else {
				c.Header("Access-Control-Allow-Origin", origin)
			}
		} else {
			c.Header("Access-Control-Allow-Origin", "null")
		}

		c.Header("Vary", "Origin")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		// Handle preflight
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// AuthMiddleware creates middleware for JWT authentication
func AuthMiddleware(jwtService *JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Check if it starts with "Bearer "
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format. Use: Bearer <token>",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate the token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Check if it's not a refresh token (access tokens only for API access)
		if claims.IsRefresh {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Access token required, not refresh token",
			})
			c.Abort()
			return
		}

		// Set user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("jwt_claims", claims)

		// Continue to the next handler
		c.Next()
	}
}

// RequireRole creates middleware that requires specific user roles
func RequireRole(allowedRoles ...domain.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user role from context (set by AuthMiddleware)
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "User role not found in context",
			})
			c.Abort()
			return
		}

		role, ok := userRole.(domain.UserRole)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user role type",
			})
			c.Abort()
			return
		}

		// Check if user role is in allowed roles
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				c.Next()
				return
			}
		}

		// User doesn't have required role
		c.JSON(http.StatusForbidden, gin.H{
			"error":          "Insufficient permissions",
			"required_roles": allowedRoles,
			"user_role":      role,
		})
		c.Abort()
	}
}

// RequireAdmin creates middleware that requires admin role
func RequireAdmin() gin.HandlerFunc {
	return RequireRole(domain.AdminRole)
}

// RequireAdminOrAgent creates middleware that requires admin or agent role
func RequireAdminOrAgent() gin.HandlerFunc {
	return RequireRole(domain.AdminRole, domain.AgentRole)
}

// GetCurrentUserID extracts the current user ID from the JWT context
func GetCurrentUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	id, ok := userID.(uint)
	return id, ok
}

// GetCurrentUserRole extracts the current user role from the JWT context
func GetCurrentUserRole(c *gin.Context) (domain.UserRole, bool) {
	userRole, exists := c.Get("user_role")
	if !exists {
		return "", false
	}

	role, ok := userRole.(domain.UserRole)
	return role, ok
}

// GetCurrentUserEmail extracts the current user email from the JWT context
func GetCurrentUserEmail(c *gin.Context) (string, bool) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		return "", false
	}

	email, ok := userEmail.(string)
	return email, ok
}
