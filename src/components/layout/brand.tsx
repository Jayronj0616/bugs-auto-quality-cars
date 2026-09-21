import Image from 'next/image'
import Link from 'next/link'

import type { DealershipSettings } from '@/lib/data/settings'
import { cn } from '@/lib/utils'

/**
 * Brand mark.
 *
 * Renders the uploaded dealership logo when one is configured. Until then it
 * falls back to a clean text mark rather than inventing an official logo.
 */
export function Brand({
  settings,
  tone = 'light',
  className,
  href = '/',
}: {
  settings: DealershipSettings
  /** `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark'
  className?: string
  href?: string
}) {
  const [first, ...rest] = settings.business_name.split(' ')

  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label={`${settings.business_name} home`}
    >
      {settings.logo_url ? (
        <Image
          src={settings.logo_url}
          alt={settings.business_name}
          width={168}
          height={40}
          className="h-9 w-auto object-contain"
          priority
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 items-center justify-center rounded-md font-display text-sm font-bold',
              tone === 'light' ? 'bg-accent-600 text-white' : 'bg-ink-900 text-white',
            )}
          >
            {first?.slice(0, 2).toUpperCase() ?? 'BA'}
          </span>
          <span className="flex flex-col leading-none">
            <span
              className={cn(
                'font-display text-[15px] font-bold tracking-tight',
                tone === 'light' ? 'text-white' : 'text-ink-900',
              )}
            >
              {first}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium tracking-[0.18em] uppercase',
                tone === 'light' ? 'text-white/60' : 'text-ink-500',
              )}
            >
              {rest.join(' ')}
            </span>
          </span>
        </>
      )}
    </Link>
  )
}
