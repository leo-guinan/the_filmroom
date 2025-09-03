'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Check, AlertCircle, ExternalLink, Copy } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

export default function CalendarSettingsPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [bookingUrl, setBookingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      
      // Check if not a coach
      if (parsed.role !== 'COACH' && parsed.role !== 'coach') {
        router.push('/dashboard')
      }
    }
    
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(userTimezone)
  }, [router])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      const accessToken = localStorage.getItem('access_token')
      
      const response = await fetch(`${apiUrl}/api/v1/calendar/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          timezone
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setBookingUrl(data.booking_url)
        setSuccess(true)
      } else {
        setError(data.message || 'Failed to set up calendar integration')
      }
    } catch (err) {
      console.error('Setup error:', err)
      setError('Failed to set up calendar integration')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!user || (user.role !== 'COACH' && user.role !== 'coach')) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calendar Integration</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Set up Cal.com to allow clients to book sessions with you
        </p>
      </div>

      {!bookingUrl ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Connect Your Calendar</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              This will create a Cal.com account where clients can book sessions with you.
            </p>
          </div>

          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Choose Your Booking URL Username
              </label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">cal.com/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  placeholder="your-name"
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Your Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Phoenix">Arizona Time</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEDT)</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5" />
                  Set Up Calendar
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Calendar Integration Complete!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your clients can now book sessions with you.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Your Booking URL</h2>
            
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <code className="text-sm text-blue-600 dark:text-blue-400 break-all">
                  {bookingUrl}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="ml-4 p-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-neutral-600 dark:text-neutral-400">
                Share this link with clients so they can book sessions with you.
              </p>
              
              <div className="flex gap-3">
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Booking Page
                </a>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold mb-3">Next Steps</h3>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Visit Cal.com to customize your availability and booking settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Connect your Google or Outlook calendar for automatic conflict detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Share your booking link with clients or add it to your email signature</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}