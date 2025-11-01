package service

import (
	"context"
	"errors"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/repository"
)

// ComputerService handles business logic for computers
type ComputerService struct {
	computerRepo *repository.ComputerRepository
	userRepo     *repository.UserRepository
}

// NewComputerService creates a new computer service
func NewComputerService(computerRepo *repository.ComputerRepository, userRepo *repository.UserRepository) *ComputerService {
	return &ComputerService{
		computerRepo: computerRepo,
		userRepo:     userRepo,
	}
}

// CreateComputer creates a new computer
func (s *ComputerService) CreateComputer(computer *domain.Computer) error {
	// Validate assignee if provided
	if computer.AssigneeID != nil {
		_, err := s.userRepo.GetByID(context.Background(), *computer.AssigneeID)
		if err != nil {
			return errors.New("invalid assignee ID")
		}
	}

	// Check for duplicate hostname
	existingComputer, _ := s.computerRepo.GetByHostname(computer.Hostname)
	if existingComputer != nil {
		return errors.New("computer with this hostname already exists")
	}

	return s.computerRepo.Create(computer)
}

// GetComputer retrieves a computer by ID
func (s *ComputerService) GetComputer(id uint) (*domain.Computer, error) {
	return s.computerRepo.GetByID(id)
}

// GetAllComputers retrieves all computers with filtering and pagination
func (s *ComputerService) GetAllComputers(filters map[string]interface{}, page, limit int) ([]domain.Computer, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	return s.computerRepo.GetAll(filters, page, limit)
}

// GetComputersByOS retrieves computers grouped by OS
func (s *ComputerService) GetComputersByOS() (map[string][]domain.Computer, error) {
	return s.computerRepo.GetByOS()
}

// UpdateComputer updates a computer
func (s *ComputerService) UpdateComputer(id uint, updates *domain.Computer) error {
	computer, err := s.computerRepo.GetByID(id)
	if err != nil {
		return err
	}

	// Validate assignee if being updated
	if updates.AssigneeID != nil && *updates.AssigneeID != 0 {
		_, err := s.userRepo.GetByID(context.Background(), *updates.AssigneeID)
		if err != nil {
			return errors.New("invalid assignee ID")
		}
		computer.AssigneeID = updates.AssigneeID
	}

	// Update fields
	if updates.Hostname != "" {
		computer.Hostname = updates.Hostname
	}
	if updates.OS != "" {
		computer.OS = updates.OS
	}
	if updates.OSVersion != "" {
		computer.OSVersion = updates.OSVersion
	}
	if updates.Manufacturer != "" {
		computer.Manufacturer = updates.Manufacturer
	}
	if updates.Model != "" {
		computer.Model = updates.Model
	}
	if updates.SerialNumber != "" {
		computer.SerialNumber = updates.SerialNumber
	}
	if updates.Status != "" {
		computer.Status = updates.Status
	}
	if updates.CPU != "" {
		computer.CPU = updates.CPU
	}
	if updates.RAM != "" {
		computer.RAM = updates.RAM
	}
	if updates.Storage != "" {
		computer.Storage = updates.Storage
	}
	if updates.IPAddress != "" {
		computer.IPAddress = updates.IPAddress
	}
	if updates.MACAddress != "" {
		computer.MACAddress = updates.MACAddress
	}
	if updates.PurchaseDate != nil {
		computer.PurchaseDate = updates.PurchaseDate
	}
	if updates.WarrantyExpiry != nil {
		computer.WarrantyExpiry = updates.WarrantyExpiry
	}
	if updates.PurchaseCost > 0 {
		computer.PurchaseCost = updates.PurchaseCost
	}
	if updates.Location != "" {
		computer.Location = updates.Location
	}
	if updates.Notes != "" {
		computer.Notes = updates.Notes
	}
	if updates.LastMaintenace != nil {
		computer.LastMaintenace = updates.LastMaintenace
	}
	if updates.NextMaintenance != nil {
		computer.NextMaintenance = updates.NextMaintenance
	}

	return s.computerRepo.Update(computer)
}

// DeleteComputer deletes a computer
func (s *ComputerService) DeleteComputer(id uint) error {
	_, err := s.computerRepo.GetByID(id)
	if err != nil {
		return err
	}

	return s.computerRepo.Delete(id)
}

// GetComputerStats returns statistics about computers
func (s *ComputerService) GetComputerStats() (map[string]interface{}, error) {
	return s.computerRepo.GetStats()
}

// AssignComputer assigns a computer to a user
func (s *ComputerService) AssignComputer(computerID, userID uint) error {
	computer, err := s.computerRepo.GetByID(computerID)
	if err != nil {
		return err
	}

	// Validate user exists
	_, err = s.userRepo.GetByID(context.Background(), userID)
	if err != nil {
		return errors.New("user not found")
	}

	computer.AssigneeID = &userID
	return s.computerRepo.Update(computer)
}

// UnassignComputer removes the assignee from a computer
func (s *ComputerService) UnassignComputer(computerID uint) error {
	computer, err := s.computerRepo.GetByID(computerID)
	if err != nil {
		return err
	}

	computer.AssigneeID = nil
	return s.computerRepo.Update(computer)
}
