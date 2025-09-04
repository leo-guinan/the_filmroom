'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Link2, Calendar, Video, Mail, Cloud, 
  Zap, MessageSquare, Check, X, ExternalLink, Settings,
  Loader
} from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'calendar' | 'communication' | 'storage' | 'productivity'
  connected: boolean
  configUrl?: string
  comingSoon?: boolean
}

export default function IntegrationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
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

  const integrations: Integration[] = [
    {
      id: 'cal',
      name: 'Cal.com',
      description: 'Professional scheduling and calendar management',
      icon: Calendar,
      category: 'calendar',
      connected: !!user?.cal_username,
      configUrl: '/dashboard/settings/calendar',
    },
    {
      id: 'livekit',
      name: 'LiveKit',
      description: 'HD video conferencing for coaching sessions',
      icon: Video,
      category: 'communication',
      connected: true, // Always enabled
    },
    {
      id: 'loops',
      name: 'Loops',
      description: 'Email automation and client communication',
      icon: Mail,
      category: 'communication',
      connected: true, // Configured at system level
    },
    {
      id: 's3',
      name: 'AWS S3',
      description: 'Secure cloud storage for session recordings',
      icon: Cloud,
      category: 'storage',
      connected: true, // Configured at system level
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      icon: MessageSquare,
      category: 'communication',
      connected: false,
      comingSoon: true,
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automate workflows with 5000+ apps',
      icon: Zap,
      category: 'productivity',
      connected: false,
      comingSoon: true,
    },
  ]

  const categories = [
    { id: 'calendar', name: 'Calendar & Scheduling', icon: Calendar },
    { id: 'communication', name: 'Communication', icon: MessageSquare },
    { id: 'storage', name: 'Storage & Files', icon: Cloud },
    { id: 'productivity', name: 'Productivity', icon: Zap },
  ]

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
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Coach Feature Only</h2>
          <p className="text-amber-700 dark:text-amber-300">
            Integrations are currently available only for coach accounts.
          </p>
        </div>
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
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Connect your favorite tools and services to enhance your coaching workflow
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Available</p>
              <p className="text-2xl font-bold">{integrations.length}</p>
            </div>
            <Link2 className="h-8 w-8 text-neutral-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Connected</p>
              <p className="text-2xl font-bold text-green-600">
                {integrations.filter(i => i.connected).length}
              </p>
            </div>
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Coming Soon</p>
              <p className="text-2xl font-bold text-amber-600">
                {integrations.filter(i => i.comingSoon).length}
              </p>
            </div>
            <Zap className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Integrations by Category */}
      {categories.map((category) => {
        const categoryIntegrations = integrations.filter(i => i.category === category.id)
        const CategoryIcon = category.icon
        
        if (categoryIntegrations.length === 0) return null
        
        return (
          <div key={category.id} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CategoryIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              <h2 className="text-lg font-semibold">{category.name}</h2>
            </div>
            
            <div className="grid gap-4">
              {categoryIntegrations.map((integration) => {
                const Icon = integration.icon
                
                return (
                  <div
                    key={integration.id}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-lg ${
                          integration.connected 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-neutral-50 dark:bg-neutral-800'
                        }`}>
                          <Icon className={`h-6 w-6 ${
                            integration.connected
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{integration.name}</h3>
                            {integration.connected && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                <Check className="h-3 w-3" />
                                Connected
                              </span>
                            )}
                            {integration.comingSoon && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        {integration.configUrl && !integration.comingSoon ? (
                          <button
                            onClick={() => router.push(integration.configUrl)}
                            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            Configure
                          </button>
                        ) : integration.connected ? (
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Active
                          </div>
                        ) : integration.comingSoon ? (
                          <button
                            disabled
                            className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed"
                          >
                            Not Available
                          </button>
                        ) : (
                          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Connect
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Info for Cal.com */}
                    {integration.id === 'cal' && integration.connected && user?.cal_booking_url && (
                      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Booking URL:
                          </span>
                          <a
                            href={user.cal_booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            {user.cal_booking_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* API Access Section */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">API Access</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Build custom integrations with our API. Perfect for automating workflows or connecting proprietary systems.
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              View API Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}