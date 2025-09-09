package repository

import (
	"context"
	"helpdesk-backend/internal/domain"

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
