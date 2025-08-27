import Link from "next/link"
import { Video, Shield, Brain, Calendar } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">The Film Room</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
                Login
              </Link>
              <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Secure Coaching Sessions with AI Insights
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
            Connect with your clients through encrypted video sessions. Get automatic transcriptions, 
            AI-powered summaries, and track progress—all in one platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 text-lg font-semibold">
              Start Free Trial
            </Link>
            <Link href="/demo" className="border border-neutral-300 dark:border-neutral-700 px-8 py-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-lg font-semibold">
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm">
            <Shield className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">End-to-End Encryption</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Your sessions are completely private with enterprise-grade encryption via LiveKit.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm">
            <Brain className="h-10 w-10 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Automatic transcription, summaries, and action items from every session.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm">
            <Calendar className="h-10 w-10 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Easy Scheduling</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Seamless Cal.com integration for effortless booking and calendar management.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm">
            <Video className="h-10 w-10 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">HD Video Sessions</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Crystal clear video and audio with screen sharing and recording capabilities.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Coaching Practice?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join coaches who are delivering better results with AI-powered session insights.
          </p>
          <Link href="/signup" className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-neutral-100 text-lg font-semibold inline-block">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-neutral-950 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">The Film Room</span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              © 2024 The Film Room. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}