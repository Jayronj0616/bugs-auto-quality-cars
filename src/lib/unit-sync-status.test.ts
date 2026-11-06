import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setUnitStatus = vi.fn()
const revalidateInventory = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/actions/revalidate', () => ({ revalidateInventory }))
vi.mock('@/lib/data/unit-sync', () => {
  class UnitNotFoundError extends Error {}
  return { UnitNotFoundError, setUnitStatus }
})

const { PUT } = await import('@/app/api/v1/units/[slug]/status/route')
const { UnitNotFoundError } = await import('@/lib/data/unit-sync')

const SECRET = 'a'.repeat(32)
const put = (body: unknown, token = SECRET) =>
  PUT(
    new Request('https://example.test/api/v1/units/x/status', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'x' }) },
  )

describe('PUT /api/v1/units/[slug]/status', () => {
  beforeEach(() => {
    vi.stubEnv('UNITS_SYNC_SECRET', SECRET)
    setUnitStatus.mockReset()
    revalidateInventory.mockReset()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('rejects a wrong token before touching anything', async () => {
    expect((await put({ status: 'sold' }, 'b'.repeat(32))).status).toBe(401)
    expect(setUnitStatus).not.toHaveBeenCalled()
  })

  it.each([[{ status: 'archived' }], [{ status: 'draft' }], [{ status: 'gone' }], [{}], [null]])('rejects the body %j', async (body) => {
    expect((await put(body)).status).toBe(400)
    expect(setUnitStatus).not.toHaveBeenCalled()
  })

  it('marks a unit sold and refreshes its pages', async () => {
    setUnitStatus.mockResolvedValue({ status: 'sold', previousStatus: 'published' })
    const res = await put({ status: 'sold' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { slug: 'x', status: 'sold', previousStatus: 'published' } })
    expect(setUnitStatus).toHaveBeenCalledWith('x', 'sold')
    expect(revalidateInventory).toHaveBeenCalledWith('x')
  })

  it('reports an unknown unit as not found', async () => {
    setUnitStatus.mockRejectedValue(new UnitNotFoundError('x'))
    expect((await put({ status: 'sold' })).status).toBe(404)
  })

  it('hides internal errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setUnitStatus.mockRejectedValue(new Error('secret database detail'))
    const res = await put({ status: 'sold' })
    expect(res.status).toBe(503)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
