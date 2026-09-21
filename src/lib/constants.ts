/**
 * Single source of truth for every enum-like value in the system.
 *
 * The database stores machine values (`plug_in_hybrid`); humans read labels
 * ("Plug-in Hybrid"). Keeping the mapping here means a new body type is added
 * in two places - a migration and this file - rather than scattered through
 * filter panels, admin selects and detail pages.
 */

import type {
  AdminCapability,
  AdminRole,
  BodyType,
  ContactMethod,
  DriveType,
  FuelType,
  ImageCategory,
  InquiryStatus,
  InquiryType,
  TestDriveStatus,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
  VideoType,
} from '@/types/database'

export type Option<T extends string> = { value: T; label: string }

const option = <T extends string>(value: T, label: string): Option<T> => ({ value, label })

/* -------------------------------------------------------------------------- */
/* Vehicle attributes                                                          */
/* -------------------------------------------------------------------------- */

export const VEHICLE_STATUSES: Option<VehicleStatus>[] = [
  option('draft', 'Draft'),
  option('published', 'Published'),
  option('reserved', 'Reserved'),
  option('sold', 'Sold'),
  option('archived', 'Archived'),
]

/** Statuses the public site is allowed to render. Mirrors the RLS policy. */
export const PUBLICLY_VISIBLE_STATUSES: VehicleStatus[] = ['published', 'reserved', 'sold']

/** Statuses that appear in the inventory listing by default. */
export const AVAILABLE_STATUSES: VehicleStatus[] = ['published', 'reserved']

export const VEHICLE_CONDITIONS: Option<VehicleCondition>[] = [
  option('brand_new', 'Brand New'),
  option('used', 'Pre-owned'),
  option('certified_pre_owned', 'Certified Pre-owned'),
]

export const BODY_TYPES: Option<BodyType>[] = [
  option('sedan', 'Sedan'),
  option('hatchback', 'Hatchback'),
  option('suv', 'SUV'),
  option('crossover', 'Crossover'),
  option('mpv', 'MPV'),
  option('pickup', 'Pickup'),
  option('van', 'Van'),
  option('coupe', 'Coupe'),
  option('convertible', 'Convertible'),
  option('wagon', 'Wagon'),
  option('truck', 'Truck'),
  option('other', 'Other'),
]

export const FUEL_TYPES: Option<FuelType>[] = [
  option('gasoline', 'Gasoline'),
  option('diesel', 'Diesel'),
  option('hybrid', 'Hybrid'),
  option('plug_in_hybrid', 'Plug-in Hybrid'),
  option('electric', 'Electric'),
  option('lpg', 'LPG'),
  option('other', 'Other'),
]

export const TRANSMISSIONS: Option<TransmissionType>[] = [
  option('automatic', 'Automatic'),
  option('manual', 'Manual'),
  option('cvt', 'CVT'),
  option('dct', 'Dual Clutch'),
  option('amt', 'AMT'),
  option('other', 'Other'),
]

export const DRIVE_TYPES: Option<DriveType>[] = [
  option('fwd', 'FWD'),
  option('rwd', 'RWD'),
  option('awd', 'AWD'),
  option('4wd', '4WD'),
  option('other', 'Other'),
]

export const IMAGE_CATEGORIES: Option<ImageCategory>[] = [
  option('exterior', 'Exterior'),
  option('interior', 'Interior'),
  option('dashboard', 'Dashboard'),
  option('engine', 'Engine'),
  option('features', 'Features'),
  option('other', 'Other'),
]

export const VIDEO_TYPES: Option<VideoType>[] = [
  option('walkaround', 'Walkaround'),
  option('interior', 'Interior'),
  option('exterior', 'Exterior'),
  option('driving', 'Driving'),
  option('features', 'Features'),
  option('promotion', 'Promotion'),
  option('other', 'Other'),
]

/* -------------------------------------------------------------------------- */
/* Inquiries and test drives                                                   */
/* -------------------------------------------------------------------------- */

export const INQUIRY_TYPES: Option<InquiryType>[] = [
  option('general', 'General Inquiry'),
  option('vehicle', 'Vehicle Inquiry'),
  option('cash_purchase', 'Cash Purchase'),
  option('installment', 'Installment'),
  option('financing', 'Financing'),
  option('test_drive', 'Test Drive'),
  option('trade_in', 'Trade-In'),
  option('other', 'Other'),
]

/** Inquiry types that make the financing section of the form relevant. */
export const FINANCING_INQUIRY_TYPES: InquiryType[] = ['installment', 'financing']

