'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

/**
 * Search box for admin list views.
 *
 * Writes to the URL so a filtered list can be bookmarked and shared with a
 * colleague, and preserves the other parameters (status tab, page) that are
 * already there.
 */
export function AdminSearch({
  placeholder = 'Search…',
  paramName = 'q',
}: {
  placeholder?: string
  paramName?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) ?? ''

  const [value, setValue] = React.useState(current)
  const [isPending, startTransition] = React.useTransition()

  // Resync when the server sends back a different query (back button, a reset
  // link). Adjusting during render is React's pattern for resetting from props.
  const [lastQuery, setLastQuery] = React.useState(current)
  if (lastQuery !== current) {
    setLastQuery(current)
    setValue(current)
  }

  const submit = (next: string) => {
    const params = new URLSearchParams(searchParams)
    if (next.trim()) params.set(paramName, next.trim())
    else params.delete(paramName)
    // Any change to the query invalidates the current page number.
    params.delete('page')

    const query = params.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        submit(value)
      }}
      className="relative w-full sm:max-w-xs"
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-md border border-ink-300 bg-white pr-9 pl-9 text-sm transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue('')
            submit('')
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {isPending ? 'Searching' : ''}
      </span>
    </form>
  )
}
