'use client'

import { useRouter } from 'next/router'
import { useState } from 'react'

const LOVE_LANGUAGES_PRICE_ID = 'pri_01khnych917wa2sjc31mj4pf1q'

const BENEFITS = [
  { icon: '🔥', text: '15+ expert-backed guides, summarized as infographics (PDF)' },
  { icon: '💞', text: 'Proven strategies for deeper bonds and passionate relationships' },
  { icon: '💡', text: 'Practical insights you can apply instantly' },
]

export default function BitesizeUpsellLovePage() {
  const router = useRouter()
  const { subscription_id: subscriptionId } = router.query
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAddInfographics = async () => {
    if (!subscriptionId) {
      setError('Missing subscription.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/bitesize/updateSubscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          price_id: LOVE_LANGUAGES_PRICE_ID,
        }),
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
      router.push('/bitesize?upgraded=1')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueWithout = () => {
    router.push('/bitesize')
  }

  if (!subscriptionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <p className="text-gray-600">Missing subscription.</p>
        <button
          type="button"
          onClick={() => router.push('/bitesize')}
          className="mt-4 font-medium text-[#2563eb]"
        >
          Back to Bitesize
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-4">
          <span className="text-xl font-bold text-gray-900">Bitesize</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-20 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-44 w-full max-w-[280px] items-end justify-center">
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-pink-200 bg-gradient-to-b from-pink-100 to-pink-200 px-6 py-5 shadow-lg">
              <div className="w-full text-left">
                <p className="text-lg font-bold text-gray-800">5 LOVE LANGUAGES</p>
                <p className="mt-1 text-xs text-gray-600">Expert guides & infographics</p>
                <div className="mt-3 flex gap-1">
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">vines</span>
                  <span className="rounded bg-pink-200 px-2 py-0.5 text-xs text-pink-800">flower</span>
                </div>
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
              $9.59
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold leading-tight text-gray-900">
            Stronger Connections & a Better Love Life
          </h1>
        </div>

        <div className="mt-6 rounded-2xl bg-gray-100 p-5">
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex gap-3 text-sm text-gray-700">
                <span className="text-lg">{b.icon}</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-sm font-semibold text-gray-800">
          Small Changes Big Relationships
        </p>

        <button
          type="button"
          onClick={handleAddInfographics}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[#2563eb] py-4 text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
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
      </main>
    </div>
  )
}
