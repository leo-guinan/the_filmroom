'use client'

import { useRouter } from 'next/navigation'
import { Video, Users, Calendar, Settings, ChevronRight, Upload } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const dashboardCards = [
    {
      title: 'Session Recordings',
      description: 'View and manage all your coaching session recordings',
      icon: Video,
      href: '/sessions',
      color: 'bg-blue-600',
      stats: 'Manage recordings'
    },
    {
      title: 'Clients',
      description: 'Manage your client relationships and profiles',
      icon: Users,
      href: '/clients',
      color: 'bg-green-600',
      stats: 'View all clients'
    },
    {
      title: 'Schedule',
      description: 'View your upcoming sessions and calendar',
      icon: Calendar,
      href: '/schedule',
      color: 'bg-purple-600',
      stats: 'Upcoming sessions'
    },
    {
      title: 'Settings',
      description: 'Configure your account and preferences',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-600',
      stats: 'Account settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Coach Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Welcome back! Manage your coaching sessions and clients from one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/sessions')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Upload Recording
            </button>
            <button
              onClick={() => router.push('/sessions')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              View All Sessions
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.href}
                onClick={() => router.push(card.href)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {card.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {card.stats}
                </p>
              </button>
            )
          })}
        </div>

        {/* Recent Activity */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    New recording uploaded
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Session with client - 2 hours ago
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    New client added
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Client profile created - 1 day ago
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Session scheduled
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Upcoming session tomorrow - 3 days ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}