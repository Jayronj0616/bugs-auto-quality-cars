/**
 * Scripted assistant.
 *
 * Deliberately not an AI: the customer picks from a fixed set of questions and
 * gets a deterministic answer. That means the dealership can never be
 * misquoted a price, promised stock it does not have, or made to invent
 * financing terms - every figure below is read from the same database rows the
 * rest of the site renders.
 *
 * Pure functions with no I/O, so the whole conversation is unit-testable.
 */

import { labelFor } from '@/lib/constants'
import { formatMileage, formatPeso, formatPesoPrecise, formatPercent, formatTime } from '@/lib/format'
import type { BusinessHour } from '@/types/database'

export type ChatVehicle = {
  id: string
  slug: string
  title: string
  price: number
  compareAtPrice: number | null
  monthly: number | null
  status: 'published' | 'reserved' | 'sold'
  condition: string
  bodyType: string | null
  fuelType: string | null
  transmission: string | null
  year: number
  mileage: number | null
  seatingCapacity: number | null
  engine: string | null
  hasPhotos: boolean
}

export type ChatContext = {
  businessName: string
  phone: string | null
  email: string | null
  facebookUrl: string | null
  address: string | null
  mapsUrl: string | null
  hours: BusinessHour[]
  financingDisclaimer: string
  responseTimeNote: string | null
  vehicles: ChatVehicle[]
  financing: { downPaymentPercent: number; termMonths: number; interestRate: number }
  providers: string[]
}

export type ChatLink = { label: string; href: string; external?: boolean }

export type ChatAnswer = {
  paragraphs: string[]
  bullets?: string[]
  links?: ChatLink[]
}

