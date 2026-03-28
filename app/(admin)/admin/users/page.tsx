// app/(admin)/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Shield, CheckCircle, XCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  trustLevel: string
  isSuspended: boolean
  penaltyPoints: number
  createdAt: string
  _count: {
    ordersAsBuyer: number
    ordersAsSeller: number
    products: number
  }
}

interface SuspendDialogState {
  userId: string
  userName: string
  reason: string
  days: string
}

const PAGE_SIZE = 50

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Inline toast — replaces alert()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Inline suspend dialog — replaces prompt()
  const [suspendDialog, setSuspendDialog] = useState<SuspendDialogState | null>(null)

  // Inline unsuspend confirm — replaces confirm()
  const [unsuspendTarget, setUnsuspendTarget] = useState<{ userId: string; userName: string } | null>(null)

  useEffect(() => { fetchUsers(page) }, [page])

  const fetchUsers = async (p: number) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(
        `/api/admin/users?page=${p}&limit=${PAGE_SIZE}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        // Backend should return total count; fall back to array length
        setTotal(data.total ?? data.users.length)
      } else {
        showToast('Failed to load users', 'error')
      }
    } catch {
      showToast('Network error loading users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendSubmit = async () => {
    if (!suspendDialog) return
    const { userId, reason, days } = suspendDialog
    const parsedDays = parseInt(days) || 30
    setActionLoading(userId)
    setSuspendDialog(null)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || 'Administrative action', days: parsedDays }),
      })
      const data = await response.json()
      if (response.ok) { showToast('User suspended successfully'); fetchUsers(page) }
      else showToast(`Failed: ${data.error || 'Unknown error'}`, 'error')
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnsuspendConfirm = async () => {
    if (!unsuspendTarget) return
    const { userId } = unsuspendTarget
    setActionLoading(userId)
    setUnsuspendTarget(null)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (response.ok) { showToast('User unsuspended successfully'); fetchUsers(page) }
      else showToast(`Failed: ${data.error || 'Unknown error'}`, 'error')
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200'
            : 'bg-red-900/90 border-red-700 text-red-200'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Inline Suspend Dialog */}
      {suspendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">Suspend User</h3>
            <p className="text-gray-400 text-sm mb-5">{suspendDialog.userName}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={suspendDialog.reason}
                  onChange={e => setSuspendDialog(d => d ? { ...d, reason: e.target.value } : d)}
                  placeholder="e.g. Fraudulent activity"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Duration in days — enter 0 for permanent
                </label>
                <input
                  type="number"
                  min="0"
                  value={suspendDialog.days}
                  onChange={e => setSuspendDialog(d => d ? { ...d, days: e.target.value } : d)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSuspendDialog(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendSubmit}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Unsuspend Confirm */}
      {unsuspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Unsuspend User?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will restore full access for{' '}
              <strong className="text-white">{unsuspendTarget.userName}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnsuspendTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsuspendConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                Unsuspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="ALL">All Roles</option>
          <option value="BUYER">Buyers</option>
          <option value="SELLER">Sellers</option>
          <option value="RIDER">Riders</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Trust</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Activity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'SELLER' ? 'bg-green-500/10 text-green-400' :
                        user.role === 'RIDER'  ? 'bg-blue-500/10 text-blue-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${
                          user.trustLevel === 'GOLD'   ? 'text-yellow-400' :
                          user.trustLevel === 'SILVER' ? 'text-gray-400' :
                          'text-orange-400'
                        }`} />
                        <span className="text-white text-sm">{user.trustLevel}</span>
                      </div>
                      {user.penaltyPoints > 0 && (
                        <p className="text-xs text-red-400 mt-1">{user.penaltyPoints} penalty pts</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        <p>Orders: {(user._count.ordersAsBuyer ?? 0) + (user._count.ordersAsSeller ?? 0)}</p>
                        <p>Products: {user._count.products ?? 0}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isSuspended ? (
                        <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.isSuspended ? (
                          <button
                            onClick={() => setUnsuspendTarget({ userId: user.id, userName: user.name })}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : 'Unsuspend'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendDialog({ userId: user.id, userName: user.name, reason: '', days: '30' })}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : 'Suspend'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages} · {total} total users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}