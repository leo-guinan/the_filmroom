'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video, Calendar, Users, FileText, Settings, LogOut, Plus, VideoIcon, Home } from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-2 p-6 border-b border-neutral-200 dark:border-neutral-800">
          <Video className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">The Film Room</span>
        </div>
        
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/sessions" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Calendar className="h-5 w-5" />
            <span>Sessions</span>
          </Link>
          <Link href="/dashboard/clients" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Users className="h-5 w-5" />
            <span>Clients</span>
          </Link>
          <Link href="/dashboard/reports" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <FileText className="h-5 w-5" />
            <span>Reports</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 w-full px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {user.first_name}!
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                {user.role === 'COACH' ? 'Manage your coaching sessions' : 'View your upcoming sessions'}
              </p>
            </div>
            <div className="flex gap-3">
              {user.role === 'COACH' && (
                <Link 
                  href="/dashboard/sessions/new"
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>New Session</span>
                </Link>
              )}
              <Link 
                href="/room?test=true"
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                <VideoIcon className="h-5 w-5" />
                <span>Test Video</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">0</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">Upcoming Sessions</p>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">0</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">
                {user.role === 'COACH' ? 'Active Clients' : 'Sessions Completed'}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
                <span className="text-2xl font-bold">0</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">Session Reports</p>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold">Recent Sessions</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-neutral-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                <p>No sessions yet</p>
                <p className="text-sm mt-2">
                  {user.role === 'COACH' 
                    ? 'Schedule your first session to get started'
                    : 'Your upcoming sessions will appear here'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}