import { ChatAssistant } from '@/components/chat/chat-assistant'
import { SetupNotice } from '@/components/layout/setup-notice'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getChatContext } from '@/lib/data/chat'
import { getDealershipSettings } from '@/lib/data/settings'

/**
 * Public site shell.
 *
 * Dealership settings are loaded once here and handed to the header and footer.
 * `getDealershipSettings` is request-cached, so pages that also need them (the
 * contact page, vehicle CTAs) share the same query rather than issuing another.
 */
export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const [settings, chatContext] = await Promise.all([getDealershipSettings(), getChatContext()])

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-900 focus:shadow-panel"
      >
        Skip to content
      </a>

      <SetupNotice />
      <SiteHeader settings={settings} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} />

      {/* Site-wide, so a question can be answered without leaving the page. */}
      <ChatAssistant context={chatContext} />
    </>
  )
}
