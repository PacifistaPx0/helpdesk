package api

import (
	"net/http"
	"strconv"

	"helpdesk-backend/internal/domain"
	"helpdesk-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func createCommentHandler(commentService *service.CommentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Content  string `json:"content" binding:"required"`
			TicketID uint   `json:"ticket_id" binding:"required"`
			AuthorID uint   `json:"author_id" binding:"required"`
			IsPublic bool   `json:"is_public"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		comment := &domain.Comment{
			Content:  req.Content,
			TicketID: req.TicketID,
			AuthorID: req.AuthorID,
			IsPublic: req.IsPublic,
		}

		err := commentService.CreateComment(c.Request.Context(), comment)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
			return
		}

		c.JSON(http.StatusCreated, comment)
	}
}

func listCommentsHandler(commentService *service.CommentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		ticketID, err := strconv.ParseUint(c.Param("ticketId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
			return
		}

		comments, err := commentService.ListCommentsByTicket(c.Request.Context(), uint(ticketID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
			return
		}

		c.JSON(http.StatusOK, comments)
	}
}

func updateCommentHandler(commentService *service.CommentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
			return
		}

		var req struct {
			Content  string `json:"content"`
			IsPublic *bool  `json:"is_public"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		comment, err := commentService.GetCommentByID(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}

		// Update fields
		if req.Content != "" {
			comment.Content = req.Content
		}
		if req.IsPublic != nil {
			comment.IsPublic = *req.IsPublic
		}

		err = commentService.UpdateComment(c.Request.Context(), comment)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment"})
			return
		}

		c.JSON(http.StatusOK, comment)
	}
}

func deleteCommentHandler(commentService *service.CommentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
			return
		}

		err = commentService.DeleteComment(c.Request.Context(), uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
	}
}
