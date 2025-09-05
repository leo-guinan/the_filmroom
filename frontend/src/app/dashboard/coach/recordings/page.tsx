'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlayIcon, 
  ArrowUpTrayIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Recording {
  id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  status: string
  client: {
    id: string
    name: string
    email: string
  } | null
  participants: string[]
  recording: {
    has_recording: boolean
    recording_url?: string
    s3_key?: string
    s3_status?: string
    external_platform?: string
    external_url?: string
    size_bytes?: number
    duration_seconds?: number
  }
  transcript_status: string
  analysis_status: string
  uploads: Array<{
    id: string
    type: string
    s3_key: string
    status: string
    size_bytes?: number
    created_at: string
  }>
}

export default function RecordingsPage() {
  const [sessions, setSessions] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    sessionId: '',
    platform: '',
    externalUrl: '',
    file: null as File | null
  })
  const router = useRouter()

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/v1/recordings/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (sessionId: string) => {
    setUploadData({ ...uploadData, sessionId })
    setUploadModal(true)
  }

  const submitUpload = async () => {
    if (!uploadData.sessionId) return
    
    setUploading(uploadData.sessionId)
    setUploadModal(false)
    
    const formData = new FormData()
    formData.append('session_id', uploadData.sessionId)
    if (uploadData.platform) formData.append('platform', uploadData.platform)
    if (uploadData.externalUrl) formData.append('external_url', uploadData.externalUrl)
    if (uploadData.file) formData.append('file', uploadData.file)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/v1/recordings/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })
      
      if (response.ok) {
        await fetchSessions()
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(null)
      setUploadData({
        sessionId: '',
        platform: '',
        externalUrl: '',
        file: null
      })
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/recordings/recording/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        await fetchSessions()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleDownload = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/recordings/download/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        window.open(data.download_url, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const syncBucket = async () => {
    setSyncing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/v1/recordings/sync-bucket', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        await fetchSessions()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return hours > 0 
      ? `${hours}h ${minutes}m ${secs}s`
      : minutes > 0
      ? `${minutes}m ${secs}s`
      : `${secs}s`
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'uploading':
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Session Recordings</h1>
          <button
            onClick={syncBucket}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            {syncing ? 'Syncing...' : 'Sync with S3'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recording
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transcript
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analysis
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{session.title}</div>
                    <div className="text-sm text-gray-500">
                      {session.duration_minutes} minutes
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.client ? (
                      <div>
                        <div className="text-sm text-gray-900">{session.client.name}</div>
                        <div className="text-sm text-gray-500">{session.client.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(session.scheduled_at), 'MMM d, yyyy')}
                    <div className="text-xs text-gray-500">
                      {format(new Date(session.scheduled_at), 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(session.recording.s3_status)}
                      <div className="ml-2">
                        {session.recording.has_recording ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {session.recording.external_platform || 'LiveKit'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(session.recording.size_bytes)}
                            </div>
                          </div>
                        ) : uploading === session.id ? (
                          <span className="text-sm text-yellow-600">Uploading...</span>
                        ) : (
                          <button
                            onClick={() => handleUpload(session.id)}
                            className="text-sm text-purple-600 hover:text-purple-900"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(session.transcript_status)}
                      <span className="ml-2 text-sm text-gray-900">
                        {session.transcript_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(session.analysis_status)}
                      <span className="ml-2 text-sm text-gray-900">
                        {session.analysis_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {session.recording.has_recording && (
                        <>
                          <button
                            onClick={() => handleDownload(session.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/coach/sessions/${session.id}`)}
                            className="text-purple-600 hover:text-purple-900"
                            title="View Details"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Recording</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Platform (optional)
                </label>
                <select
                  value={uploadData.platform}
                  onChange={(e) => setUploadData({ ...uploadData, platform: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="">Select platform</option>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="meet">Google Meet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  External URL (optional)
                </label>
                <input
                  type="url"
                  value={uploadData.externalUrl}
                  onChange={(e) => setUploadData({ ...uploadData, externalUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Or upload file
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                  className="mt-1 block w-full"
                  accept="video/*,audio/*"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitUpload}
                disabled={!uploadData.externalUrl && !uploadData.file}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}