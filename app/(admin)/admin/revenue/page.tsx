'use client'
// app/(admin)/admin/revenue/page.tsx

import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, Users, Truck, Gift, Info, ShieldCheck } from 'lucide-react'

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRevenue() }, [])

  const fetchRevenue = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/revenue', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setRevenue(data.revenue)
      }
    } catch (error) {
      console.error('Failed to fetch revenue:', error)
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

  const p = revenue?.platform || {}
  const gross = p.gross || {}
  const net = p.net || {}
  const fees = p.paystackFees || {}
  const escrow = revenue?.escrow || {}
  const obligations = revenue?.obligations || {}
  const withdrawal = revenue?.withdrawal || {}
  const referrals = revenue?.referrals || {}

  return (
    <div className="space-y-8">

      {/* ── SAFE WITHDRAWAL BANNER ── */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-2 border-green-500/40 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/20 rounded-xl shrink-0">
            <ShieldCheck className="w-7 h-7 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">
              Safe to Withdraw from Paystack
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              This is your actual profit after all deductions. Withdrawing more than this risks not being able to pay sellers or riders.
            </p>

            {/* Calculation breakdown */}
            <div className="bg-gray-800/60 rounded-xl p-4 space-y-2 mb-4 font-mono text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Gross platform commission (all time)</span>
                <span className="text-white">+ ₦{(gross.allTime || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Paystack fees paid (per order, 1.5% + ₦100, max ₦2k)</span>
                <span className="text-red-400">− ₦{(fees.allTime || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Referral rewards paid to users</span>
                <span className="text-red-400">− ₦{(referrals.totalPaidOut || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-600 pt-2 flex justify-between font-bold text-lg">
                <span className="text-white">Your NET profit</span>
                <span className="text-green-400">= ₦{(withdrawal.safeToWithdraw || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-green-300 font-bold text-lg">
              <DollarSign className="w-5 h-5" />
              Withdraw exactly ₦{(withdrawal.safeToWithdraw || 0).toLocaleString()} from Paystack
            </div>
          </div>
        </div>
      </div>

      {/* ── NET PROFIT CARDS ── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Net Platform Profit</h2>
        <p className="text-gray-400 text-sm mb-4">After Paystack fees per order. Referral payouts only deducted from all-time total.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <p className="text-green-100 text-sm mb-1">All Time NET Profit</p>
            <p className="text-3xl font-bold">₦{(withdrawal.safeToWithdraw || 0).toLocaleString()}</p>
            <p className="text-green-100 text-xs mt-2">
              Gross: ₦{(gross.allTime || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <p className="text-blue-100 text-sm mb-1">This Month NET</p>
            <p className="text-3xl font-bold">₦{(net.thisMonth || 0).toLocaleString()}</p>
            <p className="text-blue-100 text-xs mt-2">{revenue?.thisMonth?.orders || 0} orders</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <p className="text-purple-100 text-sm mb-1">Last Month NET</p>
            <p className="text-3xl font-bold">₦{(net.lastMonth || 0).toLocaleString()}</p>
            <p className="text-purple-100 text-xs mt-2">{revenue?.lastMonth?.orders || 0} orders</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
            <p className="text-yellow-100 text-sm mb-1">Today NET</p>
            <p className="text-3xl font-bold">₦{(net.today || 0).toLocaleString()}</p>
            <p className="text-yellow-100 text-xs mt-2">{revenue?.today?.orders || 0} orders</p>
          </div>
        </div>
      </div>

      {/* ── PAYSTACK FEES & REFERRALS ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Paystack Fees Paid</h3>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Calculated per order: 1.5% + ₦100, capped at ₦2,000
          </p>
          <div className="space-y-3">
            {[
              { label: 'All time', value: fees.allTime || 0 },
              { label: 'This month', value: fees.thisMonth || 0 },
              { label: 'Last month', value: fees.lastMonth || 0 },
              { label: 'Today', value: fees.today || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-red-400 font-bold">₦{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Referral Rewards</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Paid from your platform commission to users who referred buyers. Deducted from your withdrawable profit.
          </p>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Total rewards paid out</span>
              <span className="text-pink-400 font-bold">₦{(referrals.totalPaidOut || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400 text-sm">Number of rewards</span>
              <span className="text-white font-bold">{(referrals.totalRewards || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ESCROW STATUS ── */}
      <div className="bg-gray-800 border border-yellow-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Escrow (Active Orders)</h3>
            <p className="text-gray-400 text-sm">Money locked in Paystack for orders not yet completed.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Active orders</p>
            <p className="text-3xl font-bold text-yellow-400">{escrow.pendingOrders || 0}</p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Total locked in Paystack</p>
            <p className="text-3xl font-bold text-yellow-400">₦{(escrow.totalInEscrow || 0).toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Your cut (pending)</p>
            <p className="text-3xl font-bold text-green-400">₦{(escrow.yourCutInEscrow || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── OBLIGATIONS ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <ObligationCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
          title="Seller Obligations"
          availableNow={obligations.sellersAvailableNow || 0}
          pending={obligations.sellersPending || 0}
          total={obligations.totalOwedToSellers || 0}
        />
        <ObligationCard
          icon={<Truck className="w-5 h-5 text-purple-400" />}
          iconBg="bg-purple-500/10"
          title="Rider Obligations"
          availableNow={obligations.ridersAvailableNow || 0}
          pending={obligations.ridersPending || 0}
          total={obligations.totalOwedToRiders || 0}
        />
      </div>

      {/* ── TOP SELLERS ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Top Sellers by Revenue</h2>
        <div className="space-y-3">
          {revenue?.topSellers?.length > 0 ? (
            revenue.topSellers.map((seller: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{seller.name}</p>
                    <p className="text-sm text-gray-400">{seller.totalOrders} completed orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">₦{seller.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">
                    Your cut: <span className="text-yellow-400">₦{seller.platformEarned.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No completed orders yet</p>
          )}
        </div>
      </div>

    </div>
  )
}

function ObligationCard({
  icon, iconBg, title, availableNow, pending, total,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  availableNow: number
  pending: number
  total: number
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">Available (can withdraw now)</span>
          <span className="text-green-400 font-bold">₦{availableNow.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">In escrow (from active orders)</span>
          <span className="text-yellow-400 font-bold">₦{pending.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-white font-semibold text-sm">Total owed</span>
          <span className="text-white font-bold">₦{total.toLocaleString()}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">⚠ Do NOT withdraw this from Paystack</p>
    </div>
  )
}