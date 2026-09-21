import { describe, expect, it } from 'vitest'

import {
  GENERAL_QUESTIONS,
  VEHICLE_QUESTIONS,
  findQuestion,
  greeting,
  type ChatContext,
  type ChatVehicle,
} from './script'

/**
 * The assistant answers customers directly, so the thing worth pinning down is
 * that it never invents anything: no price that is not in the data, no claim of
 * availability for a sold unit, and no crash when the dealership has not
 * configured its contact details yet.
 */

const vehicle = (overrides: Partial<ChatVehicle> = {}): ChatVehicle => ({
  id: 'v1',
  slug: 'toyota-vios-2025',
  title: '2025 Toyota Vios 1.3 XLE',
  price: 985_000,
  compareAtPrice: null,
  monthly: 15_789.9,
  status: 'published',
  condition: 'brand_new',
  bodyType: 'sedan',
  fuelType: 'gasoline',
  transmission: 'cvt',
  year: 2025,
  mileage: null,
  seatingCapacity: 5,
  engine: '1.3L Dual VVT-i',
  hasPhotos: true,
  ...overrides,
})

const context = (overrides: Partial<ChatContext> = {}): ChatContext => ({
  businessName: 'BUGS Auto Quality Cars',
  phone: '+63 917 555 0101',
  email: 'hello@example.com',
  facebookUrl: 'https://facebook.com/example',
  address: '123 Main Street, Manila',
  mapsUrl: 'https://maps.example.com',
  hours: [
    { day: 'monday', open: '08:00', close: '18:00', closed: false },
    { day: 'sunday', open: '09:00', close: '16:00', closed: true },
  ],
  financingDisclaimer: 'Estimated monthly payment only.',
  responseTimeNote: null,
  vehicles: [vehicle()],
  financing: { downPaymentPercent: 20, termMonths: 60, interestRate: 7.5 },
  providers: ['BDO', 'BPI'],
  ...overrides,
})

const allText = (answer: { paragraphs: string[]; bullets?: string[] }) =>
  [...answer.paragraphs, ...(answer.bullets ?? [])].join(' ')

describe('every question', () => {
  it('produces a non-empty answer with and without a selected vehicle', () => {
    for (const question of [...GENERAL_QUESTIONS, ...VEHICLE_QUESTIONS]) {
      for (const selected of [null, vehicle()]) {
        const answer = question.answer(context(), selected)
        expect(answer.paragraphs.length, `${question.id} produced no paragraphs`).toBeGreaterThan(0)
        expect(answer.paragraphs.every((p) => p.trim().length > 0)).toBe(true)
      }
    }
  })

  it('survives a dealership with nothing configured and no stock', () => {
    const bare = context({
      phone: null,
      email: null,
      facebookUrl: null,
      address: null,
      mapsUrl: null,
      hours: [],
      vehicles: [],
      providers: [],
      responseTimeNote: null,
    })

    for (const question of [...GENERAL_QUESTIONS, ...VEHICLE_QUESTIONS]) {
      const answer = question.answer(bare, null)
      expect(answer.paragraphs.length).toBeGreaterThan(0)
      // No half-built sentences from a missing value.
      expect(allText(answer)).not.toMatch(/undefined|null|NaN|₱NaN/)
    }
  })

  it('has unique ids so a lookup is unambiguous', () => {
    const ids = [...GENERAL_QUESTIONS, ...VEHICLE_QUESTIONS].map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findQuestion('stock')?.id).toBe('stock')
    expect(findQuestion('does-not-exist')).toBeUndefined()
  })
})

describe('availability', () => {
  it('does not offer a sold vehicle as available', () => {
    const sold = vehicle({ status: 'sold' })
    const answer = findQuestion('v-available')!.answer(context({ vehicles: [sold] }), sold)

    expect(allText(answer)).toMatch(/has been sold/i)
    expect(allText(answer)).not.toMatch(/Yes — the/)
  })

  it('is honest that a reserved vehicle is not free', () => {
    const reserved = vehicle({ status: 'reserved' })
    const answer = findQuestion('v-available')!.answer(context({ vehicles: [reserved] }), reserved)
    expect(allText(answer)).toMatch(/reserved/i)
  })

  it('excludes sold units from the stock count', () => {
    const answer = findQuestion('stock')!.answer(
      context({ vehicles: [vehicle(), vehicle({ id: 'v2', status: 'sold' })] }),
      null,
    )
    expect(allText(answer)).toMatch(/1 vehicle/)
  })

  it('suggests similar available units when the chosen one is sold', () => {
    const sold = vehicle({ status: 'sold' })
    const other = vehicle({ id: 'v2', slug: 'honda-city', title: '2025 Honda City' })
    const answer = findQuestion('v-available')!.answer(context({ vehicles: [sold, other] }), sold)

    expect(answer.bullets?.join(' ')).toContain('Honda City')
  })
})

describe('figures', () => {
  it('quotes the price from the data, not a guess', () => {
    const answer = findQuestion('v-price')!.answer(context(), vehicle())
    expect(allText(answer)).toContain('985,000')
  })

  it('shows the saving when there is a comparison price', () => {
    const discounted = vehicle({ price: 900_000, compareAtPrice: 985_000 })
    const answer = findQuestion('v-price')!.answer(context(), discounted)
    expect(allText(answer)).toContain('85,000')
  })

  it('always attaches the financing disclaimer to a monthly estimate', () => {
    const answer = findQuestion('v-monthly')!.answer(context(), vehicle())
    expect(allText(answer)).toContain('Estimated monthly payment only.')
  })

  it('declines to estimate rather than inventing a figure', () => {
    const answer = findQuestion('v-monthly')!.answer(context(), vehicle({ monthly: null }))
    expect(allText(answer)).toMatch(/cannot estimate/i)
  })

  it('reports the real price range', () => {
    const answer = findQuestion('price-range')!.answer(
      context({ vehicles: [vehicle({ price: 500_000 }), vehicle({ id: 'v2', price: 1_200_000 })] }),
      null,
    )
    expect(allText(answer)).toContain('500,000')
    expect(allText(answer)).toContain('1,200,000')
  })
})

describe('missing configuration', () => {
  it('does not claim an address it does not have', () => {
    const answer = findQuestion('location')!.answer(context({ address: null }), null)
    expect(allText(answer)).toMatch(/not been published/i)
  })

  it('does not invent opening hours', () => {
    const answer = findQuestion('hours')!.answer(context({ hours: [] }), null)
    expect(answer.bullets ?? []).toHaveLength(0)
    expect(allText(answer)).toMatch(/not published/i)
  })

  it('does not name financing partners that are not configured', () => {
    const answer = findQuestion('financing')!.answer(context({ providers: [] }), null)
    expect(allText(answer)).not.toMatch(/BDO|BPI/)
  })
})

describe('greeting', () => {
  it('reflects how much stock there actually is', () => {
    expect(greeting(context()).paragraphs.join(' ')).toMatch(/1 vehicle/)
    expect(greeting(context({ vehicles: [] })).paragraphs.join(' ')).not.toMatch(/\d+ vehicles/)
  })
})
