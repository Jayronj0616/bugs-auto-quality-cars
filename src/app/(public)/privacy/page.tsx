import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalContact, LegalList, LegalPage, LegalSection } from '@/components/layout/legal-page'
import { getDealershipSettings } from '@/lib/data/settings'
import { getSiteUrl } from '@/lib/env'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDealershipSettings()
  return {
    title: 'Privacy Policy',
    description: `How ${settings.business_name} collects, uses, keeps and deletes personal information from this website and our Facebook Page.`,
    alternates: { canonical: '/privacy' },
  }
}

/*
 * Every statement here must stay true to what the systems actually do: the
 * website (inquiry and test drive forms) and the dealership's Messenger app
 * ("Bugs Auto Leads"). Notably, only the 5-day deletion of photos and videos
 * customers send is automatic today - nothing else here promises an automatic
 * deletion schedule.
 */
export default async function PrivacyPage() {
  const settings = await getDealershipSettings()
  const name = settings.business_name
  const site = getSiteUrl().replace(/^https?:\/\//, '')
  const link = 'font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800'

  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="November 3, 2026">
      <p>
        This policy explains what personal information {name} collects, why, who we share it with,
        how long we keep it and how you can have it deleted. It covers our website ({site}), our
        Facebook Page and Messenger conversations with us. We follow the Philippine Data Privacy Act
        of 2012 (Republic Act No. 10173).
      </p>

      <LegalSection title="Who we are">
        <p>
          {name} is a used-car dealership and is responsible for the personal information described
          here. You can reach us at:
        </p>
        <LegalContact settings={settings} />
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-ink-900">When you send an inquiry or book a test drive on our website:</strong>{' '}
          your name, mobile number, email address (optional), your message, the vehicle you are asking
          about, how and when you prefer to be contacted, and your preferred test drive date and time.
          If you used the financing calculator, the figures shown to you (price, down payment, loan term,
          interest rate, estimated monthly payment and the financing company) are attached to your
          inquiry.
        </p>
        <p>
          <strong className="text-ink-900">When you message our Facebook Page or comment on our posts:</strong>{' '}
          we use an app we run for our own Page (named &ldquo;Bugs Auto Leads&rdquo;) to receive and
          answer messages. It receives from Facebook your name, the ID number Facebook gives you for our
          Page, your messages and comments, the ad or post you came from, and any photos, videos,
          stickers, voice notes or files you send. Our staff may add notes, the vehicle you are
          interested in and the status of your inquiry (for example, a booked viewing).
        </p>
        <p>
          <strong className="text-ink-900">Automatically:</strong> our website does not use advertising
          or analytics cookies and does not track you across other sites. Your IP address is used for a
          few minutes to stop spam on our forms and is not stored. Our hosting providers keep standard
          technical logs. Staff who sign in to manage the website or the app use a login cookie.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <LegalList
          items={[
            'To answer your questions and follow up your inquiry by phone, text, email or Messenger.',
            'To send automatic replies on Messenger with information about the vehicle you asked about: its details, photos or video, financing options, our location and viewing hours.',
            'To arrange viewings, test drives, reservations and sales, and to help with financing if you ask us to.',
            'To prepare internal daily reports of inquiries for our team.',
            'To meet legal and regulatory requirements.',
          ]}
        />
        <p>
          Automatic replies use fixed information we have prepared for each vehicle; they are not
          written by artificial intelligence, and our staff can always take over the conversation. We do
          not sell your personal information and do not use it to build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <LegalList
          items={[
            <>
              <strong className="text-ink-900">Meta (Facebook and Messenger)</strong>, which delivers
              messages between you and our Page. Meta&apos;s own privacy policy applies to your use of
              Facebook.
            </>,
            <>
              <strong className="text-ink-900">Service providers that host our systems</strong>: Supabase
              (database and file storage) and Vercel (website and app hosting). They store and process the
              information only to run our services. Your information may be processed on servers outside
              the Philippines.
            </>,
            <>
              <strong className="text-ink-900">Financing companies</strong> (such as JACCS or Global), only
              when you ask us to help you apply for financing, and only the details needed for that
              application.
            </>,
            'Government authorities, when the law requires it.',
          ]}
        />
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalList
          items={[
            'Photos, videos, stickers and voice notes you send us on Messenger: our private copy is deleted automatically 5 days after you send them.',
            'Inquiries, test drive requests, messages and notes: kept while we are handling your inquiry and for our sales records, then deleted or anonymized. You can ask us to delete them at any time.',
            'Records of a vehicle you buy from us: kept as long as the law requires for sale, transfer and registration documents.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under the Data Privacy Act you have the right to be informed, to access your personal
          information, to correct it, to object to its processing, to have it erased or blocked, to data
          portability, and to claim damages. If you believe we have mishandled your information, you can
          complain to the National Privacy Commission (privacy.gov.ph).
        </p>
      </LegalSection>

      <LegalSection title="How to have your data deleted">
        <p>
          Send us a request and we will delete your information. The steps are on our{' '}
          <Link href="/data-deletion" className={link}>
            Data Deletion Instructions
          </Link>{' '}
          page.
        </p>
      </LegalSection>

      <LegalSection title="How we protect it">
        <p>
          Access to customer information is limited to our staff, with passwords and role-based
          permissions. Information travels over encrypted (HTTPS) connections, and the access keys our
          systems use to connect to Facebook are kept on our servers, never shown in a browser.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Our website and Page are for adults buying or selling vehicles. We do not knowingly collect
          information from anyone under 18.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we change this policy, we will update it on this page and change the date at the top.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>For any question about your personal information, contact us:</p>
        <LegalContact settings={settings} />
      </LegalSection>
    </LegalPage>
  )
}
