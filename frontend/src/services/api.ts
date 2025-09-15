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

export interface DashboardStats {
  totalTickets: number
  openTickets: number
  assignedToMe: number
  slaBreaches: number
  resolvedToday: number
  averageResolutionTime: number
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
    return this.request<User>('/auth/profile')
  }

  // Ticket methods
  async getTickets(params?: {
    status?: string
    assignedToMe?: boolean
    page?: number
    limit?: number
  }): Promise<{ tickets: Ticket[]; total: number; page: number; limit: number }> {
    const searchParams = new URLSearchParams()
    
    if (params?.status) searchParams.append('status', params.status)
    if (params?.assignedToMe) searchParams.append('assignedToMe', 'true')
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    return this.request<{ tickets: Ticket[]; total: number; page: number; limit: number }>(
      `/tickets${query ? `?${query}` : ''}`
    )
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${id}`)
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
    return this.request<Ticket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats')
  }

  async getRecentTickets(limit: number = 5): Promise<Ticket[]> {
    return this.request<Ticket[]>(`/tickets/recent?limit=${limit}`)
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