import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketsApi, type Ticket } from '../services/api'
import { TicketDetailModal } from './TicketDetailModal'
import { CreateTicketModal } from './CreateTicketModal'

interface DashboardOverviewProps {
  stats: {
    totalTickets: number
    openTickets: number
    assignedToMe: number
    slaBreaches: number
    resolvedToday?: number
    averageResolutionTime?: number
  }
}

// Add ticket filter state type
interface TicketFilter {
  status?: 'Open' | 'InProgress' | 'Resolved' | 'Closed'
  assignedToMe?: boolean
  slaBreached?: boolean
  limit?: number
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  const navigate = useNavigate()
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>({ limit: 5 })
  
  // Modal state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Dropdown state for each ticket
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    const loadRecentTickets = async () => {
      setLoadingTickets(true)
      try {
        // Use ticketsApi.getTickets with filter parameters instead of getRecentTickets
        const response = await ticketsApi.getTickets({
          status: ticketFilter.status,
          assignedToMe: ticketFilter.assignedToMe,
          slaBreached: ticketFilter.slaBreached,
          page: 1,
          limit: ticketFilter.limit || 5
        })
        setRecentTickets(response.tickets)
      } catch (error) {
        console.error('Failed to load tickets:', error)
      } finally {
        setLoadingTickets(false)
      }
    }

