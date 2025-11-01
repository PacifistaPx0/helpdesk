import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { Dashboard } from './components/Dashboard'
import { AllTicketsPage } from './components/AllTicketsPage'
import { ComputersByOSPage } from './components/ComputersByOSPage'
import { DashboardLayout } from './components/DashboardLayout'
import { authApi, type User } from './services/api'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (token) {
          const userProfile = await authApi.getProfile()
          setUser(userProfile)
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

  const handleLogin = async (email: string, password: string) => {
    try {
      const loginResponse = await authApi.login(email, password)
      setUser(loginResponse.user)
    } catch (error) {
      console.error('Login failed:', error)
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

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          } 
        />
        
        {/* Protected Dashboard Routes */}
        {user ? (
          <Route 
            path="/" 
            element={
              <DashboardLayout 
                user={{
                  name: user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : user.firstName || user.lastName || user.email.split('@')[0],
                  email: user.email,
                  role: user.role
                }} 
                onLogout={handleLogout}
              />
            }
          >
            <Route index element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="tickets" element={<AllTicketsPage />} />
            <Route path="computers" element={<ComputersByOSPage />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  )
}

export default App
