'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Clock, Calendar, Globe, 
  Plus, X, Loader, Check, AlertCircle
} from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface TimeSlot {
  start: string
  end: string
}

interface DaySchedule {
  enabled: boolean
  slots: TimeSlot[]
}

interface AvailabilitySettings {
  timezone: string
  schedule: {
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
  }
  session_duration: number
  buffer_time: number
  advance_booking_days: number
  minimum_notice_hours: number
}

const DEFAULT_SLOT: TimeSlot = {
  start: '09:00',
  end: '17:00',
}

const DEFAULT_DAY: DaySchedule = {
  enabled: false,
  slots: [DEFAULT_SLOT],
}

export default function AvailabilitySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [settings, setSettings] = useState<AvailabilitySettings>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    schedule: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: false, slots: [{ start: '09:00', end: '12:00' }] },
      sunday: { enabled: false, slots: [{ start: '09:00', end: '12:00' }] },
    },
    session_duration: 60,
    buffer_time: 15,
    advance_booking_days: 30,
    minimum_notice_hours: 24,
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data)
        if (data.timezone) {
          setSettings(prev => ({ ...prev, timezone: data.timezone }))
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      // For now, just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: keyof typeof settings.schedule) => {
    setSettings({
      ...settings,
      schedule: {
        ...settings.schedule,
        [day]: {
          ...settings.schedule[day],
          enabled: !settings.schedule[day].enabled,
        },
      },
    })
  }

  const updateTimeSlot = (
    day: keyof typeof settings.schedule,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const newSlots = [...settings.schedule[day].slots]
    newSlots[slotIndex] = {
      ...newSlots[slotIndex],
      [field]: value,
    }

    setSettings({
      ...settings,
      schedule: {
        ...settings.schedule,
        [day]: {
          ...settings.schedule[day],
          slots: newSlots,
        },
      },
    })
  }

  const addTimeSlot = (day: keyof typeof settings.schedule) => {
    setSettings({
      ...settings,
      schedule: {
        ...settings.schedule,
        [day]: {
          ...settings.schedule[day],
          slots: [...settings.schedule[day].slots, DEFAULT_SLOT],
        },
      },
    })
  }

  const removeTimeSlot = (day: keyof typeof settings.schedule, slotIndex: number) => {
    if (settings.schedule[day].slots.length <= 1) return

    setSettings({
      ...settings,
      schedule: {
        ...settings.schedule,
        [day]: {
          ...settings.schedule[day],
          slots: settings.schedule[day].slots.filter((_, i) => i !== slotIndex),
        },
      },
    })
  }

  const isCoach = user?.role === 'COACH' || user?.role === 'coach'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isCoach) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Settings
        </button>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Coach Feature Only</h2>
          <p className="text-amber-700 dark:text-amber-300">
            Availability settings are only available for coach accounts.
          </p>
        </div>
      </div>
    )
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ] as const

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Settings
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Availability Settings</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Set your working hours and booking preferences
        </p>
      </div>

      {!user?.cal_username && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Calendar Not Connected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Connect your Cal.com calendar in Calendar Settings to sync availability.
              </p>
              <button
                onClick={() => router.push('/dashboard/settings/calendar')}
                className="mt-2 text-sm text-amber-600 dark:text-amber-400 underline hover:text-amber-700 dark:hover:text-amber-300"
              >
                Go to Calendar Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Weekly Schedule */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold">Weekly Schedule</h2>
          </div>

          <div className="space-y-4">
            {days.map(({ key, label }) => (
              <div key={key} className="border-b border-neutral-200 dark:border-neutral-700 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.schedule[key].enabled}
                      onChange={() => toggleDay(key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium">{label}</span>
                  </label>

                  {settings.schedule[key].enabled && settings.schedule[key].slots.length < 3 && (
                    <button
                      type="button"
                      onClick={() => addTimeSlot(key)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add time slot
                    </button>
                  )}
                </div>

                {settings.schedule[key].enabled && (
                  <div className="ml-8 space-y-2">
                    {settings.schedule[key].slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                          className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                        />
                        <span className="text-neutral-500">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                          className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                        />
                        {settings.schedule[key].slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(key, index)}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Booking Rules */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold">Booking Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="session_duration" className="block text-sm font-medium mb-2">
                Default Session Duration
              </label>
              <select
                id="session_duration"
                value={settings.session_duration}
                onChange={(e) => setSettings({
                  ...settings,
                  session_duration: parseInt(e.target.value),
                })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label htmlFor="buffer_time" className="block text-sm font-medium mb-2">
                Buffer Between Sessions
              </label>
              <select
                id="buffer_time"
                value={settings.buffer_time}
                onChange={(e) => setSettings({
                  ...settings,
                  buffer_time: parseInt(e.target.value),
                })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div>
              <label htmlFor="advance_booking" className="block text-sm font-medium mb-2">
                How Far in Advance
              </label>
              <select
                id="advance_booking"
                value={settings.advance_booking_days}
                onChange={(e) => setSettings({
                  ...settings,
                  advance_booking_days: parseInt(e.target.value),
                })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
            </div>

            <div>
              <label htmlFor="minimum_notice" className="block text-sm font-medium mb-2">
                Minimum Notice Required
              </label>
              <select
                id="minimum_notice"
                value={settings.minimum_notice_hours}
                onChange={(e) => setSettings({
                  ...settings,
                  minimum_notice_hours: parseInt(e.target.value),
                })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value={1}>1 hour</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>1 day</option>
                <option value={48}>2 days</option>
                <option value={72}>3 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold">Timezone</h2>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium mb-2">
              Display times in
            </label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Phoenix">Arizona Time</option>
              <option value="Europe/London">London Time</option>
              <option value="Europe/Paris">Paris Time</option>
              <option value="Europe/Berlin">Berlin Time</option>
              <option value="Asia/Tokyo">Tokyo Time</option>
              <option value="Asia/Shanghai">Shanghai Time</option>
              <option value="Australia/Sydney">Sydney Time</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              This timezone will be used for all scheduling displays
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-5 w-5" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Availability
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}