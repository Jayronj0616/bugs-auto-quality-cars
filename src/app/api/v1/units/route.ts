import { NextResponse } from 'next/server'

import { listSyncUnits } from '@/lib/data/unit-sync'
import { isAuthorizedSync } from '@/lib/unit-sync-auth'

export const dynamic = 'force-dynamic'

/** The website's inventory, for the leads app's problems list. */
export async function GET(request: Request) {
  if (!isAuthorizedSync(request.headers.get('authorization'), process.env.UNITS_SYNC_SECRET)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authorized.' } }, { status: 401 })
  }
  try {
    return NextResponse.json({ data: await listSyncUnits() })
  } catch (error) {
    console.error('[units.list]', error)
    return NextResponse.json({ error: { code: 'UNAVAILABLE', message: 'Could not read the inventory.' } }, { status: 503 })
  }
}
