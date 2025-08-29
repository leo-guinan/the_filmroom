'use client'

import { useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface VideoRoomProps {
  token: string
  serverUrl: string
  roomName: string
}

export default function VideoRoom({ token, serverUrl, roomName }: VideoRoomProps) {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)

  const handleDisconnect = () => {
    router.push('/dashboard')
  }

  // Ensure we have the proper WebSocket URL format
  const wsUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://') 
    ? serverUrl 
    : `wss://${serverUrl}`

  return (
    <div className="h-screen bg-neutral-950 relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={wsUrl}
        onConnected={() => setIsConnected(true)}
        onDisconnected={handleDisconnect}
        data-lk-theme="default"
        className="h-full"
      >
        {/* Room Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="text-white">
              <h1 className="text-lg font-semibold">The Film Room</h1>
              <p className="text-sm text-neutral-400">Room: {roomName}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
            >
              <LogOut className="h-4 w-4" />
              Leave Session
            </button>
          </div>
        </div>

        {/* Video Conference Component - includes video grid and controls */}
        <VideoConference />
        
        {/* Audio renderer for voice chat */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}