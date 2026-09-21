import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import { LoginForm } from './login-form'
import { getDealershipSettings } from '@/lib/data/settings'
import { isSupabaseConfigured } from '@/lib/env'
import { Alert } from '@/components/ui/surfaces'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const params = await searchParams
  const settings = await getDealershipSettings()

  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next

  return (
    <div className="flex min-h-dvh flex-col bg-brand-900 text-white">
      <div className="container-page py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to website
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-md bg-accent-600"
            >
              <ShieldCheck className="size-6" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold">Dashboard sign in</h1>
            <p className="mt-1.5 text-sm text-white/55">{settings.business_name}</p>
          </div>

          <div className="mt-8 rounded-card bg-white p-6 text-ink-900 shadow-panel">
            {isSupabaseConfigured ? (
              <LoginForm next={nextParam} />
            ) : (
              <Alert tone="warning" title="Backend not configured">
                Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
                <code className="font-mono text-xs">.env.local</code>, then restart the dev server.
                See the project README for the full setup steps.
              </Alert>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Dashboard accounts are created by an administrator. There is no public sign-up.
          </p>
        </div>
      </main>
    </div>
  )
}
