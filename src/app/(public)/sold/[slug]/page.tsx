import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/surfaces'
import { PastDealGallery } from '@/components/vehicles/past-deal-gallery'
import { getPastDealBySlug, getPublishedPastDealSlugs } from '@/lib/data/past-deals'
import { formatDate } from '@/lib/format'

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getPublishedPastDealSlugs()
  return slugs.slice(0, 200).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PageProps<'/sold/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const deal = await getPastDealBySlug(slug)

  if (!deal) {
    return { title: 'Entry not found', robots: { index: false, follow: true } }
  }

  const description = `${deal.title} - a vehicle already sold by BUGS Auto Quality Cars.`
  const image = deal.images[0]

  return {
    title: deal.title,
    description,
    alternates: { canonical: `/sold/${deal.slug}` },
    openGraph: {
      title: `${deal.title} | Sold`,
      description,
      url: `/sold/${deal.slug}`,
      type: 'website',
      images: image ? [{ url: image.url, alt: image.alt_text ?? deal.title }] : undefined,
    },
  }
}

export default async function PastDealPage({ params }: PageProps<'/sold/[slug]'>) {
  const { slug } = await params
  const deal = await getPastDealBySlug(slug)
  if (!deal) notFound()

  return (
    <div className="container-page py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
          <li className="flex items-center gap-1">
            <Link href="/" className="transition-colors hover:text-ink-800">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden="true" />
            <Link href="/sold" className="transition-colors hover:text-ink-800">
              Sold vehicles
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Badge tone="dark">Sold</Badge>
        {deal.sold_around ? (
          <span className="text-sm text-ink-600">Sold around {formatDate(deal.sold_around)}</span>
        ) : null}
      </div>

      <h1 className="mb-6 text-3xl font-bold text-ink-900 sm:text-4xl">{deal.title}</h1>

      <PastDealGallery images={deal.images} title={deal.title} />

      {deal.note ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-700 sm:text-base">
          {deal.note}
        </p>
      ) : null}

      <div className="mt-10 rounded-card border border-ink-200 bg-brand-50 p-6 text-center sm:p-8">
        <p className="text-base font-semibold text-ink-900">Looking for something similar?</p>
        <p className="mt-1.5 text-sm text-ink-600">
          This unit isn&apos;t for sale, but here&apos;s what we have available right now.
        </p>
        <ButtonLink href="/cars" className="mt-4">
          Browse current inventory
        </ButtonLink>
      </div>
    </div>
  )
}
