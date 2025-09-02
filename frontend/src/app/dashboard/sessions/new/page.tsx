'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface Client {
  id: string
  email: string
  full_name: string
}

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is a coach
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.role !== 'coach') {
        router.push('/dashboard/sessions')
        return
      }
    }
    
    fetchClients()
  }, [router])

  const fetchClients = async () => {
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/users/?role=client`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const data = await response.json()
      setClients(data)
    } catch (err) {
      console.error('Error fetching clients:', err)
      // For now, we'll just continue with an empty client list
      setClients([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.title || !formData.client_id || !formData.scheduled_date || !formData.scheduled_time) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      // Combine date and time into ISO string
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`)
      
      const response = await fetch(`${apiUrl}/api/v1/sessions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          client_id: formData.client_id,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: formData.duration_minutes
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to create session')
      }

      // Successfully created, redirect to sessions page
      router.push('/dashboard/sessions')
    } catch (err: any) {
      console.error('Error creating session:', err)
      setError(err.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  // Get tomorrow's date as the minimum date
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Get current time rounded to next hour for default
  const getDefaultTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0)
    return now.toTimeString().slice(0, 5)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Sessions
      </button>

      <h1 className="text-3xl font-bold mb-8">Schedule New Session</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Session Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            placeholder="e.g., Weekly Coaching Session"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            placeholder="Session goals, topics to discuss, etc."
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="client" className="block text-sm font-medium mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Select Client *
          </label>
          <select
            id="client"
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            required
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name} ({client.email})
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              No clients found. Clients need to register first.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date *
            </label>
            <input
              type="date"
              id="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              min={getMinDate()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Time *
            </label>
            <input
              type="time"
              id="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium mb-2">
            Duration (minutes) *
          </label>
          <select
            id="duration"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            required
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}