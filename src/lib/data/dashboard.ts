import 'server-only'

import { can, type AdminSession } from '@/lib/auth'
import type {
  ActivityLogRow,
  InquiryRow,
  InquiryStatus,
  TestDriveRequestRow,
  TestDriveStatus,
  VehicleRow,
} from '@/types/database'

/**
 * Dashboard overview.
 *
 * Every query runs through the signed-in admin's own client, so Row Level
 * Security decides what comes back. The capability checks here are not the
 * protection - they exist so a content manager sees a dashboard without CRM
 * panels instead of a dashboard full of empty ones.
 */

export type DashboardStats = {
  vehicles: {
    total: number
    published: number
    draft: number
    reserved: number
    sold: number
    featured: number
  } | null
  crm: {
    newInquiries: number
    openInquiries: number
    totalInquiries: number
    pendingTestDrives: number
    upcomingTestDrives: number
  } | null
}

export type DashboardData = {
  stats: DashboardStats
  recentInquiries: Pick<
    InquiryRow,
    'id' | 'reference' | 'customer_name' | 'vehicle_label' | 'inquiry_type' | 'status' | 'created_at'
  >[]
  upcomingTestDrives: Pick<
    TestDriveRequestRow,
    | 'id'
    | 'reference'
    | 'customer_name'
    | 'vehicle_label'
    | 'preferred_date'
    | 'preferred_time'
    | 'status'
  >[]
  recentVehicles: Pick<
    VehicleRow,
    'id' | 'slug' | 'brand' | 'model' | 'variant' | 'year' | 'status' | 'selling_price' | 'updated_at'
  >[]
  recentActivity: Pick<
    ActivityLogRow,
    'id' | 'action' | 'actor_name' | 'entity_label' | 'entity_type' | 'created_at'
  >[]
}

/** Statuses that still need someone to act on them. */
const OPEN_INQUIRY_STATUSES: InquiryStatus[] = ['new', 'contacted', 'qualified', 'negotiating']
const OPEN_TEST_DRIVE_STATUSES: TestDriveStatus[] = [
  'pending',
  'contacted',
  'confirmed',
  'rescheduled',
]

export async function getDashboardData(session: AdminSession): Promise<DashboardData> {
  const { supabase } = session
  const canInventory = can(session.profile, 'inventory')
  const canCrm = can(session.profile, 'crm')

  const today = new Date().toISOString().slice(0, 10)

  // `head: true` asks Postgres for the count without transferring any rows.
  // One helper per table, so column names stay checked against that table's
  // schema rather than collapsing to the columns all three happen to share.
  const countVehicles = () => supabase.from('vehicles').select('id', { count: 'exact', head: true })
  const countInquiries = () =>
    supabase.from('inquiries').select('id', { count: 'exact', head: true })
  const countTestDrives = () =>
    supabase.from('test_drive_requests').select('id', { count: 'exact', head: true })

  const [
    vehiclesTotal,
    vehiclesPublished,
    vehiclesDraft,
    vehiclesReserved,
    vehiclesSold,
    vehiclesFeatured,
    inquiriesNew,
    inquiriesOpen,
    inquiriesTotal,
    testDrivesPending,
    testDrivesUpcoming,
    recentInquiries,
    upcomingTestDrives,
    recentVehicles,
    recentActivity,
  ] = await Promise.all([
    canInventory ? countVehicles() : null,
    canInventory ? countVehicles().eq('status', 'published') : null,
    canInventory ? countVehicles().eq('status', 'draft') : null,
    canInventory ? countVehicles().eq('status', 'reserved') : null,
    canInventory ? countVehicles().eq('status', 'sold') : null,
    canInventory ? countVehicles().eq('is_featured', true) : null,

    canCrm ? countInquiries().eq('status', 'new') : null,
    canCrm ? countInquiries().in('status', OPEN_INQUIRY_STATUSES) : null,
    canCrm ? countInquiries() : null,
    canCrm ? countTestDrives().eq('status', 'pending') : null,
    canCrm
      ? countTestDrives().in('status', OPEN_TEST_DRIVE_STATUSES).gte('preferred_date', today)
      : null,

    canCrm
      ? supabase
          .from('inquiries')
          .select('id, reference, customer_name, vehicle_label, inquiry_type, status, created_at')
          .order('created_at', { ascending: false })
          .limit(6)
      : null,
    canCrm
      ? supabase
          .from('test_drive_requests')
          .select(
            'id, reference, customer_name, vehicle_label, preferred_date, preferred_time, status',
          )
          .in('status', OPEN_TEST_DRIVE_STATUSES)
          .gte('preferred_date', today)
          .order('preferred_date', { ascending: true })
          .limit(6)
      : null,
    canInventory
      ? supabase
          .from('vehicles')
          .select('id, slug, brand, model, variant, year, status, selling_price, updated_at')
          .order('updated_at', { ascending: false })
          .limit(6)
      : null,
    supabase
      .from('activity_logs')
      .select('id, action, actor_name, entity_label, entity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return {
    stats: {
      vehicles: canInventory
        ? {
            total: vehiclesTotal?.count ?? 0,
            published: vehiclesPublished?.count ?? 0,
            draft: vehiclesDraft?.count ?? 0,
            reserved: vehiclesReserved?.count ?? 0,
            sold: vehiclesSold?.count ?? 0,
            featured: vehiclesFeatured?.count ?? 0,
          }
        : null,
      crm: canCrm
        ? {
            newInquiries: inquiriesNew?.count ?? 0,
            openInquiries: inquiriesOpen?.count ?? 0,
            totalInquiries: inquiriesTotal?.count ?? 0,
            pendingTestDrives: testDrivesPending?.count ?? 0,
            upcomingTestDrives: testDrivesUpcoming?.count ?? 0,
          }
        : null,
    },
    recentInquiries: recentInquiries?.data ?? [],
    upcomingTestDrives: upcomingTestDrives?.data ?? [],
    recentVehicles: recentVehicles?.data ?? [],
    recentActivity: recentActivity?.data ?? [],
  }
}
