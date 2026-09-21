/**
 * Typed shape of the `public` schema, mirroring supabase/migrations.
 *
 * Regenerate from a live database with `npm run db:types`; the hand-written
 * version below keeps the app type-safe before a database is reachable.
 */

/**
 * Columns Postgres computes itself. `search_text` is GENERATED ALWAYS and
 * `singleton` exists purely to enforce the one-row settings table, so writing
 * to either is always an error.
 */
type ComputedColumn = 'search_text' | 'filter_price' | 'singleton'

/**
 * Writes are modelled as partials. Column *names* are still checked, which is
 * what catches typos and schema drift; whether a value is actually required is
 * enforced where it belongs - by the Zod schemas in `src/lib/validation` and by
 * the NOT NULL / CHECK constraints in the migrations.
 */
type Writable<Row> = Partial<Omit<Row, ComputedColumn & keyof Row>>

type TableDef<Row> = {
  Row: Row
  Insert: Writable<Row>
  Update: Writable<Row>
  Relationships: []
}

/* -------------------------------------------------------------------------- */
/* Enum-like unions (text + CHECK constraint in Postgres)                     */
/* -------------------------------------------------------------------------- */

export type AdminRole = 'super_admin' | 'admin' | 'sales' | 'content_manager'

export type VehicleStatus =
  | 'draft'
  | 'published'
  | 'reserved'
  | 'sold'
  | 'archived'

export type VehicleCondition = 'brand_new' | 'used' | 'certified_pre_owned'

export type BodyType =
  | 'sedan'
  | 'hatchback'
  | 'suv'
  | 'crossover'
  | 'mpv'
  | 'pickup'
  | 'van'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'truck'
  | 'motorcycle'
  | 'scooter'
  | 'other'

export type FuelType =
  | 'gasoline'
  | 'diesel'
  | 'hybrid'
  | 'plug_in_hybrid'
  | 'electric'
  | 'lpg'
  | 'other'

export type TransmissionType =
  | 'automatic'
  | 'manual'
  | 'cvt'
  | 'dct'
  | 'amt'
  | 'other'

export type DriveType = 'fwd' | 'rwd' | 'awd' | '4wd' | 'other'

export type ImageCategory =
  | 'exterior'
  | 'interior'
  | 'dashboard'
  | 'engine'
  | 'features'
  | 'other'

export type VideoProvider = 'youtube' | 'vimeo' | 'facebook' | 'file' | 'other'

export type VideoType =
  | 'walkaround'
  | 'interior'
  | 'exterior'
  | 'driving'
  | 'features'
  | 'promotion'
  | 'other'

export type InquiryType =
  | 'general'
  | 'vehicle'
  | 'cash_purchase'
  | 'installment'
  | 'financing'
  | 'test_drive'
  | 'trade_in'
  | 'other'

export type InquiryStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiating'
  | 'converted'
  | 'closed'
  | 'cancelled'

export type ContactMethod = 'phone' | 'email' | 'messenger' | 'any'

export type TestDriveStatus =
  | 'pending'
  | 'contacted'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'

export type AdminCapability =
  | 'inventory'
  | 'crm'
  | 'financing'
  | 'settings'
  | 'users'

/* -------------------------------------------------------------------------- */
/* Row types                                                                  */
/* -------------------------------------------------------------------------- */

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: AdminRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BusinessHour = {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
  open: string
  close: string
  closed: boolean
}

export type DealershipSettingsRow = {
  id: string
  singleton: boolean
  business_name: string
  tagline: string | null
  about: string | null
  phone: string | null
  phone_secondary: string | null
  email: string | null
  facebook_url: string | null
  messenger_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  viber_number: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country: string | null
  google_maps_url: string | null
  google_maps_embed_url: string | null
  business_hours: BusinessHour[]
  logo_url: string | null
  hero_image_url: string | null
  response_time_note: string | null
  default_interest_rate: number
  default_down_payment_percent: number
  default_term_months: number
  financing_disclaimer: string
  created_at: string
  updated_at: string
}

