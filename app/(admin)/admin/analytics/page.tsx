'use client'
// app/(admin)/admin/analytics/page.tsx

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Users, Package, ShoppingBag, DollarSign,
  CheckCircle, Gift, Store, Bike, Activity, BarChart2, Target,
  AlertTriangle, Clock, RefreshCw, ArrowUpRight, ArrowDownRight,
  Layers, Zap, Shield, CreditCard, UserCheck, Repeat
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  // Growth
  newUsers: number
  totalUsers: number
  newSellers: number
  newRiders: number
  newProducts: number
  totalProducts: number
  totalOrders: number
  completedOrders: number
  completionRate: number
  revenue: number
  platformCommission: number

  // Engagement
  dau: number
  wau: number
  mau: number
  retentionDay1: number
  retentionDay7: number
  repeatBuyerPct: number

  // Funnel
  appOpens: number
  productViews: number
  addToCart: number
  checkoutSuccessPct: number

  // Marketplace Health
  activeSellers: number
  ordersPerSeller: number
  listingGrowthPct: number

  // Logistics
  avgDeliveryMinutes: number
  riderCompletionRate: number
  failedDeliveryPct: number

  // Money
  gmv: number
  netRevenue: number
  cac: number
  ltv: number

  // Existing
  topCategories: { category: string; count: number }[]
  referrals: { newRewards: number; totalPaidOut: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString()
const fmtNgn = (n: number) => `₦${fmt(Math.round(n))}`
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtMin = (n: number) =>
  n >= 60 ? `${Math.floor(n / 60)}h ${n % 60}m` : `${n}m`

function delta(val: number, good: 'up' | 'down' = 'up') {
  const isPositive = val >= 0
  const isGood = good === 'up' ? isPositive : !isPositive
  return { isPositive, isGood }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-red-500">{icon}</div>
      <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">{label}</span>
      <div className="flex-1 h-px bg-gray-700/60" />
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  trend,
  trendGood = 'up',
  accent = 'red',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  trend?: number
  trendGood?: 'up' | 'down'
  accent?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'pink'
}) {
  const accentMap: Record<string, string> = {
    red:    'border-red-500/30 bg-red-500/5',
    blue:   'border-blue-500/30 bg-blue-500/5',
    green:  'border-emerald-500/30 bg-emerald-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    cyan:   'border-cyan-500/30 bg-cyan-500/5',
    pink:   'border-pink-500/30 bg-pink-500/5',
  }
  const iconMap: Record<string, string> = {
    red:    'text-red-400',
    blue:   'text-blue-400',
    green:  'text-emerald-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan:   'text-cyan-400',
    pink:   'text-pink-400',
  }

  const hasTrend = trend !== undefined
  const { isPositive, isGood } = hasTrend ? delta(trend!, trendGood) : { isPositive: true, isGood: true }

  return (
    <div className={`border ${accentMap[accent]} rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden`}>
      {/* top row */}
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{label}</span>
        <span className={iconMap[accent]}>{icon}</span>
      </div>
      {/* value */}
      <p className="text-2xl font-black text-white font-mono leading-none tracking-tight">{value}</p>
      {/* bottom row */}
      <div className="flex items-center justify-between mt-auto">
        {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
        {hasTrend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold ml-auto ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend!).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

function FunnelBar({ label, value, max, pct }: { label: string; value: number; max: number; pct: number }) {
  const width = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-3">
          <span className="text-white font-bold font-mono text-sm">{fmt(value)}</span>
          <span className="text-gray-600 text-[10px]">{fmtPct(pct)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function DataRow({ label, value, sub, flag }: { label: string; value: string; sub?: string; flag?: 'ok' | 'warn' | 'danger' }) {
  const flagColor = flag === 'ok' ? 'bg-emerald-500' : flag === 'warn' ? 'bg-yellow-400' : flag === 'danger' ? 'bg-red-500' : 'bg-transparent'
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-800/60 last:border-0">
      <div className="flex items-center gap-2">
        {flag && <span className={`w-1.5 h-1.5 rounded-full ${flagColor} flex-shrink-0`} />}
        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">{label}</span>
      </div>
      <div className="text-right">
        <p className="text-white font-bold font-mono text-sm">{value}</p>
        {sub && <p className="text-gray-600 text-[10px]">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => { fetchAnalytics() }, [timeRange])

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
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const a = analytics

  const rangeLabel: Record<string, string> = {
    '7days': '7D', '30days': '30D', '90days': '90D', 'all': 'ALL',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Top Bar ── */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-300">BataMart Analytics</span>
              <span className="text-[10px] text-gray-600 font-mono">/ COMMAND CENTER</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Range Tabs */}
            <div className="flex items-center bg-gray-800 rounded-md p-0.5 gap-0.5">
              {['7days', '30days', '90days', 'all'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all tracking-wider ${
                    timeRange === r
                      ? 'bg-red-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {rangeLabel[r]}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={fetchAnalytics}
              className="p-1.5 rounded bg-gray-800 text-gray-500 hover:text-white hover:bg-gray-700 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-500' : ''}`} />
            </button>
            <span className="text-[10px] text-gray-700 font-mono">
              {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-6 space-y-8 max-w-screen-2xl mx-auto">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[11px] text-gray-600 tracking-widest uppercase">Fetching data...</p>
            </div>
          </div>
        )}

        {!loading && a && (
          <>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 1 · GROWTH                                            */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader label="§01 · Growth" icon={<TrendingUp className="w-4 h-4" />} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="New Users"
                  value={fmt(a.newUsers)}
                  sub={`+${a.newSellers} sellers · +${a.newRiders} riders`}
                  icon={<Users className="w-4 h-4" />}
                  accent="blue"
                />
                <KpiCard
                  label="Total Users"
                  value={fmt(a.totalUsers)}
                  sub="All-time registered"
                  icon={<UserCheck className="w-4 h-4" />}
                  accent="cyan"
                />
                <KpiCard
                  label="Orders Placed"
                  value={fmt(a.totalOrders)}
                  sub={`${a.completedOrders} completed`}
                  icon={<ShoppingBag className="w-4 h-4" />}
                  accent="purple"
                />
                <KpiCard
                  label="Revenue (GMV)"
                  value={fmtNgn(a.revenue)}
                  sub={`${fmtNgn(a.platformCommission)} commission`}
                  icon={<DollarSign className="w-4 h-4" />}
                  accent="green"
                />
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 2 · ENGAGEMENT                                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader label="§02 · Engagement" icon={<Zap className="w-4 h-4" />} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard label="DAU" value={fmt(a.dau)} sub="Daily active users" icon={<Activity className="w-4 h-4" />} accent="orange" />
                <KpiCard label="WAU" value={fmt(a.wau)} sub="Weekly active users" icon={<Activity className="w-4 h-4" />} accent="orange" />
                <KpiCard label="MAU" value={fmt(a.mau)} sub="Monthly active users" icon={<Activity className="w-4 h-4" />} accent="orange" />
                <KpiCard label="Day 1 Retention" value={fmtPct(a.retentionDay1)} sub="Return next day" icon={<RefreshCw className="w-4 h-4" />} accent="cyan" />
                <KpiCard label="Day 7 Retention" value={fmtPct(a.retentionDay7)} sub="Return after 7 days" icon={<RefreshCw className="w-4 h-4" />} accent="cyan" />
                <KpiCard label="Repeat Buyers" value={fmtPct(a.repeatBuyerPct)} sub="Bought 2+ times" icon={<Repeat className="w-4 h-4" />} accent="pink" />
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 3 · CONVERSION FUNNEL                                 */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader label="§03 · Conversion Funnel" icon={<Target className="w-4 h-4" />} />
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
                <FunnelBar
                  label="App Opens"
                  value={a.appOpens}
                  max={a.appOpens}
                  pct={100}
                />
                <FunnelBar
                  label="Product Views"
                  value={a.productViews}
                  max={a.appOpens}
                  pct={a.appOpens > 0 ? (a.productViews / a.appOpens) * 100 : 0}
                />
                <FunnelBar
                  label="Add to Cart"
                  value={a.addToCart}
                  max={a.appOpens}
                  pct={a.appOpens > 0 ? (a.addToCart / a.appOpens) * 100 : 0}
                />
                <FunnelBar
                  label="Checkout Success"
                  value={a.completedOrders}
                  max={a.appOpens}
                  pct={a.checkoutSuccessPct}
                />
                {/* Drop-off annotation */}
                <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">Overall Conversion Rate</span>
                  <span className={`font-black font-mono text-lg ${a.checkoutSuccessPct >= 10 ? 'text-emerald-400' : a.checkoutSuccessPct >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {fmtPct(a.checkoutSuccessPct)}
                  </span>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 4 + 5 · MARKETPLACE HEALTH + LOGISTICS (side by side) */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Marketplace Health */}
              <section>
                <SectionHeader label="§04 · Marketplace Health" icon={<Store className="w-4 h-4" />} />
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <DataRow
                    label="Active Sellers"
                    value={fmt(a.activeSellers)}
                    sub={`${fmt(a.newSellers)} joined this period`}
                    flag="ok"
                  />
                  <DataRow
                    label="Orders per Seller"
                    value={a.ordersPerSeller.toFixed(1)}
                    sub="Avg in period"
                    flag={a.ordersPerSeller >= 2 ? 'ok' : a.ordersPerSeller >= 1 ? 'warn' : 'danger'}
                  />
                  <DataRow
                    label="Listing Growth"
                    value={fmtPct(a.listingGrowthPct)}
                    sub={`${fmt(a.newProducts)} new / ${fmt(a.totalProducts)} total`}
                    flag={a.listingGrowthPct >= 5 ? 'ok' : 'warn'}
                  />
                  <DataRow
                    label="Completion Rate"
                    value={fmtPct(a.completionRate)}
                    sub={`${a.completedOrders} of ${a.totalOrders} orders`}
                    flag={a.completionRate >= 80 ? 'ok' : a.completionRate >= 60 ? 'warn' : 'danger'}
                  />
                  <DataRow
                    label="Avg Order Value"
                    value={fmtNgn(a.totalOrders > 0 ? a.revenue / a.totalOrders : 0)}
                    sub="Per completed order"
                  />
                </div>
              </section>

              {/* Logistics */}
              <section>
                <SectionHeader label="§05 · Logistics" icon={<Bike className="w-4 h-4" />} />
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <DataRow
                    label="Avg Delivery Time"
                    value={fmtMin(a.avgDeliveryMinutes)}
                    sub="Campus delivery"
                    flag={a.avgDeliveryMinutes <= 30 ? 'ok' : a.avgDeliveryMinutes <= 60 ? 'warn' : 'danger'}
                  />
                  <DataRow
                    label="Rider Completion Rate"
                    value={fmtPct(a.riderCompletionRate)}
                    sub="Deliveries fulfilled"
                    flag={a.riderCompletionRate >= 90 ? 'ok' : a.riderCompletionRate >= 75 ? 'warn' : 'danger'}
                  />
                  <DataRow
                    label="Failed Deliveries"
                    value={fmtPct(a.failedDeliveryPct)}
                    sub="Of attempted deliveries"
                    flag={a.failedDeliveryPct <= 5 ? 'ok' : a.failedDeliveryPct <= 15 ? 'warn' : 'danger'}
                  />
                  <DataRow
                    label="Active Riders"
                    value={fmt(a.newRiders)}
                    sub="Joined this period"
                  />
                  <DataRow
                    label="Referral Rewards Paid"
                    value={fmtNgn(a.referrals.totalPaidOut)}
                    sub={`${a.referrals.newRewards} rewards`}
                  />
                </div>
              </section>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 6 · MONEY METRICS                                     */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader label="§06 · Money Metrics" icon={<CreditCard className="w-4 h-4" />} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="GMV"
                  value={fmtNgn(a.gmv)}
                  sub="Gross merchandise value"
                  icon={<BarChart2 className="w-4 h-4" />}
                  accent="green"
                />
                <KpiCard
                  label="Net Revenue"
                  value={fmtNgn(a.netRevenue)}
                  sub="After costs & rewards"
                  icon={<Shield className="w-4 h-4" />}
                  accent="yellow"
                />
                <KpiCard
                  label="CAC"
                  value={fmtNgn(a.cac)}
                  sub="Cost to acquire user"
                  icon={<Target className="w-4 h-4" />}
                  accent="red"
                />
                <KpiCard
                  label="LTV"
                  value={fmtNgn(a.ltv)}
                  sub="Lifetime value"
                  icon={<TrendingUp className="w-4 h-4" />}
                  accent="purple"
                />
              </div>
              {/* LTV:CAC Ratio */}
              <div className="mt-3 bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">LTV : CAC Ratio</p>
                  <p className="text-gray-400 text-xs mt-0.5">Target ≥ 3× for healthy unit economics</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black font-mono ${
                    a.cac > 0 && a.ltv / a.cac >= 3
                      ? 'text-emerald-400'
                      : a.cac > 0 && a.ltv / a.cac >= 1.5
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}>
                    {a.cac > 0 ? (a.ltv / a.cac).toFixed(2) : '—'}×
                  </p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TOP CATEGORIES                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader label="§07 · Category Breakdown" icon={<Layers className="w-4 h-4" />} />
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
                {a.topCategories?.length > 0 ? (
                  a.topCategories.map((cat, index) => {
                    const pct = a.totalProducts
                      ? (cat.count / a.totalProducts) * 100
                      : 0
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono font-semibold text-gray-300 uppercase tracking-wider">
                            {cat.category || 'Uncategorized'}
                          </span>
                          <div className="flex items-baseline gap-3">
                            <span className="text-white font-bold font-mono text-sm">{cat.count}</span>
                            <span className="text-gray-600 text-[10px]">{fmtPct(pct)}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `hsl(${200 + index * 30}, 70%, 55%)`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-600 text-center py-6 text-sm font-mono">NO DATA AVAILABLE</p>
                )}
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  )
}