    loadRecentTickets()
  }, [ticketFilter]) // Re-run when filter changes

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'InProgress': 
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Resolved': return 'bg-green-50 text-green-700 border border-green-200'
      case 'Closed': return 'bg-gray-100 text-gray-600 border border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-purple-100 text-purple-800'
      case 'High': return 'bg-gray-100 text-gray-700 border border-gray-300'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-700 border border-gray-300'
    }
  }

  // Dashboard card click handlers
  const handleViewAll = () => {
    setTicketFilter({ limit: 10 }) // Show more tickets, all statuses
  }

  const handleViewOpen = () => {
    setTicketFilter({ status: 'Open', limit: 5 })
  }

  const handleViewAssignedToMe = () => {
    setTicketFilter({ assignedToMe: true, limit: 5 })
  }

  const handleViewBreaches = () => {
    setTicketFilter({ slaBreached: true, limit: 5 })
  }

  const handleViewAllTickets = () => {
    navigate('/tickets')
  }

  const resetFilter = () => {
    setTicketFilter({ limit: 5 })
  }

  // Ticket action handlers
  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setIsTicketModalOpen(true)
    setOpenDropdown(null)
  }

  const handleTicketRowClick = (ticketId: string) => {
    handleViewTicket(ticketId)
  }

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    // Update the ticket in the list
    setRecentTickets(tickets => 
      tickets.map(ticket => 
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    )
  }

  const handleTicketCreated = (newTicket: Ticket) => {
    // Add new ticket to the beginning of the recent tickets list
    setRecentTickets(prevTickets => [newTicket, ...prevTickets.slice(0, 4)]) // Keep only 5 tickets
  }

  const handleQuickStatusUpdate = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const updatedTicket = await ticketsApi.updateTicket(ticketId, { status: newStatus })
      handleTicketUpdated(updatedTicket)
      setOpenDropdown(null)
    } catch (error) {
      console.error('Failed to update ticket status:', error)
    }
  }

  const toggleDropdown = (ticketId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setOpenDropdown(openDropdown === ticketId ? null : ticketId)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="space-y-8">
      {/* Enhanced Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600 mb-4">Here's what's happening in your help desk today.</p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-600">System Operational</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-gray-500/25 transition-shadow">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate mb-1">Total Tickets</dt>
                  <dd className="flex items-baseline">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalTickets}</div>
                    <div className="ml-3 flex items-center text-sm">
                      <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-xs">+12%</span>
                      </div>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-100">
            <button 
              onClick={handleViewAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center group"
            >
              View all tickets
              <svg className="ml-1 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-400/25 transition-shadow">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Tickets</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.openTickets}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-yellow-600">
                      <svg className="h-4 w-4 flex-shrink-0 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      8%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button 
                onClick={handleViewOpen}
                className="font-medium text-primary-600 hover:text-primary-900 focus:outline-none focus:underline"
              >
                View open
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-green-400/25 transition-shadow">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Assigned to Me</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.assignedToMe}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <svg className="h-4 w-4 flex-shrink-0 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Decreased by</span>
                      3%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button 
                onClick={handleViewAssignedToMe}
                className="font-medium text-primary-600 hover:text-primary-900 focus:outline-none focus:underline"
              >
                View mine
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-red-400/25 transition-shadow">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate mb-1">Open Tickets</dt>
                  <dd className="flex items-baseline">
                    <div className="text-3xl font-bold text-gray-900">{stats.openTickets}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      5%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button 
                onClick={handleViewBreaches}
                className="font-medium text-red-600 hover:text-red-900 focus:outline-none focus:underline"
              >
                View breaches
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Recent Tickets */}
      <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-200">
        <div className="px-6 py-6 sm:px-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl leading-6 font-semibold text-gray-900 flex items-center">
                <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
                </svg>
                Recent Tickets
                {ticketFilter.status && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {ticketFilter.status}
                  </span>
                )}
                {ticketFilter.assignedToMe && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Assigned to Me
                  </span>
                )}
                {ticketFilter.slaBreached && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    SLA Breached
                  </span>
                )}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">Latest ticket activity and updates</p>
            </div>
            <div className="flex space-x-2">
              {(ticketFilter.status || ticketFilter.assignedToMe || ticketFilter.slaBreached) && (
                <button 
                  onClick={resetFilter}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filter
                </button>
              )}
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filter
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {loadingTickets ? (
            <li className="px-4 py-8 sm:px-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-gray-500">Loading tickets...</span>
              </div>
            </li>
          ) : recentTickets.length === 0 ? (
            <li className="px-4 py-8 sm:px-6">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m6-6v6m0 0v6m0-6h6m-6 0H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new ticket.</p>
              </div>
            </li>
          ) : (
            recentTickets.map((ticket, index) => (
              <li key={ticket.id} className="px-6 py-5 sm:px-8 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer relative group border-l-4 border-transparent hover:border-blue-500">
                <div 
                  className="flex items-center justify-between"
                  onClick={() => handleTicketRowClick(ticket.id)}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <span className="text-sm font-semibold text-gray-700">#{ticket.id.slice(-3)}</span>
                      </div>
                    </div>
                    <div className="ml-5 min-w-0 flex-1">
                      <div className="flex items-center mb-1">
                        <p className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{ticket.title}</p>
                        {ticket.priority === 'High' && (
                          <div className="ml-2 flex items-center px-2 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded-full">
                            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium">High</span>
                          </div>
                        )}
                        {ticket.priority === 'Critical' && (
                          <div className="ml-2 flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium">Critical</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <p className="text-sm text-gray-500">
                          {ticket.requester ? `${ticket.requester.firstName} ${ticket.requester.lastName}` : 'Unknown'} • 
                          {ticket.requester?.department || 'No Department'}
                        </p>
                        <span className="mx-2 text-gray-300">•</span>
                        <p className="text-sm text-gray-500">{formatTimeAgo(ticket.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    
                    {/* Dropdown Menu */}
                    <div className="relative">
                      <button 
                        onClick={(e) => toggleDropdown(ticket.id, e)}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdown === ticket.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewTicket(ticket.id)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </button>
                            
                            {ticket.status !== 'InProgress' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleQuickStatusUpdate(ticket.id, 'InProgress')
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Mark In Progress
                              </button>
                            )}
                            
                            {ticket.status !== 'Resolved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleQuickStatusUpdate(ticket.id, 'Resolved')
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Mark Resolved
                              </button>
                            )}
                            
                            <div className="border-t border-gray-100"></div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewTicket(ticket.id)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {recentTickets.length} of {stats.totalTickets} tickets
              {ticketFilter.status && ` (${ticketFilter.status})`}
              {ticketFilter.assignedToMe && ` (Assigned to Me)`}
              {ticketFilter.slaBreached && ` (SLA Breached)`}
            </div>
            <button 
              onClick={handleViewAllTickets}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
            >
              View all tickets →
            </button>
          </div>
        </div>
      </div>

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