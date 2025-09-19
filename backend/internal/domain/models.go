package domain

import (
	"time"

	"gorm.io/gorm"
)

// UserRole defines the role of a user in the system
type UserRole string

const (
	AdminRole   UserRole = "admin"
	AgentRole   UserRole = "agent"
	EndUserRole UserRole = "end_user"
)

// JWT-related structures
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type JWTClaims struct {
	UserID    uint     `json:"user_id"`
	Email     string   `json:"email"`
	Role      UserRole `json:"role"`
	IsRefresh bool     `json:"is_refresh,omitempty"`
}

// LoginRequest represents the login payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents the registration payload
type RegisterRequest struct {
	Email      string   `json:"email" binding:"required,email"`
	FirstName  string   `json:"first_name" binding:"required,min=2,max=50"`
	LastName   string   `json:"last_name" binding:"required,min=2,max=50"`
	Password   string   `json:"password" binding:"required,min=8"`
	Department string   `json:"department" binding:"required"`
	Role       UserRole `json:"role,omitempty"`
}

// User represents a user in the system
type User struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	Email      string         `json:"email" gorm:"uniqueIndex;not null"`
	FirstName  string         `json:"first_name" gorm:"not null"`
	LastName   string         `json:"last_name" gorm:"not null"`
	Password   string         `json:"-" gorm:"not null"`
	Role       UserRole       `json:"role" gorm:"not null;default:'end_user'"`
	Department string         `json:"department"`
	IsActive   bool           `json:"is_active" gorm:"default:true"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

// TicketStatus defines the status of a ticket
type TicketStatus string

const (
	OpenStatus       TicketStatus = "open"
	InProgressStatus TicketStatus = "in_progress"
	ResolvedStatus   TicketStatus = "resolved"
	ClosedStatus     TicketStatus = "closed"
)

// TicketPriority defines the priority level of a ticket
type TicketPriority string

const (
	LowPriority      TicketPriority = "low"
	MediumPriority   TicketPriority = "medium"
	HighPriority     TicketPriority = "high"
	CriticalPriority TicketPriority = "critical"
)

// Ticket represents a support ticket
type Ticket struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description" gorm:"type:text"`
	Status      TicketStatus   `json:"status" gorm:"not null;default:'open';index"`
	Priority    TicketPriority `json:"priority" gorm:"not null;default:'medium'"`
	Category    string         `json:"category"`

	// Relationships
	RequesterID uint `json:"requester_id" gorm:"not null"`
	Requester   User `json:"requester" gorm:"foreignKey:RequesterID"`

	AssigneeID *uint `json:"assignee_id"`
	Assignee   *User `json:"assignee,omitempty" gorm:"foreignKey:AssigneeID"`

	// SLA fields
	SLABreachAt *time.Time `json:"sla_breach_at" gorm:"index"`
	ResolvedAt  *time.Time `json:"resolved_at"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Associated data
	Comments []Comment `json:"comments,omitempty" gorm:"foreignKey:TicketID"`
}

// Comment represents a comment on a ticket
type Comment struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Content  string `json:"content" gorm:"type:text;not null"`
	IsPublic bool   `json:"is_public" gorm:"default:true"`

	// Relationships
	TicketID uint   `json:"ticket_id" gorm:"not null"`
	Ticket   Ticket `json:"-" gorm:"foreignKey:TicketID"`

	AuthorID uint `json:"author_id" gorm:"not null"`
	Author   User `json:"author" gorm:"foreignKey:AuthorID"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// SLA represents Service Level Agreement configuration
type SLA struct {
	ID                  uint           `json:"id" gorm:"primaryKey"`
	Name                string         `json:"name" gorm:"not null"`
	Description         string         `json:"description"`
	Priority            TicketPriority `json:"priority" gorm:"not null"`
	ResponseTimeHours   int            `json:"response_time_hours" gorm:"not null"`
	ResolutionTimeHours int            `json:"resolution_time_hours" gorm:"not null"`
	IsActive            bool           `json:"is_active" gorm:"default:true"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `json:"-" gorm:"index"`
}
