'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, ExternalLink, AlertCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface CalendarBookingProps {
  coachId: string
  coachName?: string
  embedded?: boolean
}

export default function CalendarBooking({ coachId, coachName, embedded = false }: CalendarBookingProps) {
  const [bookingUrl, setBookingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timezone, setTimezone] = useState('America/New_York')

  useEffect(() => {
    fetchBookingUrl()
  }, [coachId])

  const fetchBookingUrl = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const accessToken = localStorage.getItem('access_token')
      
      const response = await fetch(`${apiUrl}/api/v1/calendar/booking-url/${coachId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBookingUrl(data.booking_url)
        setTimezone(data.timezone || 'America/New_York')
      } else if (response.status === 400) {
        setError('This coach has not set up their calendar yet.')
      } else {
        setError('Failed to load booking information')
      }
    } catch (err) {
      console.error('Error fetching booking URL:', err)
      setError('Failed to load booking information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">Calendar Not Available</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (embedded && bookingUrl) {
    // Embedded Cal.com iframe
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Schedule with {coachName || 'Coach'}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Select a time that works for you
          </p>
        </div>
        
        <div className="relative w-full" style={{ height: '600px' }}>
          <iframe
            src={`${bookingUrl}?embed=true&theme=auto&hideEventTypeDetails=true`}
            width="100%"
            height="100%"
            frameBorder="0"
            className="absolute inset-0"
          />
        </div>
      </div>
    )
  }

  // Link to external booking page
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Schedule a Session
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Book a coaching session with {coachName || 'your coach'}
          </p>
          
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <Clock className="h-4 w-4" />
              <span>60-minute sessions</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <Calendar className="h-4 w-4" />
              <span>Timezone: {timezone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <a
          href={bookingUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-5 w-5" />
          Open Calendar
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}