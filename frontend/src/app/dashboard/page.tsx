'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Users, FileText, Plus, VideoIcon, TrendingUp, Clock } from 'lucide-react'

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

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  if (!user) {
    return null
  }

  const isCoach = user.role === 'COACH'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {isCoach ? 'Manage your coaching sessions and clients' : 'View your upcoming sessions and progress'}
        </p>
        
        {/* Debug info - remove this after fixing */}
        <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
          <p className="text-sm font-mono">
            Debug: Your role is "{user.role}" (isCoach = {isCoach ? 'true' : 'false'})
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            If this shows CLIENT but you registered as a coach, try logging out and back in.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        {isCoach && (
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
            {isCoach ? 'Active Clients' : 'Sessions Completed'}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">Total Hours</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Sessions</h2>
              <Link href="/dashboard/sessions" className="text-blue-600 hover:text-blue-700 text-sm">
                View all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-neutral-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
              <p>No sessions yet</p>
              <p className="text-sm mt-2">
                {isCoach 
                  ? 'Schedule your first session to get started'
                  : 'Your upcoming sessions will appear here'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats or Clients */}
        {isCoach ? (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Clients</h2>
                <Link href="/dashboard/clients" className="text-blue-600 hover:text-blue-700 text-sm">
                  View all →
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-neutral-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                <p>No clients yet</p>
                <p className="text-sm mt-2">
                  Invite clients to start coaching
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold">Your Progress</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-neutral-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                <p>No data yet</p>
                <p className="text-sm mt-2">
                  Complete sessions to track your progress
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}