export type ChatQuestion = {
  id: string
  label: string
  answer: (context: ChatContext, vehicle: ChatVehicle | null) => ChatAnswer
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const available = (context: ChatContext) =>
  context.vehicles.filter((vehicle) => vehicle.status !== 'sold')

/** "a Sedan, a Pickup and an SUV" - used to describe stock without listing it all. */
function joinWords(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function contactLinks(context: ChatContext): ChatLink[] {
  const links: ChatLink[] = []
  if (context.phone) links.push({ label: `Call ${context.phone}`, href: `tel:${context.phone.replace(/[^\d+]/g, '')}` })
  if (context.email) links.push({ label: 'Send an email', href: `mailto:${context.email}` })
  if (context.facebookUrl) links.push({ label: 'Message on Facebook', href: context.facebookUrl, external: true })
  links.push({ label: 'Open the contact form', href: '/contact' })
  return links
}

const vehicleLink = (vehicle: ChatVehicle): ChatLink => ({
  label: `View the ${vehicle.title}`,
  href: `/cars/${vehicle.slug}`,
})

const DAY_ORDER: BusinessHour['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/* -------------------------------------------------------------------------- */
/* General questions                                                           */
/* -------------------------------------------------------------------------- */

export const GENERAL_QUESTIONS: ChatQuestion[] = [
  {
    id: 'stock',
    label: 'What cars do you have right now?',
    answer: (context) => {
      const stock = available(context)

      if (stock.length === 0) {
        return {
          paragraphs: [
            `There is nothing listed on the website at the moment. New units are added as they arrive — send us a message with what you are looking for and we will let you know when something suitable comes in.`,
          ],
          links: contactLinks(context),
        }
      }

      const bodyTypes = [...new Set(stock.map((v) => labelFor('bodyType', v.bodyType)).filter(Boolean))]
      const cheapest = Math.min(...stock.map((v) => v.price))

      return {
        paragraphs: [
          `We have ${stock.length} ${stock.length === 1 ? 'vehicle' : 'vehicles'} available right now, starting from ${formatPeso(cheapest)}.`,
          bodyTypes.length > 0 ? `That includes ${joinWords(bodyTypes)}.` : '',
        ].filter(Boolean),
        bullets: stock.slice(0, 5).map((v) => `${v.title} — ${formatPeso(v.price)}`),
        links: [{ label: 'Browse the full inventory', href: '/cars' }],
      }
    },
  },
  {
    id: 'price-range',
    label: 'What is your price range?',
    answer: (context) => {
      const stock = available(context)
      if (stock.length === 0) {
        return {
          paragraphs: ['No vehicles are listed at the moment, so there is no price range to quote yet.'],
          links: contactLinks(context),
        }
      }

      const prices = stock.map((v) => v.price)
      const low = Math.min(...prices)
      const high = Math.max(...prices)

      return {
        paragraphs: [
          low === high
            ? `The one vehicle currently listed is ${formatPeso(low)}.`
            : `Our listings run from ${formatPeso(low)} to ${formatPeso(high)}.`,
          'Every listing shows its cash price and an estimated monthly payment, so you can compare before visiting.',
        ],
        links: [
          { label: 'Sort by lowest price', href: '/cars?sort=price_asc' },
          { label: 'Browse everything', href: '/cars' },
        ],
      }
    },
  },
  {
    id: 'financing',
    label: 'How does financing work?',
    answer: (context) => {
      const { downPaymentPercent, termMonths, interestRate } = context.financing

      return {
        paragraphs: [
          `You pay a down payment, and the balance is spread over monthly instalments. Our calculator opens at ${formatPercent(downPaymentPercent)} down over ${termMonths} months at an indicative ${formatPercent(interestRate)}, and you can change any of those.`,
          context.providers.length > 0
            ? `We work with ${joinWords(context.providers)}.`
            : 'Tell us which bank you prefer and we will check what terms are available.',
          context.financingDisclaimer,
        ],
        links: [{ label: 'Open the financing calculator', href: '/financing' }],
      }
    },
  },
  {
    id: 'requirements',
    label: 'What do I need to apply for financing?',
    answer: (context) => ({
      paragraphs: [
        'Requirements vary by provider, but you will generally be asked for the following. We will confirm the exact list for whichever bank you choose before you prepare anything.',
      ],
      bullets: [
        'A valid government-issued ID',
        'Proof of income — payslips, an ITR, or bank statements if self-employed',
        'Proof of billing at your current address',
        'For business applicants: business registration and financial statements',
      ],
      links: contactLinks(context),
    }),
  },
  {
    id: 'test-drive',
    label: 'Can I book a test drive?',
    answer: (context) => {
      const stock = available(context)
      return {
        paragraphs: [
          'Yes. Open any vehicle and use "Book a test drive" — tell us your preferred date and time and we will confirm the schedule with you.',
          'A request is not a confirmed booking until we have contacted you.',
        ],
        links:
          stock.length > 0
            ? [vehicleLink(stock[0]), { label: 'Browse all vehicles', href: '/cars' }]
            : [{ label: 'Browse all vehicles', href: '/cars' }],
      }
    },
  },
  {
    id: 'trade-in',
    label: 'Do you accept trade-ins?',
    answer: (context) => ({
      paragraphs: [
        'Send us the details of your current vehicle — make, model, year, mileage and condition — and we will tell you what we can offer against a unit you are interested in.',
        'Choose "Trade-In" as the inquiry type so it reaches the right person.',
      ],
      links: [{ label: 'Send a trade-in inquiry', href: '/contact' }, ...contactLinks(context).slice(0, 2)],
    }),
  },
  {
    id: 'location',
    label: 'Where are you located?',
    answer: (context) => {
      if (!context.address) {
        return {
          paragraphs: [
            'Our address has not been published on the site yet. Message us and we will send you directions.',
          ],
          links: contactLinks(context),
        }
      }

      return {
        paragraphs: [`You can find us at ${context.address}.`],
        links: [
          ...(context.mapsUrl ? [{ label: 'Get directions', href: context.mapsUrl, external: true }] : []),
          { label: 'See the contact page', href: '/contact' },
        ],
      }
    },
  },
  {
    id: 'hours',
    label: 'What are your opening hours?',
    answer: (context) => {
      if (context.hours.length === 0) {
        return {
          paragraphs: ['Our opening hours are not published yet — please message us to arrange a visit.'],
          links: contactLinks(context),
        }
      }

      const sorted = [...context.hours].sort(
        (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
      )

      return {
        paragraphs: ['Here are our opening hours:'],
        bullets: sorted.map((entry) => {
          const day = entry.day.charAt(0).toUpperCase() + entry.day.slice(1)
          return entry.closed
            ? `${day} — Closed`
            : `${day} — ${formatTime(entry.open)} to ${formatTime(entry.close)}`
        }),
        links: [{ label: 'See the contact page', href: '/contact' }],
      }
    },
  },
  {
    id: 'contact',
    label: 'How do I contact a real person?',
    answer: (context) => ({
      paragraphs: [
        context.phone
          ? `The fastest way is to call ${context.phone}.`
          : 'Send us a message through the contact form and a representative will get back to you.',
        context.responseTimeNote ?? 'We reply to every inquiry — a representative will be in touch.',
      ],
      links: contactLinks(context),
    }),
  },
]

/* -------------------------------------------------------------------------- */
/* Vehicle-specific questions                                                  */
/* -------------------------------------------------------------------------- */

export const VEHICLE_QUESTIONS: ChatQuestion[] = [
  {
    id: 'v-available',
    label: 'Is this still available?',
    answer: (context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      if (vehicle.status === 'sold') {
        const alternatives = available(context)
          .filter((v) => v.bodyType === vehicle.bodyType)
          .slice(0, 3)

        return {
          paragraphs: [
            `The ${vehicle.title} has been sold.`,
            alternatives.length > 0
              ? 'Here are similar units that are still available:'
              : 'Send us a message and we will tell you when something similar arrives.',
          ],
          bullets: alternatives.map((v) => `${v.title} — ${formatPeso(v.price)}`),
          links: alternatives.length > 0 ? alternatives.map(vehicleLink) : contactLinks(context),
        }
      }

      if (vehicle.status === 'reserved') {
        return {
          paragraphs: [
            `The ${vehicle.title} is currently reserved for another customer.`,
            'Reservations do sometimes fall through, so it is worth sending an inquiry to be next in line.',
          ],
          links: [vehicleLink(vehicle), ...contactLinks(context).slice(0, 2)],
        }
      }

      return {
        paragraphs: [
          `Yes — the ${vehicle.title} is available at ${formatPeso(vehicle.price)}.`,
          'Availability changes quickly, so send an inquiry to hold it while we talk.',
        ],
        links: [vehicleLink(vehicle), ...contactLinks(context).slice(0, 2)],
      }
    },
  },
  {
    id: 'v-price',
    label: 'How much is it?',
    answer: (_context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      const paragraphs = [`The ${vehicle.title} is ${formatPeso(vehicle.price)} cash.`]
      if (vehicle.compareAtPrice && vehicle.compareAtPrice > vehicle.price) {
        paragraphs.push(
          `That is down from ${formatPeso(vehicle.compareAtPrice)} — a saving of ${formatPeso(vehicle.compareAtPrice - vehicle.price)}.`,
        )
      }
      paragraphs.push(
        'Registration, insurance and other charges are quoted separately and confirmed before any payment.',
      )

      return { paragraphs, links: [vehicleLink(vehicle)] }
    },
  },
  {
    id: 'v-monthly',
    label: 'What would the monthly payment be?',
    answer: (context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      if (!vehicle.monthly) {
        return {
          paragraphs: [
            'I cannot estimate a monthly payment for this unit. Open the calculator and enter the figures you have in mind.',
          ],
          links: [{ label: 'Open the calculator', href: '/financing' }],
        }
      }

      const { downPaymentPercent, termMonths } = context.financing
      const downPayment = (vehicle.price * downPaymentPercent) / 100

      return {
        paragraphs: [
          `At ${formatPercent(downPaymentPercent)} down (${formatPeso(downPayment)}) over ${termMonths} months, the ${vehicle.title} works out to roughly ${formatPesoPrecise(vehicle.monthly)} per month.`,
          context.financingDisclaimer,
        ],
        links: [
          vehicleLink(vehicle),
          { label: 'Adjust the figures yourself', href: '/financing' },
        ],
      }
    },
  },
  {
    id: 'v-specs',
    label: 'What are the specifications?',
    answer: (_context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      const bullets = [
        `Year — ${vehicle.year}`,
        vehicle.bodyType ? `Body type — ${labelFor('bodyType', vehicle.bodyType)}` : '',
        vehicle.fuelType ? `Fuel — ${labelFor('fuelType', vehicle.fuelType)}` : '',
        vehicle.transmission ? `Transmission — ${labelFor('transmission', vehicle.transmission)}` : '',
        vehicle.engine ? `Engine — ${vehicle.engine}` : '',
        vehicle.seatingCapacity ? `Seating — ${vehicle.seatingCapacity}` : '',
        vehicle.mileage !== null ? `Mileage — ${formatMileage(vehicle.mileage)}` : '',
        `Condition — ${labelFor('condition', vehicle.condition)}`,
      ].filter(Boolean)

      return {
        paragraphs: [`Here is the summary for the ${vehicle.title}:`],
        bullets,
        links: [{ label: 'See the full specifications', href: `/cars/${vehicle.slug}` }],
      }
    },
  },
  {
    id: 'v-photos',
    label: 'Can I see photos?',
    answer: (context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      return {
        paragraphs: vehicle.hasPhotos
          ? [`Yes — the listing has a full photo gallery you can open fullscreen.`]
          : [
              `Photos for the ${vehicle.title} have not been uploaded yet. Message us and we will send you pictures directly.`,
            ],
        links: vehicle.hasPhotos ? [vehicleLink(vehicle)] : contactLinks(context),
      }
    },
  },
  {
    id: 'v-test-drive',
    label: 'Can I test drive this one?',
    answer: (context, vehicle) => {
      if (!vehicle) return { paragraphs: ['Pick a vehicle first and I can check.'] }

      if (vehicle.status === 'sold') {
        return {
          paragraphs: [`The ${vehicle.title} has been sold, so it is no longer available to drive.`],
          links: [{ label: 'See what is available', href: '/cars' }],
        }
      }

      return {
        paragraphs: [
          `Yes. Open the ${vehicle.title} and use "Book a test drive" — choose a date and time and we will confirm with you.`,
        ],
        links: [vehicleLink(vehicle), ...contactLinks(context).slice(0, 1)],
      }
    },
  },
]

export const ALL_QUESTIONS = [...GENERAL_QUESTIONS, ...VEHICLE_QUESTIONS]

export function findQuestion(id: string): ChatQuestion | undefined {
  return ALL_QUESTIONS.find((question) => question.id === id)
}

/** The assistant's opening line, which reflects what is actually in stock. */
export function greeting(context: ChatContext): ChatAnswer {
  const stock = available(context)

  return {
    paragraphs: [
      `Hi! I can answer common questions about ${context.businessName}.`,
      stock.length > 0
        ? `There ${stock.length === 1 ? 'is' : 'are'} ${stock.length} ${stock.length === 1 ? 'vehicle' : 'vehicles'} available right now. Pick a question below, or choose a car to ask about it directly.`
        : 'Pick a question below to get started.',
    ],
  }
}
