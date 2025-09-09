package service

import (
	"context"
	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/repository"
	"time"
)

type TicketService struct {
	ticketRepo *repository.TicketRepository
}

func NewTicketService(ticketRepo *repository.TicketRepository) *TicketService {
	return &TicketService{
		ticketRepo: ticketRepo,
	}
}

func (s *TicketService) CreateTicket(ctx context.Context, ticket *domain.Ticket) error {
	// Calculate SLA breach time based on priority
	slaHours := s.getSLAHours(ticket.Priority)
	breachTime := time.Now().Add(time.Duration(slaHours) * time.Hour)
	ticket.SLABreachAt = &breachTime

	return s.ticketRepo.Create(ctx, ticket)
}

func (s *TicketService) GetTicketByID(ctx context.Context, id uint) (*domain.Ticket, error) {
	return s.ticketRepo.GetByID(ctx, id)
}

func (s *TicketService) UpdateTicket(ctx context.Context, ticket *domain.Ticket) error {
	// If status is being changed to resolved, set resolved time
	if ticket.Status == domain.ResolvedStatus && ticket.ResolvedAt == nil {
		now := time.Now()
		ticket.ResolvedAt = &now
	}

	return s.ticketRepo.Update(ctx, ticket)
}

func (s *TicketService) DeleteTicket(ctx context.Context, id uint) error {
	return s.ticketRepo.Delete(ctx, id)
}

func (s *TicketService) ListTickets(ctx context.Context, limit, offset int) ([]domain.Ticket, error) {
	return s.ticketRepo.List(ctx, limit, offset)
}

func (s *TicketService) ListTicketsByRequester(ctx context.Context, requesterID uint, limit, offset int) ([]domain.Ticket, error) {
	return s.ticketRepo.ListByRequester(ctx, requesterID, limit, offset)
}

func (s *TicketService) ListTicketsByAssignee(ctx context.Context, assigneeID uint, limit, offset int) ([]domain.Ticket, error) {
	return s.ticketRepo.ListByAssignee(ctx, assigneeID, limit, offset)
}

func (s *TicketService) AssignTicket(ctx context.Context, ticketID, assigneeID uint) error {
	ticket, err := s.ticketRepo.GetByID(ctx, ticketID)
	if err != nil {
		return err
	}

	ticket.AssigneeID = &assigneeID
	if ticket.Status == domain.OpenStatus {
		ticket.Status = domain.InProgressStatus
	}

	return s.ticketRepo.Update(ctx, ticket)
}

// getSLAHours returns the SLA hours based on priority
func (s *TicketService) getSLAHours(priority domain.TicketPriority) int {
	switch priority {
	case domain.CriticalPriority:
		return 4 // 4 hours
	case domain.HighPriority:
		return 8 // 8 hours
	case domain.MediumPriority:
		return 24 // 24 hours
	case domain.LowPriority:
		return 72 // 72 hours
	default:
		return 24 // Default to 24 hours
	}
}
