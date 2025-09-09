package service

import (
	"context"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/repository"
)

type CommentService struct {
	commentRepo *repository.CommentRepository
}

func NewCommentService(commentRepo *repository.CommentRepository) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
	}
}

func (s *CommentService) CreateComment(ctx context.Context, comment *domain.Comment) error {
	return s.commentRepo.Create(ctx, comment)
}

func (s *CommentService) GetCommentByID(ctx context.Context, id uint) (*domain.Comment, error) {
	return s.commentRepo.GetByID(ctx, id)
}

func (s *CommentService) UpdateComment(ctx context.Context, comment *domain.Comment) error {
	return s.commentRepo.Update(ctx, comment)
}

func (s *CommentService) DeleteComment(ctx context.Context, id uint) error {
	return s.commentRepo.Delete(ctx, id)
}

func (s *CommentService) ListCommentsByTicket(ctx context.Context, ticketID uint) ([]domain.Comment, error) {
	return s.commentRepo.ListByTicket(ctx, ticketID)
}
