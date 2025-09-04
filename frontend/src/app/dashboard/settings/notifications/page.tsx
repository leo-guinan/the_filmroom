'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Bell, Mail, MessageSquare, 
  Calendar, Video, FileText, Loader, Check, 
  BellOff, Smartphone, Monitor
} from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface NotificationSettings {
  email_notifications: {
    session_reminders: boolean
    session_confirmations: boolean
    session_cancellations: boolean
    new_messages: boolean
    weekly_summary: boolean
    client_invitations: boolean
    recording_ready: boolean
  }
  push_notifications: {
    enabled: boolean
    session_reminders: boolean
    new_messages: boolean
  }
  notification_timing: {
    session_reminder_hours: number
    daily_summary_time: string
  }
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: {
      session_reminders: true,
      session_confirmations: true,
      session_cancellations: true,
      new_messages: true,
      weekly_summary: true,
      client_invitations: true,
      recording_ready: true,
    },
    push_notifications: {
      enabled: false,
      session_reminders: true,
      new_messages: true,
    },
    notification_timing: {
      session_reminder_hours: 24,
      daily_summary_time: '09:00',
    },
  })

  useEffect(() => {
    fetchUserData()
    // In the future, fetch actual notification settings
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

  const isCoach = user?.role === 'COACH' || user?.role === 'coach'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

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
        <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Choose how and when you want to be notified about important events
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="font-medium">Session Reminders</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Get reminded about upcoming sessions
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications.session_reminders}
                onChange={(e) => setSettings({
                  ...settings,
                  email_notifications: {
                    ...settings.email_notifications,
                    session_reminders: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="font-medium">Session Confirmations</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Confirmation when sessions are booked
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications.session_confirmations}
                onChange={(e) => setSettings({
                  ...settings,
                  email_notifications: {
                    ...settings.email_notifications,
                    session_confirmations: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="font-medium">Cancellations</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Alerts when sessions are cancelled
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications.session_cancellations}
                onChange={(e) => setSettings({
                  ...settings,
                  email_notifications: {
                    ...settings.email_notifications,
                    session_cancellations: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {isCoach && (
              <>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-neutral-500" />
                    <div>
                      <p className="font-medium">Client Invitations</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Notifications about invitation status
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications.client_invitations}
                    onChange={(e) => setSettings({
                      ...settings,
                      email_notifications: {
                        ...settings.email_notifications,
                        client_invitations: e.target.checked,
                      },
                    })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-neutral-500" />
                    <div>
                      <p className="font-medium">Weekly Summary</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Weekly overview of your coaching activity
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications.weekly_summary}
                    onChange={(e) => setSettings({
                      ...settings,
                      email_notifications: {
                        ...settings.email_notifications,
                        weekly_summary: e.target.checked,
                      },
                    })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </>
            )}

            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="font-medium">Recording Ready</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    When session recordings are processed
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications.recording_ready}
                onChange={(e) => setSettings({
                  ...settings,
                  email_notifications: {
                    ...settings.email_notifications,
                    recording_ready: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Notification Timing */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold">Notification Timing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="reminder_hours" className="block text-sm font-medium mb-2">
                Session Reminder Time
              </label>
              <select
                id="reminder_hours"
                value={settings.notification_timing.session_reminder_hours}
                onChange={(e) => setSettings({
                  ...settings,
                  notification_timing: {
                    ...settings.notification_timing,
                    session_reminder_hours: parseInt(e.target.value),
                  },
                })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value={1}>1 hour before</option>
                <option value={2}>2 hours before</option>
                <option value={4}>4 hours before</option>
                <option value={24}>1 day before</option>
                <option value={48}>2 days before</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                How early to send session reminders
              </p>
            </div>

            {isCoach && (
              <div>
                <label htmlFor="summary_time" className="block text-sm font-medium mb-2">
                  Daily Summary Time
                </label>
                <input
                  type="time"
                  id="summary_time"
                  value={settings.notification_timing.daily_summary_time}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_timing: {
                      ...settings.notification_timing,
                      daily_summary_time: e.target.value,
                    },
                  })}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  When to receive daily activity summaries
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Push Notifications (Coming Soon) */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 opacity-75">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              <h2 className="text-xl font-semibold">Push Notifications</h2>
            </div>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Get instant notifications on your mobile device. This feature will be available soon.
          </p>
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
                Save Preferences
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}