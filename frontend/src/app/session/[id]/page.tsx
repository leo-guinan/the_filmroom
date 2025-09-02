'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Video, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

// Dynamically import LiveKit components to avoid SSR issues
const VideoRoom = dynamic(() => import('@/components/VideoRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
})

interface SessionJoinResponse {
  session_id: string
  room_name: string
  token: string
  url: string
}

export default function SessionRoomPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  
  const [token, setToken] = useState<string>('')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [roomName, setRoomName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) {
      router.push('/login')
      return
    }

    // Join the session
    joinSession()
  }, [sessionId, router])

  const joinSession = async () => {
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      console.log('Joining session:', sessionId)
      
      const response = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      if (response.status === 401) {
        console.error('Authentication failed')
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setError('Session expired. Please log in again.')
        router.push('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to join session:', response.status, errorData)
        throw new Error(errorData.detail || `Failed to join session (${response.status})`)
      }

      const data: SessionJoinResponse = await response.json()
      console.log('Session join response:', data)
      
      setToken(data.token)
      setServerUrl(data.url)
      setRoomName(data.room_name)
    } catch (err: any) {
      console.error('Error joining session:', err)
      setError(err.message || 'Failed to join session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveSession = () => {
    router.push('/dashboard/sessions')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Joining session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Join Session</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => joinSession()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/dashboard/sessions')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Session Not Ready</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The session is being prepared. Please wait a moment.
        </p>
        <button
          onClick={() => joinSession()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={handleLeaveSession}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Leave Session
        </button>
      </div>
      
      <VideoRoom token={token} serverUrl={serverUrl} roomName={roomName} />
    </div>
  )
}