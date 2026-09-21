'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Scroll reveal.
 *
 * Deliberately tiny: one IntersectionObserver per element, unobserved after it
 * fires, and no animation library. Content is visible by default in CSS, so it
 * is never hidden if JavaScript fails, and `prefers-reduced-motion` short
 * circuits the whole thing (see the `.reveal` utility in globals.css).
 */
export function Reveal({
  as: Component = 'div',
  delay = 0,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'section' | 'li' | 'article'
  /** Stagger, in milliseconds, for items revealed as a group. */
  delay?: number
}) {
  const ref = React.useRef<HTMLElement>(null)
  const [revealed, setRevealed] = React.useState(false)
  const Tag = Component as React.ElementType

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-revealed={revealed}
      className={cn('reveal', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}
