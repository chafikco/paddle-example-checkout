'use client'

import { useState, useEffect, useRef } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

// whoisthis flow. Paddle sandbox price IDs reused from the playground.
const PLANS = [
  {
    id: 'trial',
    name: '7-DAY TRIAL',
    subtitle: '7 days of full access',
    perDay: '0.71',
    totalLabel: '$4.99 FOR 7 DAYS',
    todayCharge: '$4.99 today',
    feature: '2 searches now · +15 on each renewal',
    theme: 'light',
    priceId: 'pri_01kyt2f6xfch0rag0a79bzc03p',
  },
  {
    id: 'monthly',
    name: 'MONTHLY',
    subtitle: 'Flexible — cancel anytime',
    perDay: '0.43',
    totalLabel: '$12.99 PER MONTH',
    todayCharge: '$12.99 today',
    feature: '15 searches now · +15 on each renewal',
    mostPopular: true,
    theme: 'lime',
    priceId: 'pri_01kyt2gt1cg6k76hba265scky3',
  },
  {
    id: 'yearly',
    name: 'YEARLY',
    subtitle: 'Billed yearly · cancel anytime',
    perDay: '0.16',
    totalLabel: '$59.99 PER YEAR',
    todayCharge: '$59.99 today',
    feature: '20 searches now · +20 on each renewal',
    bestValue: true,
    save: 'SAVE 62%',
    theme: 'light',
    priceId: 'pri_01kyt2g25wzwjy7zcxxfvxamww',
  },
]

const BENEFITS = [
  'Search any phone number to see who’s behind it',
  'The phone owner is never notified about your search',
  'Results include things most people don’t realize are publicly available — be ready for what surfaces',
  'Full access to every report. Cancel anytime.',
]

const CHECKOUT_FRAME_ID = 'whoisthis-checkout-frame'
const EXPRESS_INITIAL_FRAME_HEIGHT = 220

function CheckMark({ className = '' }) {
  return (
    <svg className={`h-4 w-4 flex-shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function PlanCard({ plan, selected, onSelect }) {
  const isSelected = selected?.id === plan.id
  const isLime = plan.theme === 'lime'

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`relative w-full overflow-hidden rounded-lg text-left transition ${
        plan.mostPopular ? 'pt-0' : ''
      } ${
        isSelected ? 'ring-2 ring-[#3b5bff]' : 'ring-1 ring-black/10'
      } ${isLime ? 'bg-[#cdf94a]' : 'bg-white'}`}
    >
      {plan.mostPopular && (
        <div className="bg-[#3b5bff] py-1 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white">
          Most popular
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-black">{plan.name}</span>
              {plan.bestValue && (
                <span className="rounded bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Best value
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-black/60">{plan.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold leading-none text-black">${plan.perDay}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-black/50">Per day</div>
            <div className="mt-1 flex items-center justify-end gap-2">
              {plan.save && (
                <span className="rounded bg-[#cdf94a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black ring-1 ring-black/10">
                  {plan.save}
                </span>
              )}
              <span className="text-[10px] text-black/50">{plan.totalLabel}</span>
            </div>
          </div>
          <span
            className={`ml-3 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
              isSelected ? 'border-[#3b5bff] bg-[#3b5bff] text-white' : 'border-black/20 bg-transparent'
            }`}
          >
            {isSelected && (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-2 text-xs text-black/70">
          <CheckMark className="text-[#16a34a]" />
          <span>{plan.feature}</span>
        </div>
      </div>
    </button>
  )
}

export default function WhoisthisPage() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]) // 7-day trial default
  const [paddle, setPaddle] = useState(null)
  const expressOpenRef = useRef(false)

  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: 'test_37a3ae9038ae86dd31608afd2b9',
      eventCallback: (event) => {
        console.log('Paddle event', event)
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
  }, [])

  const openExpressCheckout = (plan) => {
    if (!paddle?.Initialized || !plan?.priceId) return
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'dark',
        locale: 'en',
        variant: 'express',
        showAddTaxId: false,
        frameTarget: CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: String(EXPRESS_INITIAL_FRAME_HEIGHT),
      },
      items: [{ priceId: plan.priceId, quantity: 1 }],
      customer: {
        email: 'chafik@paddle.com',
        address: { countryCode: 'GB', postalCode: 'E8 2HL' },
      },
    })
  }

  // Auto-load the embedded express checkout and keep it in sync with the selected plan.
  useEffect(() => {
    if (!paddle?.Initialized) return
    if (expressOpenRef.current) {
      paddle.Checkout.updateCheckout({ items: [{ priceId: selectedPlan.priceId, quantity: 1 }] })
    } else {
      expressOpenRef.current = true
      openExpressCheckout(selectedPlan)
    }
  }, [paddle, selectedPlan])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-white/70">◇</span> whoisthis
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Step 4 / 4</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-2 w-2 rounded-[2px] bg-[#3b5bff]" />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: plans */}
          <div>
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} selected={selectedPlan} onSelect={setSelectedPlan} />
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-white/40">
              You&apos;ll be charged $4.99 today for a 7-day trial. After the trial, your subscription renews at
              $24.98/month. Cancel anytime from your account.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-[11px] text-white/60">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                2,347 people opened reports like this today
              </span>
              <span className="rounded bg-[#3b5bff]/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#8ea2ff]">
                Live
              </span>
            </div>
          </div>

          {/* Right: dark checkout panel */}
          <div className="rounded-xl bg-[#0d0d0f] p-6 ring-1 ring-white/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Secure checkout</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">Choose your payment method</h2>

            <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Email address</span>
              <span className="text-sm text-white/80">chafik@Paddle.com</span>
            </div>

            <ul className="mt-4 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex gap-2 text-xs leading-relaxed text-white/60">
                  <CheckMark className="mt-0.5 text-[#22c55e]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Total due</p>
                <p className="text-sm text-white/80">{selectedPlan.todayCharge}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold">${selectedPlan.perDay}</span>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Per day</p>
              </div>
            </div>

            {/* Paddle express checkout (replaces the native pay buttons) */}
            <div className="mt-4">
              <div id={CHECKOUT_FRAME_ID} className={`${CHECKOUT_FRAME_ID} checkout-frame w-full`} />
            </div>

            <div className="mt-5 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
              <span>🔒 SSL</span>
              <span>· Secure payment ·</span>
              <span>Private</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
