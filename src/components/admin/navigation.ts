import {
  CalendarClock,
  Car,
  LayoutDashboard,
  Landmark,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { ROLE_CAPABILITIES } from '@/lib/constants'
import type { AdminCapability, AdminRole } from '@/types/database'

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Undefined means every active admin can see it. */
  capability?: AdminCapability
  /** Matches child routes too (e.g. /admin/vehicles/new). */
  prefix?: boolean
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Car, capability: 'inventory', prefix: true },
  {
    href: '/admin/inquiries',
    label: 'Inquiries',
    icon: MessageSquare,
    capability: 'crm',
    prefix: true,
  },
  {
    href: '/admin/test-drives',
    label: 'Test Drives',
    icon: CalendarClock,
    capability: 'crm',
    prefix: true,
  },
  {
    href: '/admin/financing',
    label: 'Financing',
    icon: Landmark,
    capability: 'financing',
    prefix: true,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    capability: 'settings',
    prefix: true,
  },
  { href: '/admin/users', label: 'Admin Users', icon: Users, capability: 'users', prefix: true },
]

/**
 * The navigation a given role should see.
 *
 * This only controls what is rendered. Every page also calls
 * `requireCapability`, and the database enforces the same matrix in RLS, so
 * hiding a link is a courtesy rather than the protection.
 */
export function navigationFor(role: AdminRole): AdminNavItem[] {
  const capabilities = ROLE_CAPABILITIES[role] ?? []
  return ADMIN_NAV.filter((item) => !item.capability || capabilities.includes(item.capability))
}

export function isActiveNavItem(item: AdminNavItem, pathname: string): boolean {
  return item.prefix ? pathname.startsWith(item.href) : pathname === item.href
}