export type VehicleRow = {
  id: string
  brand: string
  model: string
  variant: string | null
  slug: string
  year: number
  condition: VehicleCondition
  body_type: BodyType | null
  fuel_type: FuelType | null
  transmission: TransmissionType | null
  drive_type: DriveType | null
  seating_capacity: number | null
  mileage: number | null
  exterior_color: string | null
  interior_color: string | null
  plate_ending: string | null
  engine: string | null
  power_hp: number | null
  torque_nm: number | null
  description: string | null
  features: string[]
  srp: number | null
  selling_price: number
  promo_price: number | null
  promo_label: string | null
  promo_starts_at: string | null
  promo_ends_at: string | null
  default_down_payment_percent: number | null
  default_term_months: number | null
  status: VehicleStatus
  is_featured: boolean
  is_promoted: boolean
  view_count: number
  meta_title: string | null
  meta_description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  /** coalesce(promo_price, selling_price) - what the inventory filters on. */
  filter_price: number
  search_text: string
}

export type VehicleImageRow = {
  id: string
  vehicle_id: string
  storage_path: string | null
  url: string
  alt_text: string | null
  category: ImageCategory
  sort_order: number
  is_primary: boolean
  width: number | null
  height: number | null
  file_size: number | null
  created_at: string
}

export type VehicleVideoRow = {
  id: string
  vehicle_id: string
  title: string
  video_url: string
  provider: VideoProvider
  external_id: string | null
  thumbnail_url: string | null
  video_type: VideoType
  sort_order: number
  created_at: string
  updated_at: string
}

export type VehicleSpecificationRow = {
  id: string
  vehicle_id: string
  group_name: string
  name: string
  value: string
  sort_order: number
  created_at: string
}

export type FinancingProviderRow = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type FinancingRateRow = {
  id: string
  provider_id: string
  vehicle_id: string | null
  term_months: number
  interest_rate: number
  minimum_down_payment_percent: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

export type InquiryRow = {
  id: string
  reference: string
  customer_name: string
  customer_email: string | null
  customer_phone: string
  vehicle_id: string | null
  vehicle_label: string | null
  inquiry_type: InquiryType
  message: string
  preferred_contact_method: ContactMethod
  preferred_contact_date: string | null
  vehicle_price_at_inquiry: number | null
  down_payment_amount: number | null
  down_payment_percent: number | null
  loan_term_months: number | null
  interest_rate: number | null
  estimated_monthly_payment: number | null
  financing_provider_id: string | null
  status: InquiryStatus
  source_path: string | null
  created_at: string
  updated_at: string
}

export type TestDriveRequestRow = {
  id: string
  reference: string
  vehicle_id: string | null
  vehicle_label: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string
  preferred_date: string
  preferred_time: string
  confirmed_date: string | null
  confirmed_time: string | null
  message: string | null
  status: TestDriveStatus
  created_at: string
  updated_at: string
}

export type AdminNoteRow = {
  id: string
  inquiry_id: string | null
  test_drive_request_id: string | null
  admin_user_id: string | null
  author_name: string | null
  note: string
  created_at: string
}

export type ActivityLogRow = {
  id: string
  admin_user_id: string | null
  actor_name: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Database                                                                   */
/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      admin_users: TableDef<AdminUserRow>
      dealership_settings: TableDef<DealershipSettingsRow>
      vehicles: TableDef<VehicleRow>
      vehicle_images: TableDef<VehicleImageRow>
      vehicle_videos: TableDef<VehicleVideoRow>
      vehicle_specifications: TableDef<VehicleSpecificationRow>
      financing_providers: TableDef<FinancingProviderRow>
      financing_rates: TableDef<FinancingRateRow>
      inquiries: TableDef<InquiryRow>
      test_drive_requests: TableDef<TestDriveRequestRow>
      admin_notes: TableDef<AdminNoteRow>
      activity_logs: TableDef<ActivityLogRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
