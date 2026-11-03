import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalContact, LegalList, LegalPage, LegalSection } from '@/components/layout/legal-page'
import { getDealershipSettings } from '@/lib/data/settings'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDealershipSettings()
  return {
    title: 'Data Deletion Instructions',
    description: `How to ask ${settings.business_name} to delete the personal information we hold about you, from this website and our Facebook Page.`,
    alternates: { canonical: '/data-deletion' },
  }
}

/*
 * This is the "data deletion instructions URL" given to Meta for the Messenger
 * app. Customers never sign in to that app with Facebook - they only message
 * the Page - so deletion is by request, handled by staff.
 */
export default async function DataDeletionPage() {
  const settings = await getDealershipSettings()
  const name = settings.business_name
  const link = 'font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800'

  return (
    <LegalPage eyebrow="Legal" title="Data Deletion Instructions" updated="November 3, 2026">
      <p>
        You can ask {name} to delete the personal information we hold about you at any time. This
        covers what you sent through our website and what we received when you messaged our Facebook
        Page, including through the app we use to answer Messenger messages (&ldquo;Bugs Auto
        Leads&rdquo;).
      </p>

      <LegalSection title="What we delete">
        <LegalList
          items={[
            'Inquiries and test drive requests you sent on our website.',
            'Your Messenger conversations with our Page as stored by us: your name, the ID Facebook gives you for our Page, your messages, comments, and the photos, videos and files you sent.',
            'Notes and records our staff made about your inquiry.',
          ]}
        />
      </LegalSection>

      <LegalSection title="How to ask">
        <p>Contact us in any of these ways and say that you want your data deleted:</p>
        <LegalList
          items={[
            <>
              <strong className="text-ink-900">On Messenger:</strong> send our Facebook Page the message
              &ldquo;Delete my data&rdquo;. Sending it from the same Facebook account you used to message
              us is the quickest way, because it shows us the request really comes from you.
            </>,
            <>
              <strong className="text-ink-900">By phone or text</strong>, from the number you gave us.
            </>,
            ...(settings.email
              ? [
                  <>
                    <strong className="text-ink-900">By email</strong>, giving your name and the phone number
                    or Facebook name you used with us.
                  </>,
                ]
              : []),
            'In person, at our showroom.',
          ]}
        />
        <LegalContact settings={settings} />
      </LegalSection>

      <LegalSection title="What happens next">
        <LegalList
          items={[
            'We confirm that we received your request.',
            'If the request does not come from the Messenger account or phone number you used with us, we may ask you to confirm who you are, so that no one can delete your data on your behalf.',
            'We delete your information within 30 days and let you know when it is done.',
          ]}
        />
        <p>
          If you bought a vehicle from us, we have to keep the documents of that sale, transfer and
          registration for as long as the law requires. Everything else is deleted.
        </p>
      </LegalSection>

      <LegalSection title="Good to know">
        <LegalList
          items={[
            'Deleting the conversation in your own Messenger does not delete our copy. Ask us using the steps above.',
            'You never signed in to our app, so there is nothing to remove in your Facebook settings: a request to us is all it takes.',
            'Photos, videos, stickers and voice notes you send us on Messenger are already deleted automatically from our system after 5 days.',
          ]}
        />
        <p>
          For how we use your information, see our{' '}
          <Link href="/privacy" className={link}>
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
