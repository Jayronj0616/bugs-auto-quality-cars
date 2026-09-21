import { VehicleCardSkeleton } from '@/components/vehicles/vehicle-card'

/**
 * Inventory skeleton.
 *
 * Mirrors the real layout - sidebar, toolbar, card grid - so the page settles
 * into place instead of reflowing when the data arrives.
 */
export default function InventoryLoading() {
  return (
    <>
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page py-10 sm:py-12">
          <div className="shimmer h-3 w-20 rounded" />
          <div className="shimmer mt-3 h-9 w-56 rounded" />
          <div className="shimmer mt-3 h-4 w-full max-w-xl rounded" />
        </div>
      </header>

      <div className="container-page py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-10">
          <div className="hidden space-y-6 lg:block" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2.5">
                <div className="shimmer h-4 w-24 rounded" />
                <div className="shimmer h-3.5 w-full rounded" />
                <div className="shimmer h-3.5 w-5/6 rounded" />
                <div className="shimmer h-3.5 w-4/6 rounded" />
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="shimmer h-11 flex-1 rounded-md" />
              <div className="shimmer h-11 w-44 rounded-md" />
            </div>

            <div className="shimmer mt-6 h-4 w-40 rounded" />

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <VehicleCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading vehicles
      </span>
    </>
  )
}
