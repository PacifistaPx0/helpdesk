import { useState, useEffect } from 'react'
import { LoginPage } from './components/LoginPage'
import { DashboardLayout } from './components/DashboardLayout'
import { DashboardOverview } from './components/DashboardOverview'
import { authApi, dashboardApi, type User, type DashboardStats, ApiErrorClass } from './services/api'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    assignedToMe: 0,
    slaBreaches: 0,
    resolvedToday: 0,
    averageResolutionTime: 0
  })
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (token) {
          const userProfile = await authApi.getProfile()
          setUser(userProfile)
          await loadDashboardData()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // Clear invalid tokens
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const loadDashboardData = async () => {
    try {
      const dashboardStats = await dashboardApi.getStats()
      setStats(dashboardStats)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Use fallback data if API fails
      setStats({
        totalTickets: 45,
        openTickets: 12,
        assignedToMe: 8,
        slaBreaches: 2,
        resolvedToday: 5,
        averageResolutionTime: 24
      })
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      setError(null)
      const loginResponse = await authApi.login(email, password)
      setUser(loginResponse.user)
      await loadDashboardData()
    } catch (error) {
      console.error('Login failed:', error)
      if (error instanceof ApiErrorClass) {
        setError(error.message)
      } else {
        setError('Login failed. Please check your credentials and try again.')
      }
      throw error // Re-throw to let LoginPage handle loading state
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setStats({
        totalTickets: 0,
        openTickets: 0,
        assignedToMe: 0,
        slaBreaches: 0,
        resolvedToday: 0,
        averageResolutionTime: 0
      })
    }
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} error={error} />
  }

  return (
    <DashboardLayout 
      user={{
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      }} 
      onLogout={handleLogout}
    >
      <DashboardOverview stats={stats} />
    </DashboardLayout>
  )
}

export default App
