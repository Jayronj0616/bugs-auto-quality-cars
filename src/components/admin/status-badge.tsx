import { Badge, StatusDot, type BadgeTone } from '@/components/ui/badge'
import { labelFor } from '@/lib/constants'
import type { InquiryStatus, TestDriveStatus, VehicleStatus } from '@/types/database'

/**
 * Status colour is a shared vocabulary across the dashboard: green means done,
 * amber means waiting on us, red means it went away. Defining it once keeps
 * "New" the same colour in the inquiry table, the detail page and the overview.
 */

const VEHICLE_TONES: Record<VehicleStatus, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  reserved: 'warning',
  sold: 'dark',
  archived: 'neutral',
}

const INQUIRY_TONES: Record<InquiryStatus, BadgeTone> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'warning',
  negotiating: 'accent',
  converted: 'success',
  closed: 'neutral',
  cancelled: 'danger',
}

const TEST_DRIVE_TONES: Record<TestDriveStatus, BadgeTone> = {
  pending: 'info',
  contacted: 'warning',
  confirmed: 'success',
  rescheduled: 'warning',
  completed: 'neutral',
  cancelled: 'danger',
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge tone={VEHICLE_TONES[status]}>{labelFor('status', status)}</Badge>
}

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return <Badge tone={INQUIRY_TONES[status]}>{labelFor('inquiryStatus', status)}</Badge>
}

export function TestDriveStatusBadge({ status }: { status: TestDriveStatus }) {
  return <Badge tone={TEST_DRIVE_TONES[status]}>{labelFor('testDriveStatus', status)}</Badge>
}

/** Compact variant for dense table rows. */
export function InquiryStatusDot({ status }: { status: InquiryStatus }) {
  return <StatusDot tone={INQUIRY_TONES[status]}>{labelFor('inquiryStatus', status)}</StatusDot>
}

export function TestDriveStatusDot({ status }: { status: TestDriveStatus }) {
  return <StatusDot tone={TEST_DRIVE_TONES[status]}>{labelFor('testDriveStatus', status)}</StatusDot>
}
