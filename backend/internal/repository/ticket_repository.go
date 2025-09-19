package repository

import (
	"context"
	"helpdesk-backend/internal/domain"
	"time"

	"gorm.io/gorm"
)

type TicketRepository struct {
	db *gorm.DB
}

func NewTicketRepository(db *gorm.DB) *TicketRepository {
	return &TicketRepository{db: db}
}

func (r *TicketRepository) Create(ctx context.Context, ticket *domain.Ticket) error {
	return r.db.WithContext(ctx).Create(ticket).Error
}

func (r *TicketRepository) GetByID(ctx context.Context, id uint) (*domain.Ticket, error) {
	var ticket domain.Ticket
	err := r.db.WithContext(ctx).Preload("Requester").Preload("Assignee").Preload("Comments.Author").First(&ticket, id).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *TicketRepository) Update(ctx context.Context, ticket *domain.Ticket) error {
	return r.db.WithContext(ctx).Save(ticket).Error
}

func (r *TicketRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&domain.Ticket{}, id).Error
}

func (r *TicketRepository) List(ctx context.Context, limit, offset int) ([]domain.Ticket, error) {
	var tickets []domain.Ticket
	err := r.db.WithContext(ctx).Preload("Requester").Preload("Assignee").Limit(limit).Offset(offset).Find(&tickets).Error
	return tickets, err
}

func (r *TicketRepository) ListByRequester(ctx context.Context, requesterID uint, limit, offset int) ([]domain.Ticket, error) {
	var tickets []domain.Ticket
	err := r.db.WithContext(ctx).
		Where("requester_id = ?", requesterID).
		Preload("Requester").
		Preload("Assignee").
		Limit(limit).
		Offset(offset).
		Find(&tickets).Error
	return tickets, err
}

func (r *TicketRepository) ListByAssignee(ctx context.Context, assigneeID uint, limit, offset int) ([]domain.Ticket, error) {
	var tickets []domain.Ticket
	err := r.db.WithContext(ctx).
		Where("assignee_id = ?", assigneeID).
		Preload("Requester").
		Preload("Assignee").
		Limit(limit).
		Offset(offset).
		Find(&tickets).Error
	return tickets, err
}

// Dashboard statistics methods
func (r *TicketRepository) GetTotalCount(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Count(&count).Error
	return int(count), err
}

func (r *TicketRepository) GetCountByStatus(ctx context.Context, status domain.TicketStatus) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Where("status = ?", status).Count(&count).Error
	return int(count), err
}

func (r *TicketRepository) GetCountByAssignee(ctx context.Context, assigneeID uint) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Where("assignee_id = ?", assigneeID).Count(&count).Error
	return int(count), err
}

func (r *TicketRepository) GetSLABreachesCount(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Ticket{}).
		Where("sla_breach_at < ? AND status NOT IN (?)", time.Now(), []domain.TicketStatus{domain.ResolvedStatus, domain.ClosedStatus}).
		Count(&count).Error
	return int(count), err
}

func (r *TicketRepository) GetResolvedTodayCount(ctx context.Context) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Ticket{}).
		Where("status = ? AND DATE(resolved_at) = CURRENT_DATE", domain.ResolvedStatus).
		Count(&count).Error
	return int(count), err
}

func (r *TicketRepository) GetAverageResolutionTime(ctx context.Context) (int, error) {
	var result struct {
		AvgHours float64
	}

	err := r.db.WithContext(ctx).Raw(`
		SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
		FROM tickets 
		WHERE resolved_at IS NOT NULL AND status = ?
	`, domain.ResolvedStatus).Scan(&result).Error

	if err != nil {
		return 0, err
	}

	return int(result.AvgHours), nil
}

func (r *TicketRepository) GetDashboardStats(ctx context.Context, userID uint, role string) (map[string]int, error) {
	stats := make(map[string]int)

	// Total tickets
	var totalTickets int64
	if err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Count(&totalTickets).Error; err != nil {
		return nil, err
	}
	stats["totalTickets"] = int(totalTickets)

	// Open tickets
	var openTickets int64
	if err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Where("status = ?", "open").Count(&openTickets).Error; err != nil {
		return nil, err
	}
	stats["openTickets"] = int(openTickets)

	// Assigned to me (only for agents and admins)
	var assignedToMe int64
	if role == "Agent" || role == "Admin" {
		if err := r.db.WithContext(ctx).Model(&domain.Ticket{}).Where("assigned_to = ?", userID).Count(&assignedToMe).Error; err != nil {
			return nil, err
		}
	}
	stats["assignedToMe"] = int(assignedToMe)

	// SLA breaches (tickets past SLA time - simplified calculation)
	now := time.Now()
	var slaBreaches int64
	if err := r.db.WithContext(ctx).Model(&domain.Ticket{}).
		Where("status IN (?) AND created_at < ?", []string{"open", "in_progress"}, now.Add(-24*time.Hour)).
		Count(&slaBreaches).Error; err != nil {
		return nil, err
	}
	stats["slaBreaches"] = int(slaBreaches)

	// Resolved today
	today := time.Now().Truncate(24 * time.Hour)
	var resolvedToday int64
	if err := r.db.WithContext(ctx).Model(&domain.Ticket{}).
		Where("status = ? AND updated_at >= ?", "resolved", today).
		Count(&resolvedToday).Error; err != nil {
		return nil, err
	}
	stats["resolvedToday"] = int(resolvedToday)

	return stats, nil
}

func (r *TicketRepository) GetRecentTickets(ctx context.Context, limit int) ([]domain.Ticket, error) {
	var tickets []domain.Ticket
	err := r.db.WithContext(ctx).
		Preload("Requester").
		Preload("Assignee").
		Order("created_at DESC").
		Limit(limit).
		Find(&tickets).Error
	return tickets, err
}
