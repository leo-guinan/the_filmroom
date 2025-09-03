'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Mail, UserPlus, Clock, Calendar, X, Send, RefreshCw, AlertCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface Client {
  id: string
  email: string
  full_name: string
  created_at: string
  last_session: string | null
  total_sessions: number
  relationship_id: string
}

interface Invitation {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    message: ''
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'clients' | 'invitations'>('clients')

  useEffect(() => {
    // Check if user is a coach
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.role !== 'COACH' && user.role !== 'coach') {
        router.push('/dashboard')
        return
      }
    }
    
    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      // Fetch clients
      const clientsResponse = await fetch(`${apiUrl}/api/v1/clients`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData)
      }

      // Fetch invitations
      const invitationsResponse = await fetch(`${apiUrl}/api/v1/invitations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load clients and invitations')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteForm.email,
          first_name: inviteForm.first_name || null,
          last_name: inviteForm.last_name || null,
          message: inviteForm.message || null
        })
      })

      if (response.ok) {
        // Success - refresh invitations and close modal
        await fetchData()
        setShowInviteModal(false)
        setInviteForm({ email: '', first_name: '', last_name: '', message: '' })
      } else {
        const errorData = await response.json()
        alert(errorData.detail || 'Failed to send invitation')
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      alert('Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const resendInvitation = async (invitationId: string) => {
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        alert('Invitation resent successfully')
        await fetchData()
      } else {
        alert('Failed to resend invitation')
      }
    } catch (err) {
      console.error('Error resending invitation:', err)
      alert('Failed to resend invitation')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return
    
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/invitations/${invitationId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        await fetchData()
      } else {
        alert('Failed to cancel invitation')
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      alert('Failed to cancel invitation')
    }
  }

  const removeClient = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this client? They will no longer have access to sessions with you.')) return
    
    try {
      const accessToken = localStorage.getItem('access_token')
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/api/v1/clients/${relationshipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        await fetchData()
      } else {
        alert('Failed to remove client')
      }
    } catch (err) {
      console.error('Error removing client:', err)
      alert('Failed to remove client')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: Invitation['status']) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Clients</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Invite Client
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'clients'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Active Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Invitations ({invitations.length})
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'clients' ? (
        clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No clients yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by inviting clients to join your coaching platform.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Invite Your First Client
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{client.full_name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{client.email}</p>
                    
                    <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Joined:</span> {formatDate(client.created_at)}
                      </div>
                      <div>
                        <span className="font-medium">Sessions:</span> {client.total_sessions}
                      </div>
                      {client.last_session && (
                        <div>
                          <span className="font-medium">Last session:</span> {formatDate(client.last_session)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/sessions/new?client=${client.id}`)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Schedule Session
                    </button>
                    <button
                      onClick={() => removeClient(client.relationship_id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        invitations.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No invitations sent
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Invitations you send to clients will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {invitation.first_name && invitation.last_name
                          ? `${invitation.first_name} ${invitation.last_name}`
                          : invitation.email}
                      </h3>
                      {getStatusBadge(invitation.status)}
                    </div>
                    {invitation.first_name && invitation.last_name && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{invitation.email}</p>
                    )}
                    
                    <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Sent:</span> {formatDate(invitation.created_at)}
                      </div>
                      {invitation.status === 'pending' && (
                        <div>
                          <span className="font-medium">Expires:</span> {formatDate(invitation.expires_at)}
                        </div>
                      )}
                      {invitation.accepted_at && (
                        <div>
                          <span className="font-medium">Accepted:</span> {formatDate(invitation.accepted_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {invitation.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resendInvitation(invitation.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Resend
                      </button>
                      <button
                        onClick={() => cancelInvitation(invitation.id)}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Invite New Client</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    value={inviteForm.first_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                  rows={3}
                  placeholder="Add a personal note to your invitation..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}