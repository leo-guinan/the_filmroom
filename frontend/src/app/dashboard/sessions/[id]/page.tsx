'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Calendar, Clock, Video, Users, ArrowLeft, Download, Loader, Check, X } from 'lucide-react'
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
  recording_url: string | null
  recording_status: string | null
  recording_duration_seconds: number | null
  created_at: string
  updated_at: string
}

interface RecordingInfo {
  status: string
  recording_url?: string
  duration_seconds?: number
  size_bytes?: number
  message?: string
}

export default function SessionDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [recordingInfo, setRecordingInfo] = useState<RecordingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails()
    }
  }, [sessionId])

  const fetchSessionDetails = async () => {
    try {
      setLoading(true)
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      // Fetch session details
      const response = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch session details')
      }

      const sessionData: Session = await response.json()
      setSession(sessionData)

      // If session is completed, try to get recording info
      if (sessionData.status === 'completed' || sessionData.recording_status) {
        try {
          const recordingResponse = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}/recording`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          if (recordingResponse.ok) {
            const recordingData = await recordingResponse.json()
            setRecordingInfo(recordingData)
          }
        } catch (err) {
          console.error('Error fetching recording info:', err)
        }
      }
    } catch (err) {
      console.error('Error fetching session:', err)
      setError('Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-5 w-5" />
      case 'in_progress':
        return <Video className="h-5 w-5" />
      case 'completed':
        return <Check className="h-5 w-5" />
      case 'cancelled':
        return <X className="h-5 w-5" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
      case 'in_progress':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
      case 'completed':
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
      case 'cancelled':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400">{error || 'Session not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Sessions
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{session.title}</h1>
              {session.description && (
                <p className="text-gray-600 dark:text-gray-400">{session.description}</p>
              )}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusColor(session.status)}`}>
              {getStatusIcon(session.status)}
              <span className="font-medium capitalize">{session.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Session Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(session.scheduled_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{formatTime(session.scheduled_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Duration: {session.duration_minutes} minutes</span>
              </div>
              {session.actual_duration_minutes && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Actual: {session.actual_duration_minutes} minutes</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Participants</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>Coach: {session.coach_name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>Client: {session.client_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Section */}
        {(session.recording_status || recordingInfo) && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Session Recording</h3>
            
            {recordingInfo?.status === 'completed' && recordingInfo.recording_url ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                      Recording Available
                    </p>
                    <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                      {recordingInfo.duration_seconds && (
                        <p>Duration: {formatDuration(recordingInfo.duration_seconds)}</p>
                      )}
                      {recordingInfo.size_bytes && (
                        <p>Size: {formatFileSize(recordingInfo.size_bytes)}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={recordingInfo.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Download
                  </a>
                </div>
              </div>
            ) : recordingInfo?.status === 'recording' || session.recording_status === 'recording' ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-spin" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Recording in Progress
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      The recording will be available after the session ends.
                    </p>
                  </div>
                </div>
              </div>
            ) : recordingInfo?.status === 'pending' || session.recording_status === 'pending' ? (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Recording will begin when the session starts.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400">
                  No recording available for this session.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Created {new Date(session.created_at).toLocaleDateString()}
            </div>
            {session.status === 'scheduled' && new Date(session.scheduled_at) > new Date() && (
              <button
                onClick={() => router.push(`/session/${session.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Video className="h-5 w-5" />
                Join Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}