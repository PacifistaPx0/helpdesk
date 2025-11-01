import { useState, useEffect, useCallback } from 'react'
import { ticketsApi, type Ticket } from '../services/api'
import { TicketDetailModal } from './TicketDetailModal'
import { CreateTicketModal } from './CreateTicketModal'

interface AllTicketsPageProps {}

interface TicketFilters {
  search?: string
  status?: 'Open' | 'InProgress' | 'Resolved' | 'Closed' | ''
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | ''
  assignedToMe?: boolean
  slaBreached?: boolean
  category?: string
  page: number
  limit: number
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status'
  sortOrder: 'asc' | 'desc'
}

export function AllTicketsPage({}: AllTicketsPageProps) {
  // State management
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalTickets, setTotalTickets] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filter and pagination state
  const [filters, setFilters] = useState<TicketFilters>({
    search: '',
    status: '',
    priority: '',
    assignedToMe: false,
    slaBreached: false,
    category: '',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  // Modal state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Search debouncing
  const [searchInput, setSearchInput] = useState(filters.search)

  // Load tickets with current filters
  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params: any = {
        page: filters.page,
        limit: filters.limit
      }

      // Add non-empty filters
      if (filters.status) params.status = filters.status
      if (filters.assignedToMe) params.assignedToMe = true
      if (filters.slaBreached) params.slaBreached = true
      
      const response = await ticketsApi.getTickets(params)
      
      // Client-side filtering for search, priority, category, and sorting
      let filteredTickets = response.tickets

      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim()
        filteredTickets = filteredTickets.filter(ticket =>
          (ticket.title && ticket.title.toLowerCase().includes(searchLower)) ||
          (ticket.description && ticket.description.toLowerCase().includes(searchLower)) ||
          (ticket.category && ticket.category.toLowerCase().includes(searchLower))
        )
      }

      // Priority filter
      if (filters.priority) {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === filters.priority)
      }

      // Category filter
      if (filters.category && filters.category.trim()) {
        const categoryFilter = filters.category.toLowerCase().trim()
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.category && ticket.category.toLowerCase().includes(categoryFilter)
        )
      }

      // Sorting
      filteredTickets = filteredTickets.sort((a, b) => {
        let aValue: any, bValue: any

        switch (filters.sortBy) {
          case 'priority':
            const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
            break
          case 'status':
            const statusOrder = { 'Open': 1, 'InProgress': 2, 'Resolved': 3, 'Closed': 4 }
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0
            break
          case 'updatedAt':
            aValue = new Date(a.updatedAt).getTime()
            bValue = new Date(b.updatedAt).getTime()
            break
          case 'createdAt':
          default:
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
        }

        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      })

      setTickets(filteredTickets)
      setTotalTickets(response.total)
      setTotalPages(Math.ceil(response.total / filters.limit))
    } catch (err) {
      console.error('Failed to load tickets:', err)
      setError('Failed to load tickets. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load tickets when filters change
  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Debounced search effect - React way
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }))
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchInput])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  // Filter handlers
  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleLimitChange = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }))
  }

  // Ticket interaction handlers
  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setIsTicketModalOpen(true)
  }

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
  }

  const handleTicketCreated = (newTicket: Ticket) => {
    // Add new ticket to the beginning of the list
    setTickets(prevTickets => [newTicket, ...prevTickets])
    // Update total count
    setTotalTickets(prev => prev + 1)
    // Recalculate total pages if needed
    if (filters.limit) {
      setTotalPages(Math.ceil((totalTickets + 1) / filters.limit))
    }
  }

  const handleQuickStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      const updatedTicket = await ticketsApi.updateTicket(ticketId, { status: newStatus as any })
      handleTicketUpdated(updatedTicket)
    } catch (err) {
      console.error('Failed to update ticket status:', err)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('') // Reset search input state
    setFilters({
      search: '',
      status: '',
      priority: '',
      assignedToMe: false,
      slaBreached: false,
      category: '',
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'InProgress': return 'bg-blue-100 text-blue-800 border-blue-200'
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const hasActiveFilters = () => {
    return filters.search || filters.status || filters.priority || 
           filters.assignedToMe || filters.slaBreached || filters.category
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <div className="h-10 w-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">All Tickets</h1>
                <p className="text-gray-600">
                  Manage and track all support tickets
                  {totalTickets > 0 && ` • ${totalTickets} total tickets`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-600">Real-time Updates</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-gray-600">Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-5 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filters & Search
              </h3>
              <p className="text-sm text-gray-600 mt-1">Refine your ticket search and filtering</p>
            </div>
            {hasActiveFilters() && (
              <button 
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All Filters
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Enhanced Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Tickets</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by title, description, or category..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchInput && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Enhanced Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Enhanced Priority Filter */}  
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Enhanced Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <input
                type="text"
                placeholder="Filter by category..."
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow bg-white"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Enhanced Filter toggles */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.assignedToMe}
                  onChange={(e) => handleFilterChange('assignedToMe', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-blue-800">Assigned to Me</span>
                <svg className="ml-2 h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </label>
              <label className="flex items-center bg-red-50 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.slaBreached}
                  onChange={(e) => handleFilterChange('slaBreached', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-red-800">SLA Breached</span>
                <svg className="ml-2 h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <span className="text-gray-600 font-medium">Loading tickets...</span>
            <span className="text-sm text-gray-500 mt-1">Please wait while we fetch your data</span>
          </div>
        </div>
      )}

      {/* Enhanced Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-red-800">Error Loading Tickets</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadTickets}
                className="mt-3 inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tickets Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Tickets Overview
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found
                  {hasActiveFilters() && ' (filtered)'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  Sorted by {filters.sortBy === 'createdAt' ? 'Created Date' : filters.sortBy} 
                  ({filters.sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Ticket
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
                        <p className="text-gray-500 mb-4 max-w-sm">
                          {hasActiveFilters() ? 'Try adjusting your filters or search terms to find more tickets.' : 'Get started by creating your first support ticket.'}
                        </p>
                        {!hasActiveFilters() && (
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create First Ticket
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
                      onClick={() => handleViewTicket(ticket.id)}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center shadow-sm">
                              <span className="text-xs font-semibold text-gray-700">#{ticket.id.slice(-3)}</span>
                            </div>
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {ticket.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {ticket.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(ticket.status)} shadow-sm`}>
                          {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getPriorityColor(ticket.priority)} shadow-sm`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ticket.category}</div>
                        <div className="text-xs text-gray-500">Category</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {ticket.requester ? `${ticket.requester.firstName?.charAt(0) || ''}${ticket.requester.lastName?.charAt(0) || ''}` : 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.requester ? `${ticket.requester.firstName} ${ticket.requester.lastName}` : 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ticket.requester?.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(ticket.createdAt)}</div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const now = new Date()
                            const created = new Date(ticket.createdAt)
                            const diffMs = now.getTime() - created.getTime()
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            if (diffDays === 0) return 'Today'
                            if (diffDays === 1) return 'Yesterday'
                            return `${diffDays} days ago`
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewTicket(ticket.id)
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          {ticket.status !== 'Resolved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickStatusUpdate(ticket.id, 'Resolved')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tickets.length > 0 && totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, filters.page + 1))}
                    disabled={filters.page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-700">
                      Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalTickets)} of {totalTickets} results
                    </p>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Show:</label>
                      <select
                        value={filters.limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-sm text-gray-700">per page</span>
                    </div>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 7) {
                          pageNum = i + 1
                        } else if (filters.page <= 4) {
                          pageNum = i + 1
                        } else if (filters.page >= totalPages - 3) {
                          pageNum = totalPages - 6 + i
                        } else {
                          pageNum = filters.page - 3 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === filters.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, filters.page + 1))}
                        disabled={filters.page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={isTicketModalOpen}
        ticketId={selectedTicketId}
        onClose={() => {
          setIsTicketModalOpen(false)
          setSelectedTicketId(null)
        }}
        onTicketUpdated={handleTicketUpdated}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  )
}