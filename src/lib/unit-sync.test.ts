import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setUnitPrice = vi.fn()
const revalidateInventory = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/actions/revalidate', () => ({ revalidateInventory }))
vi.mock('@/lib/data/unit-sync', () => {
  class UnitNotFoundError extends Error {}
  return { UnitNotFoundError, setUnitPrice, listSyncUnits: vi.fn(async () => []) }
})

const { isAuthorizedSync } = await import('./unit-sync-auth')
const { PUT } = await import('@/app/api/v1/units/[slug]/price/route')
const { UnitNotFoundError } = await import('@/lib/data/unit-sync')

const SECRET = 'a'.repeat(32)
const put = (body: unknown, token = SECRET) =>
  PUT(
    new Request('https://example.test/api/v1/units/x/price', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'x' }) },
  )

describe('isAuthorizedSync', () => {
  it('accepts only the exact bearer token', () => {
    expect(isAuthorizedSync(`Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(isAuthorizedSync(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(isAuthorizedSync(SECRET, SECRET)).toBe(false)
    expect(isAuthorizedSync(null, SECRET)).toBe(false)
  })

  it('stays closed when no strong secret is configured', () => {
    expect(isAuthorizedSync('Bearer ', undefined)).toBe(false)
    expect(isAuthorizedSync('Bearer short', 'short')).toBe(false)
  })
})

describe('PUT /api/v1/units/[slug]/price', () => {
  beforeEach(() => {
    vi.stubEnv('UNITS_SYNC_SECRET', SECRET)
    setUnitPrice.mockReset()
    revalidateInventory.mockReset()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('rejects a wrong token before touching anything', async () => {
    const res = await put({ price: 1 }, 'b'.repeat(32))
    expect(res.status).toBe(401)
    expect(setUnitPrice).not.toHaveBeenCalled()
  })

  it.each([[{ price: 0 }], [{ price: -5 }], [{ price: '780000' }], [{ price: 1, extra: true }], [null]])(
    'rejects the body %j',
    async (body) => {
      expect((await put(body)).status).toBe(400)
      expect(setUnitPrice).not.toHaveBeenCalled()
    },
  )

  it('saves the price and refreshes the pages', async () => {
    setUnitPrice.mockResolvedValue({ price: 780000, previousPrice: 800000 })
    const res = await put({ price: 780000 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { slug: 'x', price: 780000, previousPrice: 800000 } })
    expect(setUnitPrice).toHaveBeenCalledWith('x', 780000)
    expect(revalidateInventory).toHaveBeenCalledWith('x')
  })

  it('reports an unknown unit as not found', async () => {
    setUnitPrice.mockRejectedValue(new UnitNotFoundError('x'))
    expect((await put({ price: 1 })).status).toBe(404)
    expect(revalidateInventory).not.toHaveBeenCalled()
  })

  it('hides internal errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setUnitPrice.mockRejectedValue(new Error('secret database detail'))
    const res = await put({ price: 1 })
    expect(res.status).toBe(503)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
