'use client'
// app/(admin)/admin/analytics/page.tsx

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Package, ShoppingBag, DollarSign, CheckCircle, Gift, Store, Bike } from 'lucide-react'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    )
  }

  const rangeLabel: Record<string, string> = {
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    '90days': 'Last 90 Days',
    'all': 'All Time',
  }

  return (
    <div className="space-y-6">

      {/* Time Range Selector */}
      <div className="flex gap-2 flex-wrap">
        {['7days', '30days', '90days', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              timeRange === range
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {rangeLabel[range]}
          </button>
        ))}
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-400" />}
          iconBg="bg-blue-500/10"
          label="New Buyers"
          value={analytics?.newUsers || 0}
          sub={`+${analytics?.newSellers || 0} sellers  +${analytics?.newRiders || 0} riders`}
        />
        <StatCard
          icon={<Package className="w-6 h-6 text-green-400" />}
          iconBg="bg-green-500/10"
          label="New Products"
          value={analytics?.newProducts || 0}
          sub={`${analytics?.totalProducts || 0} total listed`}
        />
        <StatCard
          icon={<ShoppingBag className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/10"
          label="Orders Placed"
          value={analytics?.totalOrders || 0}
          sub={`${analytics?.completedOrders || 0} completed (${analytics?.completionRate || 0}%)`}
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6 text-yellow-400" />}
          iconBg="bg-yellow-500/10"
          label="GMV (Sales Volume)"
          value={`₦${(analytics?.revenue || 0).toLocaleString()}`}
          sub={`₦${(analytics?.platformCommission || 0).toLocaleString()} platform commission`}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          label="Order Completion Rate"
          value={`${analytics?.completionRate || 0}%`}
          sub={`${analytics?.completedOrders || 0} of ${analytics?.totalOrders || 0} orders`}
        />
        <StatCard
          icon={<Gift className="w-6 h-6 text-pink-400" />}
          iconBg="bg-pink-500/10"
          label="Referral Rewards Paid"
          value={`₦${(analytics?.referrals?.totalPaidOut || 0).toLocaleString()}`}
          sub={`${analytics?.referrals?.newRewards || 0} rewards in period`}
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-orange-400" />}
          iconBg="bg-orange-500/10"
          label="Avg Order Value"
          value={`₦${analytics?.totalOrders
            ? Math.round((analytics.revenue || 0) / analytics.totalOrders).toLocaleString()
            : 0}`}
          sub="Per completed order"
        />
      </div>

      {/* User Breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">New User Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-700/40 rounded-xl">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{analytics?.newUsers || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Buyers</p>
          </div>
          <div className="text-center p-4 bg-gray-700/40 rounded-xl">
            <Store className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{analytics?.newSellers || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Sellers</p>
          </div>
          <div className="text-center p-4 bg-gray-700/40 rounded-xl">
            <Bike className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{analytics?.newRiders || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Riders</p>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Top Product Categories</h2>
        <div className="space-y-4">
          {analytics?.topCategories?.length > 0 ? (
            analytics.topCategories.map((cat: any, index: number) => {
              const pct = analytics.totalProducts
                ? Math.round((cat.count / analytics.totalProducts) * 100)
                : 0
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{cat.category || 'Uncategorized'}</span>
                    <span className="text-gray-400 text-sm">{cat.count} products ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-gray-400 text-center py-4">No data available</p>
          )}
        </div>
      </div>

    </div>
  )
}

function StatCard({
  icon, iconBg, label, value, sub,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}