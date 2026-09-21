'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/** Desktop nav item that marks itself current for both sighted and AT users. */
export function ActiveNavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative inline-flex h-10 items-center rounded-md px-3.5 text-sm font-medium transition-colors',
        isActive ? 'text-white' : 'text-white/70 hover:text-white',
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-3.5 -bottom-px h-0.5 origin-left bg-accent-500 transition-transform duration-200',
          isActive ? 'scale-x-100' : 'scale-x-0',
        )}
      />
    </Link>
  )
}
