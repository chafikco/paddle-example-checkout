'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { initializePaddle } from '@paddle/paddle-js'

// BandLab Membership checkout. Paddle sandbox price IDs reused from the playground
// so the embedded checkout actually renders. Marketing prices are display-only.
const PLANS = {
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: '50+ pro tools, AI features, distribution & more',
    features: [
      '32-track Studio and zero ads',
      '50+ pro tools incl. Voice Cleaner & AutoMix',
      '10 BandLab Beats claims / week (with stems)',
      '100 BandLab Sounds claims / month',
      'Global Distribution — keep 100% of earnings',
      'Full access to Cakewalk Next and Sonar',
    ],
    monthly: {
      priceId: 'pri_01kyt2f6xfch0rag0a79bzc03p',
      price: '$14.99',
      per: '/month',
      original: null,
      save: null,
      note: 'Starts with a 3-day free trial · cancel anytime',
    },
    annual: {
      priceId: 'pri_01kyt2g25wzwjy7zcxxfvxamww',
      price: '$99',
      per: '/year',
      original: '$180',
      save: 'Save 45%',
      note: 'Billed annually · renews at $149/year',
    },
  },
  max: {
    id: 'max',
    name: 'Max',
    tagline: 'Everything in Pro, plus enhanced tools & Boost credits',
    features: [
      'Everything in Pro',
      'Unlimited BandLab Beats claims',
      '500 BandLab Sounds claims / month',
      'Mastering EQ, Reference Mastering & Retune',
      'Priority support',
      '$50 Boost credits every month',
    ],
    monthly: null, // Max monthly — coming soon
    annual: {
      priceId: 'pri_01kyt2gt1cg6k76hba265scky3',
      price: '$199',
      per: '/year',
      original: '$299',
      save: 'Save 33%',
      note: 'Billed annually · renews at $299/year',
    },
  },
}

const CHECKOUT_FRAME_ID = 'bandlab-checkout-frame'
const DEFAULT_CHECKOUT_FRAME_HEIGHT = 500
const MIN_CHECKOUT_FRAME_HEIGHT = 120

