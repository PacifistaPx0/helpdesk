import { useState, useEffect } from 'react'
import { DashboardOverview } from './DashboardOverview'
import { dashboardApi, type User, type DashboardStats } from '../services/api'

interface DashboardProps {
  user: User
  onLogout: () => Promise<void>
}

export function Dashboard({}: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    assignedToMe: 0,
    slaBreaches: 0,
    resolvedToday: 0,
    averageResolutionTime: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return <DashboardOverview stats={stats} />
}