package repository

import (
	"context"
	"helpdesk-backend/internal/domain"

	"gorm.io/gorm"
)

type CommentRepository struct {
	db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) Create(ctx context.Context, comment *domain.Comment) error {
	return r.db.WithContext(ctx).Create(comment).Error
}

func (r *CommentRepository) GetByID(ctx context.Context, id uint) (*domain.Comment, error) {
	var comment domain.Comment
	err := r.db.WithContext(ctx).Preload("Author").First(&comment, id).Error
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *CommentRepository) Update(ctx context.Context, comment *domain.Comment) error {
	return r.db.WithContext(ctx).Save(comment).Error
}

func (r *CommentRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&domain.Comment{}, id).Error
}

func (r *CommentRepository) ListByTicket(ctx context.Context, ticketID uint) ([]domain.Comment, error) {
	var comments []domain.Comment
	err := r.db.WithContext(ctx).
		Where("ticket_id = ?", ticketID).
		Preload("Author").
		Order("created_at ASC").
		Find(&comments).Error
	return comments, err
}
