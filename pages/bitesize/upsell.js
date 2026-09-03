'use client'

import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 120000 // 2 min

const BENEFITS = [
  '15+ bestselling books summarized as infographics (PDF)',
  'Hundreds of actionable insights and key takeaways',
  'Simplify and speed up your learning to reach your biggest goals',
  'Auto-renewable 1-month plan, cancel anytime',
]

export default function BitesizeUpsellPage() {
  const router = useRouter()
  const { subscription_id: subscriptionIdFromQuery, transaction_id: transactionIdFromQuery } = router.query
  const [resolvedSubscriptionId, setResolvedSubscriptionId] = useState(null)
  const [waitingForSubscription, setWaitingForSubscription] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pollTimeoutRef = useRef(null)

  const subscriptionId = subscriptionIdFromQuery || resolvedSubscriptionId

  useEffect(() => {
    if (!transactionIdFromQuery || subscriptionIdFromQuery || resolvedSubscriptionId) return
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const start = Date.now()
    setWaitingForSubscription(true)

    const poll = async () => {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        setWaitingForSubscription(false)
        setError('Subscription is taking longer than expected. Please refresh in a moment or go back.')
        return
      }
      try {
        const res = await fetch(
          `${base}/api/bitesize/subscriptionForTransaction?transaction_id=${encodeURIComponent(transactionIdFromQuery)}`
        )
        const data = await res.json()
        if (res.ok && data?.subscription_id) {
          setResolvedSubscriptionId(data.subscription_id)
          setWaitingForSubscription(false)
          setError(null)
          return
        }
      } catch (_) {}
      pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
    poll()
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [transactionIdFromQuery, subscriptionIdFromQuery, resolvedSubscriptionId])

  const handleAddInfographics = async () => {
    if (!subscriptionId) {
      setError('Missing subscription. Return to checkout and complete purchase first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/bitesize/updateSubscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.detail ?? data?.error ?? 'Update failed'
        setError(Array.isArray(msg) ? msg.map((m) => m?.detail ?? m).join(', ') : msg)
        setLoading(false)
        return
      }
      router.push(`/bitesize/upsell-love?subscription_id=${encodeURIComponent(subscriptionId)}`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueWithout = () => {
    router.push('/bitesize')
  }

  const hasTransactionOrSubscription = transactionIdFromQuery || subscriptionIdFromQuery || resolvedSubscriptionId
  const showUpsellContent = subscriptionId && !waitingForSubscription

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-4">
          <span className="text-xl font-bold text-gray-900">Bitesize</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-20 pt-6">
        {!hasTransactionOrSubscription && (
          <div className="py-12 text-center">
            <p className="text-gray-600">Missing transaction. Complete checkout first.</p>
            <button
              type="button"
              onClick={() => router.push('/bitesize')}
              className="mt-4 font-medium text-[#2563eb]"
            >
              Back to pricing
            </button>
          </div>
        )}

        {hasTransactionOrSubscription && waitingForSubscription && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
            <p className="mt-4 text-center text-gray-600">Setting up your subscription…</p>
            <p className="mt-1 text-sm text-gray-500">This usually takes a few seconds.</p>
          </div>
        )}

        {showUpsellContent && (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-40 w-full max-w-[280px] items-end justify-center">
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 px-6 py-4 shadow-lg">
                  <div className="text-left">
                    <span className="text-4xl font-bold text-white">15</span>
                    <p className="mt-1 text-sm font-medium text-gray-300">
                      Must-Read Bestsellers in Infographics
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {['How to find true happiness?', 'How to manage time?', 'How to achieve goals?', 'How to stay motivated?'].map((q) => (
                        <span key={q} className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-200">
                          {q}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Bitesize</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  daily life
                </span>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  learn faster
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  visually
                </span>
                <span className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white">
                  $19.99
                </span>
              </div>

              <h1 className="mt-6 text-2xl font-bold leading-tight text-gray-900">
                Explore the ultimate library of top book ideas
              </h1>
            </div>

            <div className="mt-6 rounded-2xl bg-gray-100 p-5">
              <ul className="space-y-3">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex gap-3 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleAddInfographics}
              disabled={!subscriptionId || loading}
              className="mt-8 w-full rounded-xl bg-[#2563eb] py-4 text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add infographics'}
            </button>

            {error && (
              <p className="mt-3 text-center text-sm text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={handleContinueWithout}
              className="mt-4 w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Continue without welcome offer
            </button>
          </>
        )}
      </main>
    </div>
  )
}
