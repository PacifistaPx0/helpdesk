// API Configuration - read from Vite env with fallback
// Vite exposes env vars starting with VITE_ via import.meta.env
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1/'


// Types for API responses
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'Admin' | 'Agent' | 'EndUser'
  department?: string
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  message: string
  user: User
  tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export class ApiErrorClass extends Error {
  code?: string
  details?: any

  constructor(message: string, code?: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  category: string
  assignedTo?: string
  requesterID: string
  requester?: User
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  slaBreachTime?: string
}

// Backend ticket type (matches Go struct)
interface BackendTicket {
  id: number
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  assigned_to?: number
  requester_id: number
  requester?: BackendUser
  created_at: string
  updated_at: string
  resolved_at?: string
  sla_breach_at?: string
}

// Backend user type (matches Go struct)
interface BackendUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'Admin' | 'Agent' | 'EndUser'
  department?: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalTickets: number
  openTickets: number
  assignedToMe: number
  slaBreaches: number
  resolvedToday: number
  averageResolutionTime: number
}

// Transformation functions to convert between backend and frontend formats
function transformBackendUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id.toString(),
    email: backendUser.email,
    firstName: backendUser.first_name,
    lastName: backendUser.last_name,
    role: backendUser.role,
    department: backendUser.department,
    createdAt: backendUser.created_at,
    updatedAt: backendUser.updated_at
  }
}

function transformBackendTicket(backendTicket: BackendTicket): Ticket {
  const statusMap: Record<string, 'Open' | 'InProgress' | 'Resolved' | 'Closed'> = {
    'open': 'Open',
    'in_progress': 'InProgress', 
    'resolved': 'Resolved',
    'closed': 'Closed'
  }
  
  const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High', 
    'critical': 'Critical'
  }

  return {
    id: backendTicket.id.toString(),
    title: backendTicket.title,
    description: backendTicket.description,
    status: statusMap[backendTicket.status] || 'Open',
    priority: priorityMap[backendTicket.priority] || 'Low',
    category: backendTicket.category,
    assignedTo: backendTicket.assigned_to?.toString(),
    requesterID: backendTicket.requester_id.toString(),
    requester: backendTicket.requester ? transformBackendUser(backendTicket.requester) : undefined,
    createdAt: backendTicket.created_at,
    updatedAt: backendTicket.updated_at,
    resolvedAt: backendTicket.resolved_at,
    slaBreachTime: backendTicket.sla_breach_at
  }
}

// API Client class
class ApiClient {
  private baseURL: string
  private accessToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.loadTokenFromStorage()
  }

  private loadTokenFromStorage() {
    this.accessToken = localStorage.getItem('accessToken')
  }

  private saveTokenToStorage(token: string) {
    this.accessToken = token
    localStorage.setItem('accessToken', token)
  }

  private removeTokenFromStorage() {
    this.accessToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const config: RequestInit = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken()
          if (refreshed) {
            // Retry the original request
            headers['Authorization'] = `Bearer ${this.accessToken}`
            const retryResponse = await fetch(url, { ...config, headers })
            if (retryResponse.ok) {
              return retryResponse.json()
            }
          }
          // If refresh failed, redirect to login
          this.removeTokenFromStorage()
          window.location.href = '/login'
          throw new Error('Authentication failed')
        }

        const errorData = await response.json().catch(() => ({}))
        throw new ApiErrorClass(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof ApiErrorClass) {
        throw error
      }
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Network error occurred'
      )
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    this.saveTokenToStorage(response.tokens.access_token)
    localStorage.setItem('refreshToken', response.tokens.refresh_token)
    
    return response
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        return false
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        this.saveTokenToStorage(data.tokens.access_token)
        if (data.tokens.refresh_token) {
          localStorage.setItem('refreshToken', data.tokens.refresh_token)
        }
        return true
      }
      
      return false
    } catch {
      return false
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      })
    } catch {
      // Continue with logout even if API call fails
    } finally {
      this.removeTokenFromStorage()
    }
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/profile')
  }

  // Ticket methods
  async getTickets(params?: {
    status?: string
    assignedToMe?: boolean
    slaBreached?: boolean
    page?: number
    limit?: number
  }): Promise<{ tickets: Ticket[]; total: number; page: number; limit: number }> {
    const searchParams = new URLSearchParams()
    
    if (params?.status) searchParams.append('status', params.status)
    if (params?.assignedToMe) searchParams.append('assignedToMe', 'true')
    if (params?.slaBreached) searchParams.append('slaBreached', 'true')
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    const response = await this.request<BackendTicket[] | { tickets: BackendTicket[]; total: number; page: number; limit: number }>(
      `/tickets${query ? `?${query}` : ''}`
    )
    
    // Handle both array response and object response formats
    if (Array.isArray(response)) {
      // Backend returns simple array
      return {
        tickets: response.map(transformBackendTicket),
        total: response.length,
        page: 1,
        limit: response.length
      }
    } else {
      // Backend returns structured response
      return {
        ...response,
        tickets: (response.tickets || []).map(transformBackendTicket)
      }
    }
  }

  async getTicket(id: string): Promise<Ticket> {
    const backendTicket = await this.request<BackendTicket>(`/tickets/${id}`)
    return transformBackendTicket(backendTicket)
  }

  async createTicket(ticket: {
    title: string
    description: string
    priority: string
    category: string
  }): Promise<Ticket> {
    return this.request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    })
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    // Transform frontend format to backend format
    const backendUpdates: any = {}
    
    if (updates.title !== undefined) backendUpdates.title = updates.title
    if (updates.description !== undefined) backendUpdates.description = updates.description
    if (updates.category !== undefined) backendUpdates.category = updates.category
    
    // Transform status to backend format
    if (updates.status !== undefined) {
      const statusMap: Record<string, string> = {
        'Open': 'open',
        'InProgress': 'in_progress',
        'Resolved': 'resolved',
        'Closed': 'closed'
      }
      backendUpdates.status = statusMap[updates.status] || updates.status.toLowerCase()
    }
    
    // Transform priority to backend format
    if (updates.priority !== undefined) {
      const priorityMap: Record<string, string> = {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Critical': 'critical'
      }
      backendUpdates.priority = priorityMap[updates.priority] || updates.priority.toLowerCase()
    }

    const backendTicket = await this.request<BackendTicket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendUpdates),
    })
    
    return transformBackendTicket(backendTicket)
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats')
  }

  async getRecentTickets(limit: number = 5): Promise<Ticket[]> {
    const backendTickets = await this.request<BackendTicket[]>(`/tickets/recent?limit=${limit}`)
    return (backendTickets || []).map(transformBackendTicket)
  }
}

// Export a singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Export individual methods for easier importing
export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  logout: () => apiClient.logout(),
  getProfile: () => apiClient.getProfile(),
  refreshToken: () => apiClient.refreshToken(),
}

export const ticketsApi = {
  getTickets: (params?: Parameters<typeof apiClient.getTickets>[0]) => 
    apiClient.getTickets(params),
  getTicket: (id: string) => apiClient.getTicket(id),
  createTicket: (ticket: Parameters<typeof apiClient.createTicket>[0]) => 
    apiClient.createTicket(ticket),
  updateTicket: (id: string, updates: Parameters<typeof apiClient.updateTicket>[1]) => 
    apiClient.updateTicket(id, updates),
  getRecentTickets: (limit?: number) => apiClient.getRecentTickets(limit),
}

export const dashboardApi = {
  getStats: () => apiClient.getDashboardStats(),
  getRecentTickets: (limit?: number) => apiClient.getRecentTickets(limit),
}