import { useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { DashboardLayout } from './components/DashboardLayout'
import { DashboardOverview } from './components/DashboardOverview'
import './App.css'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'Admin' | 'Agent' | 'EndUser'
}

function App() {
  const [user, setUser] = useState<User | null>(null)

  const handleLogin = (email: string, password: string) => {
    // TODO: Connect to backend API
    console.log('Login attempt:', { email, password })
    
    // Mock login for now
    setUser({
      id: '1',
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      role: 'Agent'
    })
  }

  const handleLogout = () => {
    setUser(null)
  }

  const mockStats = {
    totalTickets: 45,
    openTickets: 12,
    assignedToMe: 8,
    slaBreaches: 2
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
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
      <DashboardOverview stats={mockStats} />
    </DashboardLayout>
  )
}

export default App
