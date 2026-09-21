import { Compass } from 'lucide-react'

import { ButtonLink, EmptyState } from '@/components/ui/surfaces'

export default function PublicNotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<Compass className="size-6" aria-hidden="true" />}
        title="We could not find that page"
        description="The vehicle may have been sold or the link may be out of date. Everything currently available is in the inventory."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/cars">Browse available cars</ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Contact us
            </ButtonLink>
          </div>
        }
      />
    </div>
  )
}
