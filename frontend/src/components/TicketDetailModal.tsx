import { useState, useEffect } from 'react'
import { ticketsApi } from '../services/api'
import type { Ticket } from '../services/api'

interface TicketDetailModalProps {
  isOpen: boolean
  ticketId: string | null
  onClose: () => void
  onTicketUpdated?: (ticket: Ticket) => void
}

export function TicketDetailModal({ isOpen, ticketId, onClose, onTicketUpdated }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [updatedTicket, setUpdatedTicket] = useState<Partial<Ticket>>({})

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicketDetails()
    }
    // Reset state when modal closes
    if (!isOpen) {
      setTicket(null)
      setError(null)
      setIsEditing(false)
      setUpdatedTicket({})
    }
  }, [isOpen, ticketId]) // Only depend on isOpen and ticketId

  const loadTicketDetails = async () => {
    if (!ticketId) return
    
    setLoading(true)
    setError(null)
    try {
      const ticketData = await ticketsApi.getTicket(ticketId)
      setTicket(ticketData)
      setUpdatedTicket({}) // Reset edit form
    } catch (err) {
      setError('Failed to load ticket details')
      console.error('Error loading ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTicket = async () => {
    if (!ticket || !ticketId) return

    try {
      const updated = await ticketsApi.updateTicket(ticketId, updatedTicket)
      setTicket(updated)
      setIsEditing(false)
      setUpdatedTicket({})
      if (onTicketUpdated) {
        onTicketUpdated(updated)
      }
    } catch (err) {
      setError('Failed to update ticket')
      console.error('Error updating ticket:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'InProgress': 
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Resolved': return 'bg-green-50 text-green-700 border-green-200'
      case 'Closed': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'High': return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!isOpen) return null

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-opacity-20 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ 
        zIndex: 9999,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)' // Safari support
      }}
      onClick={onClose}
    >
      <div 
        className="bg-gray-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Ticket Details</h3>
                <p className="text-sm text-gray-500">
                  {ticket ? `#${ticket.id}` : `#${ticketId || 'Loading...'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {ticket && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading ticket details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {ticket && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={updatedTicket.title ?? ticket.title}
                        onChange={(e) => setUpdatedTicket({ ...updatedTicket, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{ticket.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    {isEditing ? (
                      <select
                        value={updatedTicket.status ?? ticket.status}
                        onChange={(e) => setUpdatedTicket({ ...updatedTicket, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Open">Open</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    {isEditing ? (
                      <select
                        value={updatedTicket.priority ?? ticket.priority}
                        onChange={(e) => setUpdatedTicket({ ...updatedTicket, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={updatedTicket.category ?? ticket.category}
                        onChange={(e) => setUpdatedTicket({ ...updatedTicket, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{ticket.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
                    <p className="text-gray-900">
                      {ticket.requester ? `${ticket.requester.firstName} ${ticket.requester.lastName}` : 'Unknown'}
                    </p>
                    {ticket.requester && (
                      <p className="text-sm text-gray-500">{ticket.requester.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={updatedTicket.description ?? ticket.description}
                    onChange={(e) => setUpdatedTicket({ ...updatedTicket, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-md p-3 text-gray-900">
                    {ticket.description || 'No description provided'}
                  </div>
                )}
              </div>

              {/* Actions */}
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setUpdatedTicket({})
                    }}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTicket}
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}