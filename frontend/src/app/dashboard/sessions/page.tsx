'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Video, Plus, Users, ChevronRight, AlertCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface Session {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  coach_id: string
  coach_name: string
  client_id: string
  client_name: string
  room_name: string | null
  started_at: string | null
  ended_at: string | null
  actual_duration_minutes: number | null
  created_at: string
  updated_at: string
}

interface SessionListResponse {
  sessions: Session[]
  total: number
  page: number
  per_page: number
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [userRole, setUserRole] = useState<'coach' | 'client'>('client')

  useEffect(() => {
    // Get user role from localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setUserRole(user.role)
    }
    
    fetchSessions()
  }, [filter])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      let endpoint = '/api/v1/sessions/?'
      if (filter === 'upcoming') {
        endpoint += 'upcoming_only=true'
      } else if (filter === 'completed') {
        endpoint += 'status_filter=completed'
      }
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data: SessionListResponse = await response.json()
      setSessions(data.sessions)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const joinSession = (sessionId: string) => {
    router.push(`/session/${sessionId}`)
  }

  const createNewSession = () => {
    router.push('/dashboard/sessions/new')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadge = (status: Session['status']) => {
    const statusStyles = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    const statusLabels = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  const canJoinSession = (session: Session) => {
    const now = new Date()
    const scheduledTime = new Date(session.scheduled_at)
    const fiveMinutesBefore = new Date(scheduledTime.getTime() - 5 * 60000)
    
    return (
      session.status === 'scheduled' && 
      now >= fiveMinutesBefore
    ) || session.status === 'in_progress'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => fetchSessions()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sessions</h1>
        {userRole === 'coach' && (
          <button
            onClick={createNewSession}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Session
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          All Sessions
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No sessions found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'upcoming' 
              ? "You don't have any upcoming sessions scheduled."
              : filter === 'completed'
              ? "You don't have any completed sessions yet."
              : "You don't have any sessions yet."}
          </p>
          {userRole === 'coach' && filter !== 'completed' && (
            <button
              onClick={createNewSession}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Schedule Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{session.title}</h3>
                    {getStatusBadge(session.status)}
                  </div>
                  {session.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {session.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(session.scheduled_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(session.scheduled_at)} ({session.duration_minutes} min)
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {userRole === 'coach' 
                        ? `Client: ${session.client_name}`
                        : `Coach: ${session.coach_name}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canJoinSession(session) && (
                    <button
                      onClick={() => joinSession(session.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Video className="h-5 w-5" />
                      Join Session
                    </button>
                  )}
                  {session.status === 'completed' && (
                    <button
                      onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View Details
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {session.status === 'completed' && session.actual_duration_minutes && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Session duration: {session.actual_duration_minutes} minutes
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}