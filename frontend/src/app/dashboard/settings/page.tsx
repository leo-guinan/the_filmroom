'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Calendar, Bell, Shield, Palette, Globe, 
  CreditCard, Link2, ChevronRight, Settings,
  Check, AlertCircle, Loader
} from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface UserData {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone?: string
  timezone?: string
  bio?: string
  cal_username?: string
  cal_booking_url?: string
}

interface SettingSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  available: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

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
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isCoach = user?.role === 'COACH' || user?.role === 'coach'

  const settingSections: SettingSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information and bio',
      icon: User,
      href: '/dashboard/settings/profile',
      available: true,
    },
    {
      id: 'calendar',
      title: 'Calendar Integration',
      description: 'Connect Cal.com for scheduling',
      icon: Calendar,
      href: '/dashboard/settings/calendar',
      badge: user?.cal_username ? 'Connected' : 'Not Connected',
      available: isCoach,
    },
    {
      id: 'availability',
      title: 'Availability',
      description: 'Set your working hours and availability',
      icon: Globe,
      href: '/dashboard/settings/availability',
      available: isCoach,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Email and notification preferences',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      available: true,
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect external tools and services',
      icon: Link2,
      href: '/dashboard/settings/integrations',
      available: isCoach,
    },
    {
      id: 'billing',
      title: 'Billing & Subscription',
      description: 'Manage your subscription and payment methods',
      icon: CreditCard,
      href: '/dashboard/settings/billing',
      available: true,
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel',
      icon: Palette,
      href: '/dashboard/settings/appearance',
      available: true,
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Password and security settings',
      icon: Shield,
      href: '/dashboard/settings/security',
      available: true,
    },
  ]

  const visibleSections = settingSections.filter(section => section.available)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4">
        {visibleSections.map((section) => {
          const Icon = section.icon
          
          return (
            <button
              key={section.id}
              onClick={() => section.href && router.push(section.href)}
              className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{section.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {section.description}
                    </p>
                    
                    {section.badge && (
                      <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                        section.badge === 'Connected' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}>
                        {section.badge}
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors mt-2" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Quick Stats for Coaches */}
      {isCoach && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
            Integration Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {user?.cal_booking_url ? (
                <>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">Calendar Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-700 dark:text-amber-300">Calendar Not Set Up</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Email Active</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Video Enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}