'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Package, AlertCircle } from 'lucide-react'

export default function BillingSettingsPage() {
  const router = useRouter()

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
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage your subscription and payment methods
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-blue-700 dark:text-blue-300">
              Billing and subscription management will be available soon. Currently, all features are available during the beta period.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}