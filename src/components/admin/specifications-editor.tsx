'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { saveSpecifications } from '@/lib/actions/vehicles'
import type { VehicleSpecificationRow } from '@/types/database'

type Draft = { key: string; groupName: string; name: string; value: string }

/**
 * Additional specification rows.
 *
 * The frequently compared attributes (fuel, transmission, power…) are real
 * columns on the vehicle and live in the main form. This covers everything
 * else - ground clearance, battery capacity, towing capacity - as free-form
 * name/value pairs, grouped so a long list stays readable on the listing.
 */
export function SpecificationsEditor({
  vehicleId,
  specifications,
}: {
  vehicleId: string
  specifications: VehicleSpecificationRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  const [rows, setRows] = React.useState<Draft[]>(() =>
    specifications.map((spec) => ({
      key: spec.id,
      groupName: spec.group_name,
      name: spec.name,
      value: spec.value,
    })),
  )

  const update = (key: string, patch: Partial<Draft>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const remove = (key: string) => setRows((current) => current.filter((row) => row.key !== key))

  const add = () =>
    setRows((current) => [
      ...current,
      { key: crypto.randomUUID(), groupName: 'General', name: '', value: '' },
    ])

  function save() {
    setError(null)
    setSaved(false)

    // Blank rows are how an admin abandons one mid-edit; drop them rather than
    // failing validation on something they already decided against.
    const payload = rows
      .filter((row) => row.name.trim() && row.value.trim())
      .map((row) => ({
        groupName: row.groupName.trim() || 'General',
        name: row.name.trim(),
        value: row.value.trim(),
      }))

    const seen = new Set<string>()
    for (const row of payload) {
      const key = `${row.groupName.toLowerCase()}::${row.name.toLowerCase()}`
      if (seen.has(key)) {
        setError(`"${row.name}" appears twice in the ${row.groupName} group. Names must be unique.`)
        return
      }
      seen.add(key)
    }

    startTransition(async () => {
      const result = await saveSpecifications({ vehicleId, specifications: payload })
      if (result.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="Additional specifications"
        description="Anything not covered by the fields above. Grouped rows appear together on the listing."
        action={
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="size-4" aria-hidden="true" />
            Add row
          </Button>
        }
      />

      <CardBody className="space-y-3">
        {error ? (
          <Alert tone="danger" title="Could not save">
            {error}
          </Alert>
        ) : null}
        {saved && !error ? <Alert tone="success">Specifications saved.</Alert> : null}

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-500">
            No extra specifications yet. Add rows like &ldquo;Ground clearance / 170 mm&rdquo;.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.key} className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]">
                <Input
                  value={row.groupName}
                  onChange={(event) => update(row.key, { groupName: event.target.value })}
                  aria-label="Group"
                  placeholder="Group"
                  maxLength={60}
                />
                <Input
                  value={row.name}
                  onChange={(event) => update(row.key, { name: event.target.value })}
                  aria-label="Specification name"
                  placeholder="Ground clearance"
                  maxLength={80}
                />
                <Input
                  value={row.value}
                  onChange={(event) => update(row.key, { value: event.target.value })}
                  aria-label="Specification value"
                  placeholder="170 mm"
                  maxLength={160}
                />
                <button
                  type="button"
                  onClick={() => remove(row.key)}
                  aria-label={`Remove ${row.name || 'this row'}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" onClick={save} isLoading={isPending} loadingText="Saving…">
            <Save className="size-4" aria-hidden="true" />
            Save specifications
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