function BandLabMark({ className = '' }) {
  // Stylised BandLab-style mark: red-orange rounded square with an equalizer glyph.
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff2d55] to-[#ff7a45] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3/5 w-3/5" fill="none" aria-hidden>
        <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 9v6" />
          <path d="M12 5v14" />
          <path d="M18 9v6" />
        </g>
      </svg>
    </span>
  )
}

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function BandLabCheckout() {
  const [paddle, setPaddle] = useState(null)
  const [tier, setTier] = useState('pro') // 'pro' | 'max'
  const [billing, setBilling] = useState('annual') // 'monthly' | 'annual'
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [receivedPing, setReceivedPing] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState(null)
  const checkoutOpenedRef = useRef(false)
  const paddleRef = useRef(null)

  // Resolve the selected plan + billing option. Max has no monthly option, so
  // fall back to annual when Max is selected.
  const effectiveBilling = tier === 'max' ? 'annual' : billing
  const plan = PLANS[tier]
  const option = plan[effectiveBilling] || plan.annual
  const priceId = option?.priceId

  const summary = useMemo(
    () => ({
      name: plan.name,
      cadence: effectiveBilling === 'annual' ? 'Annual' : 'Monthly',
      price: option.price,
      per: option.per,
      original: option.original,
      save: option.save,
      note: option.note,
    }),
    [plan, option, effectiveBilling]
  )

  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: 'test_37a3ae9038ae86dd31608afd2b9',
      eventCallback: (event) => {
        if (event?.name === 'ping.size') {
          const reported = [
            event?.data?.height,
            event?.data?.frame_height,
            event?.data?.size?.height,
            event?.height,
          ].find((v) => Number.isFinite(Number(v)) && Number(v) > 0)
          if (reported) {
            const cap =
              typeof window !== 'undefined'
                ? Math.max(MIN_CHECKOUT_FRAME_HEIGHT, window.innerHeight - 120)
                : DEFAULT_CHECKOUT_FRAME_HEIGHT
            setReceivedPing(true)
            setCheckoutFrameHeight(Math.min(cap, Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reported)))))
          }
          return
        }
        if (event?.name === 'checkout.completed') {
          console.log('BandLab checkout completed', event.data?.transaction_id)
        }
      },
    })
      .then((p) => {
        if (p) {
          paddleRef.current = p
          setPaddle(p)
        }
      })
      .catch(console.error)
  }, [])

  const openCheckout = (targetPriceId) => {
    if (!paddle?.Initialized || !targetPriceId) return
    checkoutOpenedRef.current = true

    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'dark',
        locale: 'en',
        variant: 'one-page',
        showAddTaxId: false,
        frameTarget: CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: String(DEFAULT_CHECKOUT_FRAME_HEIGHT),
      },
      items: [{ priceId: targetPriceId, quantity: 1 }],
    })

    // Geolocate by IP via PricePreview and pre-fill the detected country.
    paddle
      .PricePreview({ items: [{ priceId: targetPriceId, quantity: 1 }] })
      .then((preview) => {
        const countryCode =
          preview?.data?.address?.countryCode || preview?.data?.countryCode || undefined
        if (!countryCode) return
        setDetectedCountry(countryCode)
        try {
          paddle.Checkout.updateCheckout({ customer: { address: { countryCode } } })
        } catch (e) {
          console.warn('updateCheckout with detected country failed', e)
        }
      })
      .catch((e) => console.warn('PricePreview geolocation failed', e))
  }

  // Auto-load the inline checkout, and keep it in sync as the plan/billing changes.
  useEffect(() => {
    if (!paddle?.Initialized || !priceId) return
    if (checkoutOpenedRef.current) {
      paddle.Checkout.updateCheckout({ items: [{ priceId, quantity: 1 }] })
    } else {
      const t = setTimeout(() => openCheckout(priceId), 80)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle, priceId])

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      {/* subtle brand glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-[#ff2d55]/10 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BandLabMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">BandLab</span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 sm:inline-flex">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1l6 3v5c0 4-2.7 7.5-6 9-3.3-1.5-6-5-6-9V4l6-3zm3.7 6.3a1 1 0 00-1.4-1.4L9 9.2 7.7 7.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure checkout · Powered by Paddle
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Left: plan selection + order summary */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Unlock <span className="bg-gradient-to-r from-[#ff2d55] to-[#ff7a45] bg-clip-text text-transparent">BandLab Membership</span>
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Go further with pro-grade tools, distribution and more. Cancel anytime.
            </p>

            {/* Tier selector */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {Object.values(PLANS).map((p) => {
                const active = tier === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTier(p.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-[#ff2d55] bg-white/[0.06]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold">{p.name}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          active ? 'border-[#ff2d55] bg-[#ff2d55]' : 'border-white/25'
                        }`}
                      >
                        {active && <CheckIcon className="h-3 w-3 text-white" />}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{p.tagline}</p>
                  </button>
                )
              })}
            </div>

            {/* Billing toggle */}
            <div className="mt-5 inline-flex rounded-full bg-white/5 p-1 ring-1 ring-white/10">
              {['annual', 'monthly'].map((b) => {
                const disabled = tier === 'max' && b === 'monthly'
                const active = effectiveBilling === b
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setBilling(b)}
                    className={`relative rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                      active
                        ? 'bg-white text-[#0a0a0d]'
                        : disabled
                          ? 'cursor-not-allowed text-white/25'
                          : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {b}
                    {b === 'annual' && (
                      <span className="ml-1.5 rounded bg-[#ff2d55]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ff7a45]">
                        BEST VALUE
                      </span>
                    )}
                    {disabled && <span className="ml-1 text-[10px] font-medium text-white/25">soon</span>}
                  </button>
                )
              })}
            </div>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ff2d55]" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Order summary */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Order summary</p>
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <p className="font-semibold">
                    BandLab {summary.name}
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/60">
                      {summary.cadence}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-white/45">{summary.note}</p>
                </div>
                <div className="text-right">
                  {summary.original && (
                    <span className="text-xs text-white/35 line-through">{summary.original}</span>
                  )}
                  <p className="text-xl font-extrabold">
                    {summary.price}
                    <span className="text-sm font-medium text-white/50">{summary.per}</span>
                  </p>
                  {summary.save && (
                    <span className="text-[11px] font-bold text-[#ff7a45]">{summary.save}</span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-semibold">Total due today</span>
                <span className="text-lg font-extrabold">
                  {summary.name === 'Pro' && effectiveBilling === 'monthly' ? '$0.00' : summary.price}
                </span>
              </div>
              {summary.name === 'Pro' && effectiveBilling === 'monthly' && (
                <p className="mt-1 text-xs text-white/45">
                  Free for 3 days, then {summary.price}{summary.per}.
                </p>
              )}
            </div>
          </div>

          {/* Right: inline Paddle checkout */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Payment</h2>
                {detectedCountry && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    Location detected ({detectedCountry}) &amp; pre-filled
                  </p>
                )}
              </div>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/50 ring-1 ring-white/10">
                Test mode
              </span>
            </div>

            <div
              id={CHECKOUT_FRAME_ID}
              className={`${CHECKOUT_FRAME_ID} checkout-frame w-full`}
              style={
                receivedPing && checkoutFrameHeight
                  ? { height: `${checkoutFrameHeight}px` }
                  : { minHeight: `${DEFAULT_CHECKOUT_FRAME_HEIGHT}px` }
              }
            />

            {!paddle && (
              <p className="mt-3 text-center text-sm text-white/40">Loading secure checkout…</p>
            )}
          </div>
        </div>

        {/* Legal */}
        <p className="mx-auto mt-10 max-w-lg text-center text-xs text-white/35">
          By continuing you agree to BandLab&apos;s{' '}
          <Link href="#" className="font-semibold text-white/55 hover:underline">Terms</Link> and{' '}
          <Link href="#" className="font-semibold text-white/55 hover:underline">Privacy Policy</Link>. Subscriptions
          auto-renew until cancelled at least 24 hours before the billing date.
        </p>
      </div>
    </div>
  )
}
