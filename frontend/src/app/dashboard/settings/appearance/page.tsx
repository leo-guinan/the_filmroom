'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Palette, Sun, Moon, Monitor, Check } from 'lucide-react'

export default function AppearanceSettingsPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    // Get current theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
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
        <h1 className="text-3xl font-bold mb-2">Appearance</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Customize the look and feel of your dashboard
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <h2 className="text-xl font-semibold">Theme</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`relative p-4 rounded-lg border-2 transition-colors ${
              theme === 'light'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            {theme === 'light' && (
              <Check className="absolute top-2 right-2 h-5 w-5 text-blue-600" />
            )}
            <Sun className="h-8 w-8 mb-2 text-amber-500" />
            <h3 className="font-semibold mb-1">Light</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Bright theme for daytime use
            </p>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`relative p-4 rounded-lg border-2 transition-colors ${
              theme === 'dark'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            {theme === 'dark' && (
              <Check className="absolute top-2 right-2 h-5 w-5 text-blue-600" />
            )}
            <Moon className="h-8 w-8 mb-2 text-indigo-500" />
            <h3 className="font-semibold mb-1">Dark</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Easy on the eyes at night
            </p>
          </button>

          <button
            onClick={() => handleThemeChange('system')}
            className={`relative p-4 rounded-lg border-2 transition-colors ${
              theme === 'system'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            {theme === 'system' && (
              <Check className="absolute top-2 right-2 h-5 w-5 text-blue-600" />
            )}
            <Monitor className="h-8 w-8 mb-2 text-neutral-500" />
            <h3 className="font-semibold mb-1">System</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Match your device settings
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}