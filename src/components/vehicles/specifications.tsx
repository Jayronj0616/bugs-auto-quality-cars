import {
  Armchair,
  Calendar,
  Car,
  Cog,
  Fuel,
  Gauge,
  Palette,
  Settings2,
  Zap,
} from 'lucide-react'

import { labelFor } from '@/lib/constants'
import type { VehicleDetail } from '@/lib/data/vehicles'
import { formatMileage, formatNumber } from '@/lib/format'
import type { VehicleSpecificationRow } from '@/types/database'

/**
 * Specifications.
 *
 * Structured columns become the headline grid (the things every shopper
 * compares), and the free-form `vehicle_specifications` rows are grouped
 * underneath. Empty values are dropped rather than rendered as dashes.
 */
export function SpecificationGrid({ vehicle }: { vehicle: VehicleDetail }) {
  const items = [
    { icon: Calendar, label: 'Year', value: String(vehicle.year) },
    { icon: Car, label: 'Body type', value: labelFor('bodyType', vehicle.body_type) },
    { icon: Fuel, label: 'Fuel', value: labelFor('fuelType', vehicle.fuel_type) },
    { icon: Settings2, label: 'Transmission', value: labelFor('transmission', vehicle.transmission) },
    { icon: Cog, label: 'Engine', value: vehicle.engine ?? '' },
    { icon: Gauge, label: 'Drive', value: labelFor('driveType', vehicle.drive_type) },
    {
      icon: Zap,
      label: 'Power',
      value: vehicle.power_hp ? `${formatNumber(vehicle.power_hp)} hp` : '',
    },
    {
      icon: Zap,
      label: 'Torque',
      value: vehicle.torque_nm ? `${formatNumber(vehicle.torque_nm)} Nm` : '',
    },
    {
      icon: Armchair,
      label: 'Seating',
      value: vehicle.seating_capacity ? `${vehicle.seating_capacity} seats` : '',
    },
    {
      icon: Gauge,
      label: 'Mileage',
      value: vehicle.mileage !== null ? formatMileage(vehicle.mileage) : '',
    },
    { icon: Palette, label: 'Colour', value: vehicle.exterior_color ?? '' },
    { icon: Car, label: 'Condition', value: labelFor('condition', vehicle.condition) },
  ].filter((item) => item.value)

  const grouped = groupSpecifications(vehicle.specifications)

  if (items.length === 0 && grouped.length === 0) return null

  return (
    <div className="space-y-8">
      {items.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-500 uppercase">
                <item.icon className="size-3.5 text-ink-400" aria-hidden="true" />
                {item.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {grouped.map((group) => (
        <div key={group.name}>
          <h3 className="text-sm font-semibold text-ink-900">{group.name}</h3>
          <dl className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
            {group.rows.map((row) => (
              <div key={row.id} className="flex justify-between gap-6 py-2.5">
                <dt className="text-sm text-ink-600">{row.name}</dt>
                <dd className="text-right text-sm font-medium text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

function groupSpecifications(rows: VehicleSpecificationRow[]) {
  const groups = new Map<string, VehicleSpecificationRow[]>()

  for (const row of rows) {
    const key = row.group_name?.trim() || 'General'
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return [...groups.entries()].map(([name, groupRows]) => ({ name, rows: groupRows }))
}

export function FeatureList({ features }: { features: string[] }) {
  if (features.length === 0) return null

  return (
    <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-700">
          <span
            aria-hidden="true"
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-500"
          />
          {feature}
        </li>
      ))}
    </ul>
  )
}
