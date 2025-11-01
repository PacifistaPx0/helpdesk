package repository

import (
	"helpdesk-backend/internal/domain"

	"gorm.io/gorm"
)

// ComputerRepository handles database operations for computers
type ComputerRepository struct {
	db *gorm.DB
}

// NewComputerRepository creates a new computer repository
func NewComputerRepository(db *gorm.DB) *ComputerRepository {
	return &ComputerRepository{db: db}
}

// Create creates a new computer
func (r *ComputerRepository) Create(computer *domain.Computer) error {
	return r.db.Create(computer).Error
}

// GetByID retrieves a computer by ID
func (r *ComputerRepository) GetByID(id uint) (*domain.Computer, error) {
	var computer domain.Computer
	err := r.db.Preload("Assignee").First(&computer, id).Error
	if err != nil {
		return nil, err
	}
	return &computer, nil
}

// GetByHostname retrieves a computer by hostname
func (r *ComputerRepository) GetByHostname(hostname string) (*domain.Computer, error) {
	var computer domain.Computer
	err := r.db.Preload("Assignee").Where("hostname = ?", hostname).First(&computer).Error
	if err != nil {
		return nil, err
	}
	return &computer, nil
}

// GetAll retrieves all computers with optional filtering
func (r *ComputerRepository) GetAll(filters map[string]interface{}, page, limit int) ([]domain.Computer, int64, error) {
	var computers []domain.Computer
	var total int64

	query := r.db.Model(&domain.Computer{})

	// Apply filters
	if os, ok := filters["os"].(string); ok && os != "" {
		query = query.Where("os = ?", os)
	}
	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if assigneeID, ok := filters["assignee_id"].(uint); ok && assigneeID > 0 {
		query = query.Where("assignee_id = ?", assigneeID)
	}
	if location, ok := filters["location"].(string); ok && location != "" {
		query = query.Where("location ILIKE ?", "%"+location+"%")
	}
	if search, ok := filters["search"].(string); ok && search != "" {
		query = query.Where(
			"hostname ILIKE ? OR manufacturer ILIKE ? OR model ILIKE ? OR serial_number ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%",
		)
	}

	// Count total
	query.Count(&total)

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Preload("Assignee").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&computers).Error

	return computers, total, err
}

// GetByOS retrieves all computers grouped by OS
func (r *ComputerRepository) GetByOS() (map[string][]domain.Computer, error) {
	var computers []domain.Computer
	err := r.db.Preload("Assignee").Order("os ASC, hostname ASC").Find(&computers).Error
	if err != nil {
		return nil, err
	}

	// Group computers by OS
	grouped := make(map[string][]domain.Computer)
	for _, computer := range computers {
		grouped[computer.OS] = append(grouped[computer.OS], computer)
	}

	return grouped, nil
}

// Update updates a computer
func (r *ComputerRepository) Update(computer *domain.Computer) error {
	return r.db.Save(computer).Error
}

// Delete soft deletes a computer
func (r *ComputerRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Computer{}, id).Error
}

// GetStats returns computer statistics
func (r *ComputerRepository) GetStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total computers
	var total int64
	r.db.Model(&domain.Computer{}).Count(&total)
	stats["total"] = total

	// Count by status
	var statusCounts []struct {
		Status domain.ComputerStatus
		Count  int64
	}
	r.db.Model(&domain.Computer{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&statusCounts)

	statusMap := make(map[string]int64)
	for _, sc := range statusCounts {
		statusMap[string(sc.Status)] = sc.Count
	}
	stats["by_status"] = statusMap

	// Count by OS
	var osCounts []struct {
		OS    string
		Count int64
	}
	r.db.Model(&domain.Computer{}).
		Select("os, count(*) as count").
		Group("os").
		Order("count DESC").
		Scan(&osCounts)

	osMap := make(map[string]int64)
	for _, oc := range osCounts {
		osMap[oc.OS] = oc.Count
	}
	stats["by_os"] = osMap

	// Assigned vs Unassigned
	var assigned int64
	var unassigned int64
	r.db.Model(&domain.Computer{}).Where("assignee_id IS NOT NULL").Count(&assigned)
	r.db.Model(&domain.Computer{}).Where("assignee_id IS NULL").Count(&unassigned)
	stats["assigned"] = assigned
	stats["unassigned"] = unassigned

	return stats, nil
}
