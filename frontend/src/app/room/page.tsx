'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Video, Loader2 } from 'lucide-react'

// Dynamically import LiveKit components to avoid SSR issues
const VideoRoom = dynamic(() => import('@/components/VideoRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
})

export default function RoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

    // Get room parameters
    const roomParam = searchParams.get('room')
    const testMode = searchParams.get('test') === 'true'

    if (!roomParam && !testMode) {
      setError('No room specified')
      setIsLoading(false)
      return
    }

    // Fetch LiveKit token
    fetchRoomToken(roomParam, testMode)
  }, [router, searchParams])

  const fetchRoomToken = async (roomId: string | null, testMode: boolean) => {
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const endpoint = testMode 
        ? '/api/v1/video/test-room' 
        : '/api/v1/video/token'
      
      const body = testMode 
        ? { room_name: roomId || undefined }
        : { session_id: roomId }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to get room token')
      }

      const data = await response.json()
      
      setToken(data.token)
      setServerUrl(data.url)
      setRoomName(data.room_name)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching room token:', err)
      setError('Failed to join room. Please try again.')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-white">Preparing your video session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Join Room</h2>
          <p className="text-neutral-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Room Not Ready</h2>
          <p className="text-neutral-400">Waiting for room configuration...</p>
        </div>
      </div>
    )
  }

  return <VideoRoom token={token} serverUrl={serverUrl} roomName={roomName} />
}