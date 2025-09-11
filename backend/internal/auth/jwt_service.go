package auth

import (
	"errors"
	"time"

	"helpdesk-backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

// Custom JWT claims that includes our domain information
type Claims struct {
	UserID    uint            `json:"user_id"`
	Email     string          `json:"email"`
	Role      domain.UserRole `json:"role"`
	IsRefresh bool            `json:"is_refresh,omitempty"`
	jwt.RegisteredClaims
}

// JWTService handles JWT token operations
type JWTService struct {
	secretKey       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// NewJWTService creates a new JWT service instance
func NewJWTService(secretKey string, accessTokenTTL, refreshTokenTTL time.Duration) *JWTService {
	return &JWTService{
		secretKey:       []byte(secretKey),
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
	}
}

// GenerateTokenPair creates both access and refresh tokens for a user
func (j *JWTService) GenerateTokenPair(user *domain.User) (*domain.TokenPair, error) {
	now := time.Now()

	// Generate access token
	accessToken, err := j.generateToken(user, false, now.Add(j.accessTokenTTL))
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := j.generateToken(user, true, now.Add(j.refreshTokenTTL))
	if err != nil {
		return nil, err
	}

	return &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(j.accessTokenTTL.Seconds()),
	}, nil
}

// generateToken creates a JWT token with the specified parameters
func (j *JWTService) generateToken(user *domain.User, isRefresh bool, expiresAt time.Time) (string, error) {
	claims := Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		IsRefresh: isRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "helpdesk-backend",
			Subject:   user.Email,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// ValidateToken parses and validates a JWT token
func (j *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return j.secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RefreshAccessToken generates a new access token using a refresh token
func (j *JWTService) RefreshAccessToken(refreshTokenString string) (*domain.TokenPair, error) {
	// Validate the refresh token
	claims, err := j.ValidateToken(refreshTokenString)
	if err != nil {
		return nil, err
	}

	// Check if it's actually a refresh token
	if !claims.IsRefresh {
		return nil, errors.New("invalid refresh token")
	}

	// Create a user object from claims (for token generation)
	user := &domain.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}

	// Generate new access token
	now := time.Now()
	accessToken, err := j.generateToken(user, false, now.Add(j.accessTokenTTL))
	if err != nil {
		return nil, err
	}

	return &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString, // Keep the same refresh token
		ExpiresIn:    int64(j.accessTokenTTL.Seconds()),
	}, nil
}

// ExtractUserID extracts user ID from token claims
func (j *JWTService) ExtractUserID(tokenString string) (uint, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return 0, err
	}
	return claims.UserID, nil
}

// ExtractUserRole extracts user role from token claims
func (j *JWTService) ExtractUserRole(tokenString string) (domain.UserRole, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}
	return claims.Role, nil
}
