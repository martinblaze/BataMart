'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

// ── Particle Canvas ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', (e) => { mouse.current = { x: e.clientX, y: e.clientY } })

    const COLORS = ['#93c5fd', '#bfdbfe', '#60a5fa', '#dbeafe', '#3b82f6', '#e0f2fe']
    const pts = Array.from({ length: 200 }, () => {
      const x = Math.random() * window.innerWidth
      const y = Math.random() * window.innerHeight
      return {
        x, y, ox: x, oy: y,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.45 + 0.1,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach((p) => {
        p.ox += p.vx; p.oy += p.vy
        if (p.ox < 0) p.ox = canvas.width; if (p.ox > canvas.width) p.ox = 0
        if (p.oy < 0) p.oy = canvas.height; if (p.oy > canvas.height) p.oy = 0
        const dx = p.ox - mouse.current.x, dy = p.oy - mouse.current.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 90 && d > 0) { const f = (90 - d) / 90; p.x = p.ox + (dx / d) * f * 28; p.y = p.oy + (dy / d) * f * 28 }
        else { p.x += (p.ox - p.x) * 0.06; p.y += (p.oy - p.y) * 0.06 }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c + Math.round(p.a * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 75) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(59,130,246,${(1 - d / 75) * 0.12})`; ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />
}

// ── Scroll Reveal ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const dur = 1800, steps = 60
        let cur = 0
        const tick = setInterval(() => {
          cur = Math.min(cur + target / steps, target)
          setVal(Math.floor(cur))
          if (cur >= target) clearInterval(tick)
        }, dur / steps)
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

// ── Tilt Card ────────────────────────────────────────────────────────────────
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2)
    el.style.transform = `perspective(700px) rotateX(${-dy * 5}deg) rotateY(${dx * 5}deg) translateZ(6px)`
  }, [])
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = '' }, [])
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={className}
      style={{ transition: 'transform 0.18s ease', transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  )
}

// ── Marquee ──────────────────────────────────────────────────────────────────
function Marquee() {
  const items = ['Secure Escrow Payments', 'Verified Student Sellers', 'Campus-Wide Delivery', 'Real Buyer Reviews', 'Instant Listings', 'Safe Transactions', 'Fast Payouts', 'Students Helping Students']
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden border-y border-blue-100 py-4 bg-blue-50/60 relative z-10">
      <div className="flex w-max" style={{ animation: 'marquee 32s linear infinite' }}>
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 px-10 text-xs font-semibold uppercase tracking-[0.18em] text-blue-500 whitespace-nowrap" style={{ fontFamily: "'Syne', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Floating Badge ───────────────────────────────────────────────────────────
function FloatingCard({ icon, title, sub, delay, className = '' }: { icon: string; title: string; sub: string; delay: number; className?: string }) {
  return (
    <div className={`absolute bg-white border border-blue-100 rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3 ${className}`}
      style={{ animation: `floatY 5s ease-in-out ${delay}s infinite` }}>
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-900 leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const categories = [
    { name: 'Fashion & Clothing', icon: '👔', count: '3.1K items', accent: '#2563eb', light: '#eff6ff' },
    { name: 'Food Services',      icon: '🍔', count: '1.2K items', accent: '#0284c7', light: '#f0f9ff' },
    { name: 'Room Essentials',    icon: '🏠', count: '950 items',  accent: '#0369a1', light: '#e0f2fe' },
    { name: 'School Supplies',    icon: '🎒', count: '740 items',  accent: '#1d4ed8', light: '#eff6ff' },
    { name: 'Tech Gadgets',       icon: '🎧', count: '680 items',  accent: '#2563eb', light: '#dbeafe' },
    { name: 'Cosmetics',          icon: '💄', count: '520 items',  accent: '#0ea5e9', light: '#f0f9ff' },
    { name: 'Snacks',             icon: '🍿', count: '890 items',  accent: '#0284c7', light: '#e0f2fe' },
    { name: 'Books',              icon: '📚', count: '650 items',  accent: '#1e40af', light: '#eff6ff' },
  ]

  const trustPoints = [
    { icon: '🪪', title: 'Student ID Verified', desc: 'Every seller is verified against campus records before they can list.' },
    { icon: '🔒', title: 'Escrow-Protected Payments', desc: 'Your money is held until you confirm delivery. No surprises, no risk.' },
    { icon: '🛡️', title: 'Dispute Resolution', desc: 'Our campus team mediates any issue fairly and quickly.' },
    { icon: '⭐', title: 'Verified Review System', desc: 'Only confirmed buyers can leave reviews — honest, real feedback only.' },
  ]

  const testimonials = [
    { initials: 'AO', name: 'Adaeze O.', dept: 'Law Faculty · Seller', stars: 5, text: 'I sold my old 300L textbooks in under 3 hours. Got paid the moment the buyer confirmed. This is exactly what campus needed.' },
    { initials: 'KI', name: 'Kingsley I.', dept: 'Engineering · Buyer', stars: 5, text: 'The escrow thing actually works. After my first purchase I was hooked. No more getting scammed on class WhatsApp groups.' },
    { initials: 'TF', name: 'Temi F.', dept: 'Sciences · Seller', stars: 5, text: 'I run a small food business from my hostel and BATAMART has tripled my orders. Riders are fast, platform is easy.' },
    { initials: 'MO', name: 'Musa O.', dept: 'Business Admin · Buyer', stars: 5, text: 'Bought a laptop stand for my room. It came in 45 minutes. I couldn\'t believe it. The campus delivery thing is a game changer.' },
    { initials: 'CD', name: 'Chidera D.', dept: 'Medicine · Buyer', stars: 5, text: 'I\'ve saved so much money buying second-hand supplies. Everything has been exactly as described. Trust the platform.' },
    { initials: 'EJ', name: 'Emeka J.', dept: 'Economics · Campus Rider', stars: 5, text: 'I was a rider for a semester and made more than most of my classmates from side jobs. Payouts are always on time.' },
  ]

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Figtree:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap" />
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; }
        body { font-family: 'Figtree', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        .font-serif  { font-family: 'Instrument Serif', serif; }

        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-10px); }
        }
        @keyframes floatY2 {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%     { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes shimmerBg {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.45); }
          70%  { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
        @keyframes borderFlow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes scrollPulse {
          0%,100% { opacity: 1; transform: translateY(0); }
          50%     { opacity: 0.3; transform: translateY(6px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }

        .pulse-ring { animation: pulseRing 2.2s ease infinite; }
        .float-1    { animation: floatY 5.5s ease-in-out 0s infinite; }
        .float-2    { animation: floatY 4.8s ease-in-out 0.8s infinite; }
        .float-3    { animation: floatY2 6s ease-in-out 0.3s infinite; }

        .hero-gradient {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #0ea5e9 80%, #1d4ed8 100%);
          background-size: 200% 200%;
          animation: shimmerBg 6s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glow-border {
          position: relative;
        }
        .glow-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1.5px;
          background: linear-gradient(90deg, transparent, #2563eb, #60a5fa, transparent);
          background-size: 200% 100%;
          animation: borderFlow 2.5s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #bfdbfe, transparent);
        }

        .cat-card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(37,99,235,0.12);
          border-color: #93c5fd;
        }
        .cat-icon-wrap { transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        .cat-card-hover:hover .cat-icon-wrap { transform: scale(1.18) rotate(-6deg); }

        .step-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 56px rgba(37,99,235,0.1);
          border-color: #93c5fd;
        }

        .cta-ripple {
          position: relative; overflow: hidden;
        }
        .cta-ripple::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.18);
          border-radius: 50%;
          transform: translate(-50%,-50%);
          transition: width 0.6s ease, height 0.6s ease;
        }
        .cta-ripple:hover::before { width: 500px; height: 500px; }

        .testimonial-card:hover {
          border-color: #bfdbfe;
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(37,99,235,0.08);
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
        }

        .blue-orb-1 {
          background: radial-gradient(circle, rgba(219,234,254,0.7) 0%, transparent 70%);
        }
        .blue-orb-2 {
          background: radial-gradient(circle, rgba(186,230,253,0.5) 0%, transparent 70%);
        }

        .stat-top-line::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          border-radius: 2px;
        }

        .trust-icon-ring {
          box-shadow: 0 0 0 4px rgba(219,234,254,0.7), 0 0 0 8px rgba(219,234,254,0.3);
        }

        .sell-strip-bg {
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #0369a1 80%, #1e40af 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .bento-glow:hover .bento-inner {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147,197,253,0.15);
        }

        .nav-link-hover:hover { color: #1d4ed8; }
        .nav-link-hover::after {
          content: '';
          display: block;
          height: 1.5px;
          background: #2563eb;
          width: 0;
          transition: width 0.3s ease;
          margin-top: 2px;
        }
        .nav-link-hover:hover::after { width: 100%; }

        .watermark {
          font-family: 'Syne', sans-serif;
          font-size: clamp(72px, 16vw, 180px);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: transparent;
          -webkit-text-stroke: 1px rgba(191,219,254,0.4);
          user-select: none;
          pointer-events: none;
        }

        .delivery-chip {
          transition: all 0.28s ease;
        }
        .delivery-chip:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37,99,235,0.1);
        }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden relative">
        <ParticleCanvas />

        {/* ── NAV ─────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-blue-50">
          <div className="flex items-center gap-2">
            <Image src="/BATAMART - logo.png" alt="BATAMART" width={120} height={40} className="h-9 w-auto object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['How It Works', 'Categories', 'Safety', 'Reviews'].map((l) => (
              <span key={l} className="nav-link-hover text-sm font-medium text-gray-500 cursor-pointer transition-colors duration-200 font-display">{l}</span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:block text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors font-display">Sign In</Link>
            <Link href="/signup" className="cta-ripple bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold font-display tracking-wide transition-all duration-300 shadow-md hover:shadow-blue-200 hover:shadow-lg">
              Join Free
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden grid-bg">
          {/* Orbs */}
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] blue-orb-1 rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] blue-orb-2 rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-5 py-2 rounded-full mb-8 shadow-sm"
              style={{ animation: 'floatY 4s ease-in-out infinite' }}>
              <div className="w-2 h-2 bg-blue-600 rounded-full pulse-ring" />
              <span className="text-sm font-semibold text-blue-700 tracking-wide font-display">
                BATAMART — Campus Marketplace
              </span>
            </div>

            {/* Headline */}
            <div className="overflow-hidden mb-4">
              <h1 className="font-display text-[clamp(52px,9vw,110px)] font-800 leading-[0.92] tracking-tight"
                style={{ fontWeight: 800 }}>
                <span className="block text-gray-900">Buy. Sell.</span>
                <span className="block hero-gradient">Deliver.</span>
                <span className="block text-gray-900 font-serif italic" style={{ fontWeight: 400, fontSize: '0.82em' }}>
                  On Campus.
                </span>
              </h1>
            </div>

            <p className="text-gray-500 text-lg md:text-xl max-w-lg mx-auto leading-relaxed mb-10 font-light">
              The smartest way for students to trade — secure escrow payments,
              campus-wide delivery, and real seller verification.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/signup"
                className="cta-ripple w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold text-base font-display tracking-wide transition-all duration-300 shadow-[0_0_32px_rgba(37,99,235,0.35)] hover:shadow-[0_0_48px_rgba(37,99,235,0.55)] hover:-translate-y-1">
                Join BATAMART — It&apos;s Free
              </Link>
              <Link href="/marketplace"
                className="cta-ripple w-full sm:w-auto bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 px-10 py-4 rounded-xl font-bold text-base font-display tracking-wide transition-all duration-300 shadow-sm hover:shadow-blue-100 hover:shadow-md hover:-translate-y-1">
                Explore Marketplace →
              </Link>
            </div>

            {/* Hero stats strip */}
            <div className="grid grid-cols-3 gap-px bg-blue-100 rounded-2xl overflow-hidden shadow-sm max-w-xl mx-auto mb-16">
              {[
                { val: '2K+', label: 'Active Users' },
                { val: '5K+', label: 'Products Listed' },
                { val: '98%', label: 'Satisfaction' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-white px-4 py-5 text-center">
                  <p className="font-display text-2xl font-800 text-blue-700" style={{ fontWeight: 800 }}>{val}</p>
                  <p className="text-xs text-gray-400 mt-1 tracking-wide uppercase font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Floating icon cards */}
            <div className="relative flex justify-center items-center gap-6">
              {[
                { icon: '🛍️', label: 'Buy', cls: 'float-1' },
                { icon: '🔐', label: 'Escrow', cls: 'float-2' },
                { icon: '🛵', label: 'Deliver', cls: 'float-3' },
              ].map(({ icon, label, cls }) => (
                <div key={label} className={`${cls} text-center`}>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-md">
                    {icon}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase font-medium font-display">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gray-300 font-medium">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-blue-400 to-transparent" style={{ animation: 'scrollPulse 2s ease infinite' }} />
          </div>
        </section>

        {/* ── MARQUEE ──────────────────────────────────── */}
        <Marquee />

        {/* ── HOW IT WORKS ─────────────────────────────── */}
        <section className="relative py-28 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">The Process</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontWeight: 800 }}>
                  How <span className="font-serif italic font-normal text-blue-600">BATAMART</span> Works
                </h2>
                <p className="text-gray-500 max-w-md mx-auto text-base leading-relaxed">Built for student commerce — secure, fast, and campus-native.</p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                { num: '01', icon: '🔍', title: 'Browse & Discover', desc: 'Explore thousands of products from verified students across every faculty, department, and hostel on campus. Filter by price, category, and location.', featured: false },
                { num: '02', icon: '🔐', title: 'Secure Escrow Pay', desc: 'Your payment is held safely in escrow. It\'s only released to the seller after you confirm receipt. Zero risk — total control, every single time.', featured: true },
                { num: '03', icon: '🛵', title: 'Campus Delivery', desc: 'Our campus riders pick up from the seller and deliver to your hostel door or nearest pickup point — sometimes within the hour.', featured: false },
              ].map(({ num, icon, title, desc, featured }, i) => (
                <Reveal key={title} delay={i * 110}>
                  <TiltCard className="h-full">
                    <div className={`step-card-hover h-full relative p-8 rounded-2xl border transition-all duration-350 cursor-default overflow-hidden ${featured ? 'glow-border bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500' : 'bg-white border-blue-100 hover:bg-blue-50/40'}`}>
                      {featured && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, white 0%, transparent 60%)' }} />}
                      <div className={`text-4xl mb-6 inline-block transition-transform duration-300 group-hover:scale-110 ${featured ? '' : ''}`}>{icon}</div>
                      <p className={`text-[10px] font-bold tracking-[0.28em] uppercase mb-2 font-display ${featured ? 'text-blue-200' : 'text-blue-400'}`}>{num}</p>
                      <h3 className={`font-display text-xl font-bold mb-3 ${featured ? 'text-white' : 'text-gray-900'}`} style={{ fontWeight: 700 }}>{title}</h3>
                      <p className={`text-sm leading-relaxed ${featured ? 'text-blue-100' : 'text-gray-500'}`}>{desc}</p>
                      <div className={`absolute bottom-4 right-4 font-display text-6xl font-bold opacity-[0.06] ${featured ? 'text-white' : 'text-blue-600'}`} style={{ fontWeight: 800 }}>{num}</div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── FEATURES BENTO ───────────────────────────── */}
        <section className="relative py-28 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">Platform Features</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontWeight: 800 }}>
                  Everything You <span className="font-serif italic font-normal text-blue-600">Need</span>
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">Thoughtfully designed features that make campus commerce actually work.</p>
              </div>
            </Reveal>

            {/* Bento row 1 */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <Reveal delay={0}>
                <div className="bento-inner relative rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-blue-500 mb-4 font-display">Protected Payments</p>
                  <span className="text-5xl mb-5 block">🔐</span>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>Escrow That Actually Protects You</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">Your money never touches the seller until you say so. Held securely in escrow, released only on your confirmation. Disputes handled by our campus team.</p>
                  {/* Mini escrow visual */}
                  <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl p-3">
                    <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">You</p>
                      <p className="text-xs font-bold text-gray-700 font-display">Buyer</p>
                    </div>
                    <span className="text-blue-400 text-sm font-bold">→</span>
                    <div className="flex-1 bg-blue-600 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] text-blue-200 mb-0.5">Escrow</p>
                      <p className="text-xs font-bold text-white font-display">🔒 Held</p>
                    </div>
                    <span className="text-blue-400 text-sm font-bold">→</span>
                    <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">On Confirm</p>
                      <p className="text-xs font-bold text-gray-700 font-display">Seller</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full font-display">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" style={{ animation: 'pulseRing 2s ease infinite' }} />
                    Zero-risk payments
                  </div>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="bento-inner relative rounded-2xl border border-blue-100 bg-white p-8 overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1">
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-blue-500 mb-4 font-display">Verified Sellers</p>
                  <span className="text-5xl mb-5 block">✅</span>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>Only Real Students Sell Here</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">Every seller is verified with their student ID and campus registration. No randos, no scammers — just your actual course mates and faculty neighbors.</p>
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold font-display">TF</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-display">Temi Fashola</p>
                      <p className="text-xs text-gray-400">Sciences · 300 Level</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full font-display">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Verified
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bento row 2 */}
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[
                { label: 'Instant Listings', icon: '⚡', title: 'Live in Under 2 Minutes', desc: 'Take a photo, set a price, write a short description — go live instantly. Selling has never been this easy.' },
                { label: 'Trusted Reviews', icon: '⭐', title: 'Real Ratings, Real Buyers', desc: 'Only confirmed purchasers can leave reviews. Know exactly who you\'re dealing with before you commit.' },
                { label: 'Campus Coverage', icon: '📍', title: 'Every Corner Covered', desc: 'Hostels, lecture halls, faculty buildings, cafeteria — our riders know the whole campus.' },
              ].map(({ label, icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="bento-inner relative rounded-2xl border border-blue-100 bg-white p-7 overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 h-full">
                    <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-blue-500 mb-4 font-display">{label}</p>
                    <span className="text-4xl mb-4 block">{icon}</span>
                    <h3 className="font-display text-lg font-bold text-gray-900 mb-2" style={{ fontWeight: 700 }}>{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Bento row 3 */}
            <div className="grid md:grid-cols-2 gap-5">
              <Reveal delay={0}>
                <div className="bento-inner relative rounded-2xl border border-blue-100 bg-white p-8 overflow-hidden transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1">
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-blue-500 mb-4 font-display">In-App Chat</p>
                  <span className="text-4xl mb-4 block">💬</span>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>Chat Directly With Sellers</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Negotiate, ask questions, arrange a campus meetup — all within BATAMART. No need to share personal numbers or move conversations to WhatsApp.</p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="bento-inner relative rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 80%, white 0%, transparent 60%)' }} />
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-blue-200 mb-4 font-display">For Sellers</p>
                  <span className="text-4xl mb-4 block">💰</span>
                  <h3 className="font-display text-xl font-bold text-white mb-3" style={{ fontWeight: 700 }}>Turn Your Stuff Into Cash</h3>
                  <p className="text-blue-100 text-sm leading-relaxed mb-5">Textbooks, room supplies, home-cooked food, clothes — there&apos;s a buyer on campus for everything. Get paid directly, no hassle.</p>
                  <div className="flex gap-4">
                    {['Free to List', 'Fast Payouts', 'Wide Reach'].map((p) => (
                      <div key={p} className="flex items-center gap-1.5 text-blue-100 text-xs font-medium">
                        <span className="text-emerald-400">✓</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── CATEGORIES ───────────────────────────────── */}
        <section className="relative py-28 px-4 bg-[#f8faff]">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">Products</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontWeight: 800 }}>
                  Shop by <span className="font-serif italic font-normal text-blue-600">Category</span>
                </h2>
                <p className="text-gray-500 max-w-sm mx-auto">Everything a student needs — in one place.</p>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map(({ name, icon, count, accent, light }, i) => (
                <Reveal key={name} delay={i * 55}>
                  <Link href={`/marketplace?category=${encodeURIComponent(name)}`}>
                    <div className="cat-card-hover relative bg-white border border-blue-100 rounded-2xl p-6 cursor-pointer overflow-hidden group transition-all duration-300">
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl"
                        style={{ background: `radial-gradient(ellipse at top left, ${accent}0d, transparent 70%)` }} />
                      <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"
                        style={{ background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)` }} />
                      <div className="cat-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: light }}>{icon}</div>
                      <h3 className="font-display font-bold text-gray-900 text-sm leading-snug mb-1" style={{ fontWeight: 700 }}>{name}</h3>
                      <p className="text-xs text-gray-400 font-medium">{count}</p>
                      <div className="mt-3 text-blue-500 text-sm opacity-0 group-hover:opacity-100 translate-x-[-6px] group-hover:translate-x-0 transition-all duration-300">→</div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── TRUST / SAFETY ───────────────────────────── */}
        <section className="relative py-28 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Left */}
              <Reveal>
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">Safety First</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight" style={{ fontWeight: 800 }}>
                  Built to <span className="font-serif italic font-normal text-blue-600">Protect</span> You
                </h2>
                <p className="text-gray-500 text-base leading-relaxed mb-10">We know campus marketplaces have a trust problem. BATAMART was designed from the ground up to solve it — for real.</p>
                <ul className="space-y-6">
                  {trustPoints.map(({ icon, title, desc }) => (
                    <li key={title} className="flex gap-4 group">
                      <div className="trust-icon-ring w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg flex-shrink-0 mt-0.5 transition-all duration-300 group-hover:bg-blue-100">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-gray-900 mb-1 text-sm" style={{ fontWeight: 700 }}>{title}</h4>
                        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* Right — stacked float cards */}
              <Reveal delay={150}>
                <div className="relative h-[460px]">
                  {/* Card 1 */}
                  <div className="float-1 absolute top-0 left-0 w-[270px] bg-white border border-blue-100 rounded-2xl shadow-xl p-6">
                    <div className="text-3xl mb-3">🔐</div>
                    <h4 className="font-display font-bold text-gray-900 mb-1 text-sm" style={{ fontWeight: 700 }}>Payment Protected</h4>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">Your ₦4,500 is held in escrow until you confirm delivery of the item.</p>
                    <p className="font-display text-2xl font-bold text-blue-600" style={{ fontWeight: 800 }}>₦4,500</p>
                  </div>
                  {/* Card 2 */}
                  <div className="float-3 absolute bottom-0 right-0 w-[255px] bg-white border border-blue-100 rounded-2xl shadow-xl p-6">
                    <div className="text-3xl mb-3">⭐</div>
                    <h4 className="font-display font-bold text-gray-900 mb-2 text-sm" style={{ fontWeight: 700 }}>Genuine Review</h4>
                    <p className="text-xs text-gray-400 leading-relaxed italic font-serif">&ldquo;Got my textbook super fast, exactly as described. Will buy again!&rdquo;</p>
                    <p className="text-yellow-400 mt-2 text-sm">★★★★★</p>
                  </div>
                  {/* Card 3 */}
                  <div className="float-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[230px] bg-blue-600 border border-blue-500 rounded-2xl shadow-2xl p-6">
                    <div className="text-3xl mb-3">✅</div>
                    <h4 className="font-display font-bold text-white mb-1 text-sm" style={{ fontWeight: 700 }}>Verified Seller</h4>
                    <p className="text-xs text-blue-200 mb-3">Student ID confirmed · Engineering Faculty</p>
                    <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full font-display">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Campus Verified
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── DELIVERY ─────────────────────────────────── */}
        <section className="relative py-28 px-4 bg-[#f8faff]">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Left visual */}
              <Reveal>
                <div className="relative rounded-2xl bg-white border border-blue-100 overflow-hidden shadow-sm" style={{ height: 420 }}>
                  <canvas id="map-canvas" className="w-full h-full" />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white border border-blue-100 rounded-full px-5 py-2.5 flex items-center gap-2.5 shadow-md whitespace-nowrap">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" style={{ animation: 'pulseRing 2s ease infinite' }} />
                    <span className="text-xs font-semibold text-gray-700 font-display">Riders Active on Campus</span>
                  </div>
                </div>
              </Reveal>

              {/* Right text */}
              <Reveal delay={150}>
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">Campus Delivery</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight" style={{ fontWeight: 800 }}>
                  Your Campus, <span className="font-serif italic font-normal text-blue-600">Fully Covered</span>
                </h2>
                <p className="text-gray-500 text-base leading-relaxed mb-8">Our rider network spans every corner of campus — hostels, lecture theatres, faculty buildings, the cafeteria, the library. Wherever you are, we deliver.</p>
                <div className="flex flex-wrap gap-2.5">
                  {['Main Hostel Block', 'Engineering Faculty', 'Sciences Complex', 'Law Faculty', 'Student Union Building', 'Library', 'Sports Complex', 'Medical Campus', 'Admin Block', 'New Hostels'].map((loc) => (
                    <span key={loc} className="delivery-chip bg-white border border-blue-100 text-blue-600 text-xs font-semibold px-3.5 py-2 rounded-full cursor-default font-display">{loc}</span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── TESTIMONIALS ─────────────────────────────── */}
        <section className="relative py-28 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">Student Reviews</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontWeight: 800 }}>
                  Real Students, <span className="font-serif italic font-normal text-blue-600">Real Stories</span>
                </h2>
                <p className="text-gray-500 max-w-sm mx-auto">From buyers, sellers, and riders — what campus actually thinks.</p>
              </div>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-5">
              {testimonials.map(({ initials, name, dept, stars, text }, i) => (
                <Reveal key={name} delay={i * 80}>
                  <div className="testimonial-card relative bg-white border border-blue-50 rounded-2xl p-7 transition-all duration-300 h-full">
                    <div className="absolute top-5 right-6 font-serif text-7xl text-blue-50 leading-none select-none">&ldquo;</div>
                    <p className="text-yellow-400 text-sm tracking-wide mb-4">{'★'.repeat(stars)}</p>
                    <p className="text-gray-600 text-[15px] leading-relaxed mb-6 font-serif italic">&ldquo;{text}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold font-display flex-shrink-0">{initials}</div>
                      <div>
                        <p className="font-display font-bold text-gray-900 text-sm" style={{ fontWeight: 700 }}>{name}</p>
                        <p className="text-xs text-gray-400">{dept}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider mx-8" />

        {/* ── STATS ────────────────────────────────────── */}
        <section className="relative py-24 px-4 bg-[#f8faff]">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-14">
                <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-4 font-display">By The Numbers</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900" style={{ fontWeight: 800 }}>Growing Every <span className="font-serif italic font-normal text-blue-600">Day</span></h2>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-blue-100 rounded-2xl overflow-hidden shadow-sm">
              {[
                { id: 'st1', val: 2000, suf: '+', label: 'Active Users', sub: 'Students trading daily', icon: '👥' },
                { id: 'st2', val: 5000, suf: '+', label: 'Products Listed', sub: 'Across all categories', icon: '📦' },
                { id: 'st3', val: 1200, suf: '+', label: 'Deliveries Made', sub: 'Campus-wide', icon: '🛵' },
                { id: 'st4', val: 98,   suf: '%', label: 'Satisfaction', sub: 'Verified reviews', icon: '⭐' },
              ].map(({ id, val, suf, label, sub, icon }, i) => (
                <Reveal key={id} delay={i * 80}>
                  <TiltCard>
                    <div className="stat-top-line relative bg-white px-5 py-10 text-center hover:bg-blue-50/50 transition-colors duration-300">
                      <div className="text-2xl mb-3">{icon}</div>
                      <p className="font-display text-4xl font-bold text-blue-700 mb-1.5 tabular-nums" style={{ fontWeight: 800 }}>
                        <Counter target={val} suffix={suf} />
                      </p>
                      <p className="font-display font-bold text-gray-900 text-sm mb-1" style={{ fontWeight: 700 }}>{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SELLER STRIP ─────────────────────────────── */}
        <section className="relative py-12 px-4 md:px-8 bg-white">
          <Reveal>
            <div className="sell-strip-bg max-w-6xl mx-auto rounded-3xl px-10 md:px-16 py-14 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
              <div className="relative z-10 max-w-lg">
                <p className="text-blue-200 text-xs tracking-[0.24em] uppercase font-bold mb-3 font-display">For Sellers</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3 leading-tight" style={{ fontWeight: 800 }}>
                  Have something to sell?<br />Start earning today.
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed mb-5">Thousands of students are actively browsing BATAMART right now. Put your products in front of them — for free.</p>
                <div className="flex flex-wrap gap-5">
                  {['Free to list', 'Instant reach', 'Secure payouts', 'Easy setup'].map((p) => (
                    <span key={p} className="flex items-center gap-1.5 text-blue-100 text-xs font-medium font-display">
                      <span className="text-emerald-400 font-bold">✓</span> {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0">
                <Link href="/sell"
                  className="cta-ripple inline-block bg-white text-blue-700 hover:bg-blue-50 px-10 py-4 rounded-xl font-bold text-base font-display tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1">
                  Start Selling Free →
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FINAL CTA ────────────────────────────────── */}
        <section className="relative py-36 px-4 bg-white overflow-hidden text-center">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="watermark">BATAMART</span>
          </div>
          {/* Orbs */}
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] blue-orb-1 rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] blue-orb-2 rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <Reveal>
              <p className="text-blue-600 text-xs tracking-[0.28em] uppercase font-bold mb-5 font-display">Get Started</p>
              <h2 className="font-display text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6" style={{ fontWeight: 800 }}>
                Ready to Start<br />
                <span className="hero-gradient">Trading?</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-md mx-auto mb-10 leading-relaxed font-light">
                Join thousands of campus students using BATAMART. Free to join, takes 30 seconds.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Link href="/signup"
                  className="cta-ripple inline-block bg-blue-600 hover:bg-blue-700 text-white px-14 py-5 rounded-xl font-bold text-lg font-display tracking-wide transition-all duration-300 shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_64px_rgba(37,99,235,0.5)] hover:-translate-y-1">
                  Create Free Account
                </Link>
              </div>
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors font-semibold font-display">Sign in →</Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────── */}
        <footer className="relative bg-gray-50 border-t border-blue-100 py-16 px-4 z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
              <div className="col-span-2 md:col-span-1">
                <Image src="/BATAMART - logo.png" alt="BATAMART" width={400} height={400} className="w-28 h-28 object-contain mb-3" />
                <p className="text-gray-500 text-sm leading-relaxed max-w-[220px]">
                  Student-to-student marketplace built exclusively for your campus.
                </p>
              </div>
              {[
                { label: 'Product', links: [{ name: 'Marketplace', href: '/marketplace' }, { name: 'Sell on BATAMART', href: '/sell' }, { name: 'Become a Rider', href: '/riders' }] },
                { label: 'Company', links: [{ name: 'About', href: '/about' }, { name: 'Contact', href: '/contact' }, { name: 'Support', href: '/support' }] },
                { label: 'Legal', links: [{ name: 'Privacy Policy', href: '/privacy' }, { name: 'Terms of Use', href: '/terms' }, { name: 'Refund Policy', href: '/refunds' }] },
              ].map(({ label, links }) => (
                <div key={label}>
                  <h4 className="font-display text-xs font-bold text-gray-400 uppercase tracking-widest mb-5" style={{ fontWeight: 700 }}>{label}</h4>
                  <ul className="space-y-3">
                    {links.map(({ name, href }) => (
                      <li key={name}>
                        <Link href={href} className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">{name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent mb-8" />
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-xs">© 2026 BATAMART. Built with ❤️ for university students.</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">All systems operational</span>
              </div>
            </div>
          </div>
        </footer>

        {/* ── Canvas Map Script ─────────────────────────── */}
        <MapCanvas />
      </div>
    </>
  )
}

// ── Map Canvas Component ─────────────────────────────────────────────────────
function MapCanvas() {
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement
    if (!canvas) return
    const wrap = canvas.parentElement!
    const ctx = canvas.getContext('2d')!

    const resize = () => { canvas.width = wrap.offsetWidth; canvas.height = wrap.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    const nodes = [
      { x: 0.18, y: 0.18, label: 'Hostel A' },
      { x: 0.5,  y: 0.12, label: 'Lecture Hall' },
      { x: 0.82, y: 0.22, label: 'Engineering' },
      { x: 0.12, y: 0.58, label: 'Sciences' },
      { x: 0.48, y: 0.48, label: 'Library' },
      { x: 0.78, y: 0.55, label: 'SUB' },
      { x: 0.28, y: 0.82, label: 'Hostel B' },
      { x: 0.65, y: 0.82, label: 'Cafeteria' },
    ]
    const edges = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,7],[6,7]]
    const riderPath = [0, 1, 4, 5, 7, 6, 3, 4, 2, 1, 0]
    let t = 0

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(37,99,235,0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Edges
      edges.forEach(([a, b]) => {
        ctx.beginPath()
        ctx.moveTo(nodes[a].x * W, nodes[a].y * H)
        ctx.lineTo(nodes[b].x * W, nodes[b].y * H)
        ctx.strokeStyle = 'rgba(37,99,235,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Nodes
      nodes.forEach((n) => {
        const x = n.x * W, y = n.y * H
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(219,234,254,0.9)'; ctx.fill()
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#2563eb'; ctx.fill()
        ctx.font = '10px Figtree, sans-serif'; ctx.fillStyle = '#94a3b8'
        ctx.fillText(n.label, x + 10, y + 4)
      })

      // Rider
      t += 0.003
      const seg = Math.floor(t) % (riderPath.length - 1)
      const frac = t % 1
      const a = nodes[riderPath[seg]], b2 = nodes[riderPath[seg + 1]]
      const rx = (a.x + (b2.x - a.x) * frac) * W
      const ry = (a.y + (b2.y - a.y) * frac) * H

      const grd = ctx.createRadialGradient(rx, ry, 0, rx, ry, 22)
      grd.addColorStop(0, 'rgba(37,99,235,0.25)'); grd.addColorStop(1, 'rgba(37,99,235,0)')
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(rx, ry, 22, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2); ctx.fillStyle = '#2563eb'; ctx.fill()
      ctx.font = '14px serif'; ctx.fillText('🛵', rx - 9, ry - 10)

      requestAnimationFrame(draw)
    }
    draw()
    return () => window.removeEventListener('resize', resize)
  }, [])
  return null
}