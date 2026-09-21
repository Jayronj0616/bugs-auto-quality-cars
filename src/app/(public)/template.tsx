/**
 * Page transition for the public site.
 *
 * A `template` remounts on every navigation (unlike a layout), so this gives
 * each page a short fade-in as it arrives. It is deliberately brief and
 * opacity-only: anything longer, or anything that moves, makes navigation feel
 * slower rather than smoother.
 *
 * `prefers-reduced-motion` collapses the duration to nothing via the global
 * rule in globals.css, so this costs nothing for anyone who has asked for less
 * movement.
 */
export default function PublicTemplate({ children }: LayoutProps<'/'>) {
  return <div className="animate-fade-in">{children}</div>
}
