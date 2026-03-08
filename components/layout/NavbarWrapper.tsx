'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'

export function NavbarWrapper() {
  const pathname = usePathname()
  const hideNav = pathname?.startsWith('/admin') ||
                  pathname?.startsWith('/admin-login') ||
                  pathname === '/'

  if (hideNav) return null
  return (
    <>
      <Navbar />
      <div className="pt-16" />
    </>
  )
}