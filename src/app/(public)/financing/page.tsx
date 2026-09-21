import type { Metadata } from 'next'
import { CircleHelp, Info, Landmark } from 'lucide-react'

import { FinancingCalculator } from '@/components/financing/financing-calculator'
import { Reveal } from '@/components/ui/reveal'
import { ButtonLink, Card, CardBody, EmptyState, SectionHeading } from '@/components/ui/surfaces'
import { getFinancingConfiguration } from '@/lib/data/financing'
import { getDealershipSettings } from '@/lib/data/settings'
import { getInventoryFacets } from '@/lib/data/vehicles'
import { formatPercent, formatPesoCompact } from '@/lib/format'

export const revalidate = 600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDealershipSettings()

  return {
    title: 'Financing calculator',
    description: `Estimate a monthly payment on any vehicle at ${settings.business_name}. Set your down payment, loan term and interest rate to see what it would cost.`,
    alternates: { canonical: '/financing' },
  }
}

const FAQ = [
  {
    question: 'How is the estimate calculated?',
    answer:
      'We use the standard amortised loan formula: the amount financed is spread across your chosen term at the interest rate shown, so each monthly payment covers both interest and principal. A zero-interest promo simply divides the amount financed by the number of months.',
  },
  {
    question: 'Is this the amount I will actually pay?',
    answer:
      'No. It is an estimate based on the figures you entered. Your actual rate, term and approval depend on the financing provider and your own qualifications, and there are usually additional charges such as registration, insurance and chattel mortgage fees.',
  },
  {
    question: 'What do I need to apply?',
    answer:
      'Requirements vary by provider, but usually include a valid ID, proof of income and proof of billing. Send us an inquiry and we will tell you exactly what your chosen provider asks for.',
  },
  {
    question: 'Can I pay a larger down payment?',
    answer:
      'Yes, and it is usually worth it. A bigger down payment reduces the amount financed, which lowers both the monthly payment and the total interest you pay over the term.',
  },
]

export default async function FinancingPage() {
  const settings = await getDealershipSettings()
  const [configuration, facets] = await Promise.all([
    getFinancingConfiguration(settings),
    getInventoryFacets(),
  ])

  // Open on something realistic rather than zero: the mid-point of the actual
  // inventory is a better starting guess than an empty field.
  const startingPrice = facets.priceRange
    ? Math.round((facets.priceRange.min + facets.priceRange.max) / 2 / 10_000) * 10_000
    : 1_000_000

  return (
    <>
      <header className="bg-brand-900 text-white">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow text-accent-300">Financing</p>
          <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
            Work out the monthly payment before you visit.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Set a price, a down payment and a term, and see what it would cost each month. When the
            numbers work, send us an inquiry and we will handle the rest.
          </p>
        </div>
      </header>

      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-14">
          <div>
            <Card>
              <CardBody>
                <h2 className="mb-5 text-lg font-semibold text-ink-900">Estimate a payment</h2>
                <FinancingCalculator
                  configuration={configuration}
                  initialPrice={startingPrice}
                  priceEditable
                />
              </CardBody>
            </Card>

            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/cars" variant="outline" fullWidth className="sm:w-auto">
                Browse vehicles
              </ButtonLink>
              <ButtonLink href="/contact" fullWidth className="sm:w-auto">
                Ask about financing
              </ButtonLink>
            </div>
          </div>

          <div className="min-w-0 space-y-12">
            <Reveal>
              <SectionHeading
                eyebrow="Partners"
                title="Financing options"
                description="The providers we work with, and the terms currently configured."
              />

              {configuration.options.length > 0 ? (
                <ul className="mt-6 space-y-4">
                  {configuration.options.map((option) => (
                    <li
                      key={option.provider.id}
                      className="rounded-card border border-ink-200 bg-white p-5 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-ink-900">
                            {option.provider.name}
                          </h3>
                          {option.provider.description ? (
                            <p className="mt-1 text-sm leading-relaxed text-ink-600">
                              {option.provider.description}
                            </p>
                          ) : null}
                        </div>
                        <Landmark className="size-5 shrink-0 text-ink-300" aria-hidden="true" />
                      </div>

                      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-3.5 text-sm">
                        {option.terms.map((term) => (
                          <div key={term.termMonths}>
                            <dt className="text-xs text-ink-500">{term.termMonths} months</dt>
                            <dd className="tabular font-semibold text-ink-900">
                              {formatPercent(term.interestRate)}
                              <span className="ml-1 text-xs font-normal text-ink-500">
                                min {formatPercent(term.minimumDownPaymentPercent)} down
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="mt-6"
                  icon={<Landmark className="size-6" aria-hidden="true" />}
                  title="Financing partners not published yet"
                  description={`The calculator uses our standard indicative rate of ${formatPercent(settings.default_interest_rate)}. Contact us and we will walk you through the options available for the unit you are interested in.`}
                  action={<ButtonLink href="/contact">Ask about financing</ButtonLink>}
                />
              )}
            </Reveal>

            <Reveal>
              <div className="flex items-start gap-3 rounded-card border border-ink-200 bg-ink-100/60 p-5">
                <Info className="mt-0.5 size-5 shrink-0 text-ink-500" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">Important</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">
                    {configuration.disclaimer}
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <SectionHeading eyebrow="Questions" title="How financing works" />
              <dl className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
                {FAQ.map((entry) => (
                  <div key={entry.question} className="py-5">
                    <dt className="flex items-start gap-2.5 text-base font-semibold text-ink-900">
                      <CircleHelp
                        className="mt-0.5 size-4 shrink-0 text-accent-700"
                        aria-hidden="true"
                      />
                      {entry.question}
                    </dt>
                    <dd className="mt-2 pl-6.5 text-sm leading-relaxed text-ink-600">
                      {entry.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {facets.priceRange ? (
              <Reveal>
                <div className="rounded-card bg-brand-900 p-6 text-white sm:p-8">
                  <h2 className="text-xl font-semibold sm:text-2xl">
                    Vehicles from {formatPesoCompact(facets.priceRange.min)}
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                    Every listing shows its cash price and an estimated monthly payment, so you can
                    compare without doing the maths twice.
                  </p>
                  <ButtonLink href="/cars" variant="inverted" className="mt-6">
                    Browse the inventory
                  </ButtonLink>
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