export const INQUIRY_STATUSES: Option<InquiryStatus>[] = [
  option('new', 'New'),
  option('contacted', 'Contacted'),
  option('qualified', 'Qualified'),
  option('negotiating', 'Negotiating'),
  option('converted', 'Converted'),
  option('closed', 'Closed'),
  option('cancelled', 'Cancelled'),
]

export const CONTACT_METHODS: Option<ContactMethod>[] = [
  option('any', 'Any method'),
  option('phone', 'Phone call'),
  option('email', 'Email'),
  option('messenger', 'Messenger'),
]

export const TEST_DRIVE_STATUSES: Option<TestDriveStatus>[] = [
  option('pending', 'Pending'),
  option('contacted', 'Contacted'),
  option('confirmed', 'Confirmed'),
  option('rescheduled', 'Rescheduled'),
  option('completed', 'Completed'),
  option('cancelled', 'Cancelled'),
]

/** Bookable slots, on the hour, within typical dealership opening hours. */
export const TEST_DRIVE_TIME_SLOTS: Option<string>[] = [
  option('09:00', '9:00 AM'),
  option('10:00', '10:00 AM'),
  option('11:00', '11:00 AM'),
  option('13:00', '1:00 PM'),
  option('14:00', '2:00 PM'),
  option('15:00', '3:00 PM'),
  option('16:00', '4:00 PM'),
  option('17:00', '5:00 PM'),
]

/* -------------------------------------------------------------------------- */
/* Financing                                                                   */
/* -------------------------------------------------------------------------- */

/** Loan terms the calculator offers, in months. */
export const LOAN_TERMS = [12, 24, 36, 48, 60, 72] as const

export const DOWN_PAYMENT_PRESETS = [10, 15, 20, 25, 30, 40, 50] as const

/* -------------------------------------------------------------------------- */
/* Admin roles                                                                 */
/* -------------------------------------------------------------------------- */

export const ADMIN_ROLES: Option<AdminRole>[] = [
  option('super_admin', 'Super Admin'),
  option('admin', 'Admin'),
  option('sales', 'Sales'),
  option('content_manager', 'Content Manager'),
]

/**
 * Mirror of public.admin_can() in the database.
 *
 * The database copy is authoritative; this one only decides what to render, so
 * a stale UI can never turn into a privilege escalation.
 */
export const ROLE_CAPABILITIES: Record<AdminRole, AdminCapability[]> = {
  super_admin: ['inventory', 'crm', 'financing', 'settings', 'users'],
  admin: ['inventory', 'crm', 'financing', 'settings'],
  sales: ['crm'],
  content_manager: ['inventory'],
}

/* -------------------------------------------------------------------------- */
/* Sorting                                                                     */
/* -------------------------------------------------------------------------- */

export const SORT_OPTIONS = [
  option('newest', 'Newest first'),
  option('price_asc', 'Price: low to high'),
  option('price_desc', 'Price: high to low'),
  option('year_desc', 'Year: newest'),
  option('year_asc', 'Year: oldest'),
  option('brand_asc', 'Brand: A to Z'),
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

export const DEFAULT_SORT: SortOption = 'newest'
export const VEHICLES_PER_PAGE = 12

/* -------------------------------------------------------------------------- */
/* Label lookup                                                                */
/* -------------------------------------------------------------------------- */

const buildLookup = <T extends string>(options: Option<T>[]) =>
  Object.fromEntries(options.map((o) => [o.value, o.label])) as Record<T, string>

const LOOKUPS = {
  status: buildLookup(VEHICLE_STATUSES),
  condition: buildLookup(VEHICLE_CONDITIONS),
  bodyType: buildLookup(BODY_TYPES),
  fuelType: buildLookup(FUEL_TYPES),
  transmission: buildLookup(TRANSMISSIONS),
  driveType: buildLookup(DRIVE_TYPES),
  imageCategory: buildLookup(IMAGE_CATEGORIES),
  videoType: buildLookup(VIDEO_TYPES),
  inquiryType: buildLookup(INQUIRY_TYPES),
  inquiryStatus: buildLookup(INQUIRY_STATUSES),
  contactMethod: buildLookup(CONTACT_METHODS),
  testDriveStatus: buildLookup(TEST_DRIVE_STATUSES),
  adminRole: buildLookup(ADMIN_ROLES),
} as const

/**
 * Human label for a stored enum value, falling back to a readable version of
 * the raw value so an unknown entry degrades to "Plug In Hybrid" rather than
 * disappearing from the page.
 */
export function labelFor(group: keyof typeof LOOKUPS, value: string | null | undefined): string {
  if (!value) return ''
  const lookup = LOOKUPS[group] as Record<string, string | undefined>
  return lookup[value] ?? titleCase(value)
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
