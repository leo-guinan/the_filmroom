'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Video, ChevronRight } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import CalendarBooking from '@/components/CalendarBooking'

interface Coach {
  id: string
  name: string
  email: string
  profile_image_url?: string
  bio?: string
  cal_booking_url?: string
}

export default function SchedulePage() {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEmbedded, setShowEmbedded] = useState(false)

  useEffect(() => {
    fetchCoachData()
  }, [])

  const fetchCoachData = async () => {
    try {
      const apiUrl = getApiUrl()
      const accessToken = localStorage.getItem('access_token')
      
      // First get the current user to find their coach relationship
      const userResponse = await fetch(`${apiUrl}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        
        // Get the coach information
        if (userData.coach_id) {
          const coachResponse = await fetch(`${apiUrl}/api/v1/users/${userData.coach_id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })

          if (coachResponse.ok) {
            const coachData = await coachResponse.json()
            setCoach(coachData)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching coach data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">No Coach Assigned</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            You don't have a coach assigned yet. Please contact support or wait for a coach invitation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Schedule a Session</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Book your next coaching session with {coach.name}
        </p>
      </div>

      {/* Coach Info Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          {coach.profile_image_url ? (
            <img 
              src={coach.profile_image_url} 
              alt={coach.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {coach.name.charAt(0)}
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{coach.name}</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">{coach.email}</p>
            {coach.bio && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{coach.bio}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Clock className="h-4 w-4" />
            <span>60-minute sessions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Video className="h-4 w-4" />
            <span>HD Video Coaching</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Calendar className="h-4 w-4" />
            <span>Flexible scheduling</span>
          </div>
        </div>
      </div>

      {/* Booking Options */}
      {coach.cal_booking_url ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Choose Booking Method</h3>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowEmbedded(false)}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  !showEmbedded 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400'
                }`}
              >
                <div className="font-semibold mb-1">External Calendar</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Open calendar in a new tab
                </div>
              </button>
              
              <button
                onClick={() => setShowEmbedded(true)}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  showEmbedded 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400'
                }`}
              >
                <div className="font-semibold mb-1">Embedded Calendar</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Book directly on this page
                </div>
              </button>
            </div>
          </div>

          {/* Calendar Booking Component */}
          <CalendarBooking 
            coachId={coach.id} 
            coachName={coach.name}
            embedded={showEmbedded}
          />
        </div>
      ) : (
        <CalendarBooking 
          coachId={coach.id} 
          coachName={coach.name}
        />
      )}

      {/* Upcoming Sessions */}
      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4">Your Upcoming Sessions</h3>
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6">
          <p className="text-neutral-600 dark:text-neutral-400">
            Your scheduled sessions will appear here after booking.
          </p>
        </div>
      </div>
    </div>
  )
}