import { NextResponse } from 'next/server'
import { z } from 'zod'

import { revalidateInventory } from '@/lib/actions/revalidate'
import { UnitNotFoundError, setUnitPrice } from '@/lib/data/unit-sync'
import { isAuthorizedSync } from '@/lib/unit-sync-auth'

export const dynamic = 'force-dynamic'

const bodySchema = z.strictObject({ price: z.number().positive().max(9_999_999_999) })

/** Sets a unit's price from the leads app, and refreshes the pages that show it. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isAuthorizedSync(request.headers.get('authorization'), process.env.UNITS_SYNC_SECRET)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authorized.' } }, { status: 401 })
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Send a price above zero.' } }, { status: 400 })
  }

  const { slug } = await params
  try {
    const result = await setUnitPrice(slug, body.data.price)
    revalidateInventory(slug)
    return NextResponse.json({ data: { slug, ...result } })
  } catch (error) {
    if (error instanceof UnitNotFoundError) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No unit with that link.' } }, { status: 404 })
    }
    console.error('[units.price]', error)
    return NextResponse.json({ error: { code: 'UNAVAILABLE', message: 'Could not save the price.' } }, { status: 503 })
  }
}
