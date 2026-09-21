'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Car, MessageCircle, RotateCcw, X } from 'lucide-react'

import {
  GENERAL_QUESTIONS,
  VEHICLE_QUESTIONS,
  greeting,
  type ChatAnswer,
  type ChatContext,
  type ChatQuestion,
  type ChatVehicle,
} from '@/lib/chat/script'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'

type Turn =
  | { id: string; role: 'assistant'; answer: ChatAnswer }
  | { id: string; role: 'customer'; text: string }

/**
 * Scripted chat assistant.
 *
 * The customer picks from a fixed list of questions and gets a deterministic
 * answer built from live inventory and dealership settings. There is no model
 * behind it, which is the point: it cannot misquote a price, invent stock or
 * promise financing terms the dealership never agreed to.
 */
export function ChatAssistant({ context }: { context: ChatContext }) {
  const [open, setOpen] = React.useState(false)
  const [vehicle, setVehicle] = React.useState<ChatVehicle | null>(null)
  const [picking, setPicking] = React.useState(false)
  const [turns, setTurns] = React.useState<Turn[]>([])

  const panelRef = React.useRef<HTMLDivElement>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const turnCounter = React.useRef(0)

  const nextId = () => {
    turnCounter.current += 1
    return `turn-${turnCounter.current}`
  }

  // Seeded on first open so the greeting reflects stock at that moment.
  const openPanel = () => {
    setOpen(true)
    if (turns.length === 0) {
      setTurns([{ id: nextId(), role: 'assistant', answer: greeting(context) }])
    }
  }

  const closePanel = React.useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closePanel])

  // Keep the newest turn in view as the conversation grows.
  React.useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [turns, picking])

  function ask(question: ChatQuestion) {
    const answer = question.answer(context, vehicle)
    setTurns((current) => [
      ...current,
      { id: nextId(), role: 'customer', text: question.label },
      { id: nextId(), role: 'assistant', answer },
    ])
  }

  function chooseVehicle(next: ChatVehicle) {
    setVehicle(next)
    setPicking(false)
    setTurns((current) => [
      ...current,
      { id: nextId(), role: 'customer', text: `About the ${next.title}` },
      {
        id: nextId(),
        role: 'assistant',
        answer: {
          paragraphs: [
            `Got it — the ${next.title}, listed at ${formatPeso(next.price)}. What would you like to know?`,
          ],
        },
      },
    ])
  }

  function restart() {
    setVehicle(null)
    setPicking(false)
    turnCounter.current = 0
    setTurns([{ id: nextId(), role: 'assistant', answer: greeting(context) }])
  }

  const questions = vehicle ? [...VEHICLE_QUESTIONS, ...GENERAL_QUESTIONS] : GENERAL_QUESTIONS
  const selectableVehicles = context.vehicles.filter((v) => v.status !== 'sold')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-controls="chat-assistant-panel"
        className={cn(
          'fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full shadow-panel transition-transform',
          'bg-accent-600 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-700 active:scale-95',
          // Clears the sticky mobile CTA bar on vehicle pages.
          'max-lg:bottom-24',
          // Pulses twice shortly after load, then stops.
          !open && 'animate-attention',
        )}
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-5" aria-hidden="true" />
        )}
        <span className={open ? 'sr-only' : undefined}>
          {open ? 'Close the assistant' : 'Questions?'}
        </span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="chat-assistant-panel"
          role="dialog"
          aria-label={`${context.businessName} assistant`}
          className={cn(
            'fixed z-40 flex animate-scale-in flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-panel',
            'right-4 bottom-20 w-[min(24rem,calc(100vw-2rem))] max-h-[min(34rem,calc(100dvh-8rem))]',
            'max-lg:bottom-40',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 bg-brand-900 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{context.businessName}</p>
              <p className="text-xs text-white/60">
                {vehicle ? vehicle.title : 'Answers to common questions'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {turns.length > 1 ? (
                <button
                  type="button"
                  onClick={restart}
                  aria-label="Start over"
                  className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close the assistant"
                className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-ink-50 px-4 py-4"
            aria-live="polite"
          >
            {turns.map((turn) =>
              turn.role === 'customer' ? (
                <p
                  key={turn.id}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent-600 px-3.5 py-2 text-sm text-white"
                >
                  {turn.text}
                </p>
              ) : (
                <div
                  key={turn.id}
                  className="w-fit max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-ink-800 shadow-xs"
                >
                  {turn.answer.paragraphs.map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}

                  {turn.answer.bullets && turn.answer.bullets.length > 0 ? (
                    <ul className="space-y-1 border-t border-ink-100 pt-2">
                      {turn.answer.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-ink-700">
                          <span aria-hidden="true" className="text-accent-600">
                            ·
                          </span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {turn.answer.links && turn.answer.links.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {turn.answer.links.map((link) =>
                        link.external || link.href.startsWith('tel:') || link.href.startsWith('mailto:') ? (
                          <a
                            key={link.href}
                            href={link.href}
                            target={link.external ? '_blank' : undefined}
                            rel={link.external ? 'noopener noreferrer' : undefined}
                            className="rounded-full border border-accent-600 px-2.5 py-1 text-xs font-semibold text-accent-700 transition-colors hover:bg-accent-50"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={closePanel}
                            className="rounded-full border border-accent-600 px-2.5 py-1 text-xs font-semibold text-accent-700 transition-colors hover:bg-accent-50"
                          >
                            {link.label}
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>

          <div className="shrink-0 border-t border-ink-200 bg-white px-4 py-3">
            {picking ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-700">Choose a vehicle</p>
                  <button
                    type="button"
                    onClick={() => setPicking(false)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800"
                  >
                    <ArrowLeft className="size-3" aria-hidden="true" />
                    Back
                  </button>
                </div>

                {selectableVehicles.length === 0 ? (
                  <p className="text-xs text-ink-500">No vehicles are listed at the moment.</p>
                ) : (
                  <ul className="max-h-36 space-y-1 overflow-y-auto">
                    {selectableVehicles.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => chooseVehicle(option)}
                          className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-ink-100"
                        >
                          <span className="truncate font-medium text-ink-800">{option.title}</span>
                          <span className="tabular shrink-0 text-ink-500">
                            {formatPeso(option.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold text-ink-700">
                  {vehicle ? `Ask about the ${vehicle.title}` : 'Pick a question'}
                </p>

                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {selectableVehicles.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPicking(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      <Car className="size-3.5" aria-hidden="true" />
                      {vehicle ? 'Switch vehicle' : 'Ask about a specific car'}
                    </button>
                  ) : null}

                  {questions.map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => ask(question)}
                      className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
                    >
                      {question.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mt-2.5 text-[11px] leading-snug text-ink-500">
              Automated replies from our listings. For anything else,{' '}
              <Link href="/contact" onClick={closePanel} className="font-semibold underline underline-offset-2">
                message a representative
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
