/**
 * Vehicle detail skeleton.
 *
 * Without this the route inherits `/cars/loading.tsx` and a single listing
 * briefly renders the *inventory* skeleton - filter sidebar, card grid and a
 * "Loading vehicles" status - which is the wrong shape entirely and makes the
 * page appear to jump when the real content arrives.
 */
export default function VehicleDetailLoading() {
  return (
    <>
      <div className="bg-white">
        <div className="container-page py-4">
          <div className="shimmer h-4 w-48 rounded" />
        </div>
      </div>

      <div className="container-page pb-16 lg:pb-24">
        <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <div className="py-5">
              <div className="shimmer h-5 w-24 rounded-full" />
              <div className="shimmer mt-3 h-9 w-3/4 rounded" />
              <div className="shimmer mt-2 h-6 w-40 rounded" />
              <div className="shimmer mt-3 h-4 w-60 rounded" />
            </div>

            {/* Matches the gallery's 16/10 frame and thumbnail strip. */}
            <div className="shimmer aspect-[16/10] rounded-card" />
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="shimmer aspect-[4/3] rounded-md" />
              ))}
            </div>

            <div className="mt-6 lg:hidden">
              <div className="shimmer h-80 rounded-card" />
            </div>

            <div className="mt-10 space-y-3">
              <div className="shimmer h-6 w-56 rounded" />
              <div className="shimmer h-4 w-full rounded" />
              <div className="shimmer h-4 w-11/12 rounded" />
              <div className="shimmer h-4 w-4/5 rounded" />
            </div>

            <div className="mt-10">
              <div className="shimmer h-6 w-44 rounded" />
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index}>
                    <div className="shimmer h-3 w-20 rounded" />
                    <div className="shimmer mt-1.5 h-4 w-24 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="hidden lg:block lg:pt-5">
            <div className="shimmer h-96 rounded-card" />
          </aside>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading vehicle details
      </span>
    </>
  )
}
