package repository

import (
	"helpdesk-backend/internal/domain"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Seeder struct {
	db *gorm.DB
}

func NewSeeder(db *gorm.DB) *Seeder {
	return &Seeder{db: db}
}

func (s *Seeder) SeedInitialData() error {
	log.Println("Starting database seeding...")

	// Seed SLA configurations first
	if err := s.seedSLAs(); err != nil {
		return err
	}

	// Seed users
	if err := s.seedUsers(); err != nil {
		return err
	}

	// Seed sample tickets
	if err := s.seedTickets(); err != nil {
		return err
	}

	log.Println("Database seeding completed successfully")
	return nil
}

func (s *Seeder) seedSLAs() error {
	var count int64
	s.db.Model(&domain.SLA{}).Count(&count)

	if count > 0 {
		log.Println("SLAs already exist, skipping SLA seeding")
		return nil
	}

	slas := []domain.SLA{
		{
			Name:                "Critical Issues",
			Priority:            domain.CriticalPriority,
			ResponseTimeHours:   1,
			ResolutionTimeHours: 4,
		},
		{
			Name:                "High Priority",
			Priority:            domain.HighPriority,
			ResponseTimeHours:   2,
			ResolutionTimeHours: 8,
		},
		{
			Name:                "Medium Priority",
			Priority:            domain.MediumPriority,
			ResponseTimeHours:   4,
			ResolutionTimeHours: 24,
		},
		{
			Name:                "Low Priority",
			Priority:            domain.LowPriority,
			ResponseTimeHours:   8,
			ResolutionTimeHours: 72,
		},
	}

	for _, sla := range slas {
		if err := s.db.Create(&sla).Error; err != nil {
			return err
		}
	}

	log.Println("SLAs seeded successfully")
	return nil
}

func (s *Seeder) seedUsers() error {
	var count int64
	s.db.Model(&domain.User{}).Count(&count)

	if count > 0 {
		log.Println("Users already exist, skipping user seeding")
		return nil
	}

	// Hash passwords
	adminPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	agentPassword, _ := bcrypt.GenerateFromPassword([]byte("agent123"), bcrypt.DefaultCost)
	userPassword, _ := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)

	users := []domain.User{
		{
			Email:      "admin@helpdesk.local",
			FirstName:  "System",
			LastName:   "Administrator",
			Password:   string(adminPassword),
			Role:       domain.AdminRole,
			Department: "IT",
			IsActive:   true,
		},
		{
			Email:      "agent@helpdesk.local",
			FirstName:  "John",
			LastName:   "Agent",
			Password:   string(agentPassword),
			Role:       domain.AgentRole,
			Department: "IT Support",
			IsActive:   true,
		},
		{
			Email:      "user@helpdesk.local",
			FirstName:  "Jane",
			LastName:   "User",
			Password:   string(userPassword),
			Role:       domain.EndUserRole,
			Department: "Sales",
			IsActive:   true,
		},
	}

	for _, user := range users {
		if err := s.db.Create(&user).Error; err != nil {
			return err
		}
	}

	log.Println("Users seeded successfully")
	return nil
}

func (s *Seeder) seedTickets() error {
	var count int64
	s.db.Model(&domain.Ticket{}).Count(&count)

	if count > 0 {
		log.Println("Tickets already exist, skipping ticket seeding")
		return nil
	}

	// Get users for foreign keys
	var admin, agent, user domain.User
	s.db.Where("role = ?", domain.AdminRole).First(&admin)
	s.db.Where("role = ?", domain.AgentRole).First(&agent)
	s.db.Where("role = ?", domain.EndUserRole).First(&user)

	tickets := []domain.Ticket{
		{
			Title:       "Cannot access email account",
			Description: "User reports being unable to access their Outlook email account since this morning.",
			Status:      domain.OpenStatus,
			Priority:    domain.HighPriority,
			Category:    "Email",
			RequesterID: user.ID,
			AssigneeID:  &agent.ID,
			SLABreachAt: calculateSLABreach(domain.HighPriority),
		},
		{
			Title:       "Printer not working",
			Description: "Office printer on 2nd floor is showing paper jam error but no paper is jammed.",
			Status:      domain.InProgressStatus,
			Priority:    domain.MediumPriority,
			Category:    "Hardware",
			RequesterID: user.ID,
			AssigneeID:  &agent.ID,
			SLABreachAt: calculateSLABreach(domain.MediumPriority),
		},
		{
			Title:       "Request new software installation",
			Description: "Need Adobe Creative Suite installed on workstation for design work.",
			Status:      domain.OpenStatus,
			Priority:    domain.LowPriority,
			Category:    "Software",
			RequesterID: user.ID,
			SLABreachAt: calculateSLABreach(domain.LowPriority),
		},
	}

	for _, ticket := range tickets {
		if err := s.db.Create(&ticket).Error; err != nil {
			return err
		}
	}

	log.Println("Sample tickets seeded successfully")
	return nil
}

func calculateSLABreach(priority domain.TicketPriority) *time.Time {
	var hours int
	switch priority {
	case domain.CriticalPriority:
		hours = 4
	case domain.HighPriority:
		hours = 8
	case domain.MediumPriority:
		hours = 24
	case domain.LowPriority:
		hours = 72
	default:
		hours = 24
	}

	breachTime := time.Now().Add(time.Duration(hours) * time.Hour)
	return &breachTime
}
