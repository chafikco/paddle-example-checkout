'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { initializePaddle } from '@paddle/paddle-js'

// D5 Render flow: a pricing page (Community / Pro / Teams, mirroring
// d5render.com/pricing) followed by a "Confirm Order" checkout with an embedded
// Paddle Express checkout. Marketing prices are display-only; the embed uses
// reused Paddle sandbox price IDs so it renders live.
const PLAN = {
  yearly: {
    id: 'yearly',
    price: '360.00',
    per: 'Per Year',
    cadence: 'Pay Yearly',
    original: 'Original Price USD $450.00/Year',
    priceId: 'pri_01m2q46pbycvpxhed8n2fkzdvs',
  },
  monthly: {
    id: 'monthly',
    price: '45.00',
    per: 'Per Month',
    cadence: 'Pay Monthly',
    original: null,
    priceId: 'pri_01m2q43rcy8z8qngvb0h6ektm0',
  },
}

const TIERS = [
  {
    id: 'community',
    name: 'Community',
    tagline: 'Free for everyone',
    cta: 'Current Plan',
    ctaType: 'disabled',
    features: [
      'Unlimited number of scenes',
      'Up to 16K image & panorama rendering',
      'Up to 4K video & animation',
      '50 AI trial credits',
      '2,100+ official assets',
      '1 interactive presentation',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Ideal for solo professionals',
    highlight: true,
    cta: 'Get Pro',
    ctaType: 'checkout',
    features: [
      'Everything in Community, plus:',
      'Unlimited AI Agent & 10+ AI features',
      '16,000+ official assets',
      'Unlimited panorama, spatial & XR tours',
      'Custom logo/watermark, render passes, VR',
      'Advanced lighting controls & 10 GB cloud',
    ],
  },
  {
    id: 'teams',
    name: 'Teams',
    tagline: 'Built for teams & studios',
    cta: 'Contact Sales',
    ctaType: 'link',
    features: [
      'Everything in Pro, plus:',
      'Up to 8K video & animation rendering',
      'Multi-editor scene editing',
      'Team asset library & presets',
      'Member access control & data dashboard',
      '100 GB cloud space',
    ],
  },
]

const EXPRESS_FRAME_ID = 'd5-express-frame'
const EXPRESS_INITIAL_FRAME_HEIGHT = 240
const MIN_CHECKOUT_FRAME_HEIGHT = 80

function D5Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cff] to-[#5b4bff] text-sm font-black text-white">
        D5
      </span>
      <span className="text-base font-semibold tracking-tight text-white">D5 Render</span>
    </span>
  )
}

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function BillingToggle({ billing, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
      {['monthly', 'yearly'].map((b) => {
        const active = billing === b
        return (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
              active ? 'bg-white text-[#0a0a0b]' : 'text-white/60 hover:text-white'
            }`}
          >
            {b}
            {b === 'yearly' && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-[#22c55e] text-white' : 'bg-[#22c55e]/20 text-[#22c55e]'
                }`}
              >
                Save 20%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function D5RenderFlow() {
  const [paddle, setPaddle] = useState(null)
  const [step, setStep] = useState('pricing') // 'pricing' | 'checkout'
  const [billing, setBilling] = useState('yearly') // 'yearly' | 'monthly'
  const [agreed, setAgreed] = useState(false)
  const [, setCheckoutFrameHeight] = useState(null)
  const [, setReceivedPing] = useState(false)
  // Tracks the priceId currently loaded in the frame so React StrictMode's
  // double-invoked effect (dev only) can't re-open / reload the checkout.
  const openedPriceRef = useRef(null)

  const plan = PLAN[billing]
  const priceId = plan.priceId

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
            setReceivedPing(true)
            setCheckoutFrameHeight(Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reported))))
          }
          return
        }
        if (event?.name === 'checkout.completed') {
          console.log('D5 checkout completed', event.data?.transaction_id)
        }
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
  }, [])

  const openExpressCheckout = (targetPriceId) => {
    if (!paddle?.Initialized || !targetPriceId) return
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'dark',
        locale: 'en',
        variant: 'express',
        showAddTaxId: false,
        frameTarget: EXPRESS_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: String(EXPRESS_INITIAL_FRAME_HEIGHT),
      },
      items: [{ priceId: targetPriceId, quantity: 1 }],
    })
  }

  // Open the embedded express checkout once on the checkout step, keep it in
  // sync with the plan, and tear it down when returning to pricing.
  useEffect(() => {
    if (!paddle?.Initialized) return

    if (step !== 'checkout') {
      if (openedPriceRef.current !== null) {
        openedPriceRef.current = null
        if (paddle.Checkout?.close) {
          try {
            paddle.Checkout.close()
          } catch (_) {}
        }
      }
      return
    }

    if (openedPriceRef.current === null) {
      openedPriceRef.current = priceId
      // Let the frame mount before Paddle targets it.
      const t = setTimeout(() => openExpressCheckout(priceId), 60)
      return () => clearTimeout(t)
    } else if (openedPriceRef.current !== priceId) {
      openedPriceRef.current = priceId
      paddle.Checkout.updateCheckout({ items: [{ priceId, quantity: 1 }] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle, priceId, step])

  const proPriceLabel =
    billing === 'yearly' ? (
      <>
        USD $360<span className="text-base font-medium text-white/40">/year</span>
      </>
    ) : (
      <>
        USD $45<span className="text-base font-medium text-white/40">/month</span>
      </>
    )

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top brand bar */}
        <div className="flex items-center justify-between border-b border-white/5 pb-5">
          <Link href="/">
            <D5Logo />
          </Link>
          {step === 'checkout' ? (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-white/40 sm:inline-flex">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1l6 3v5c0 4-2.7 7.5-6 9-3.3-1.5-6-5-6-9V4l6-3zm3.7 6.3a1 1 0 00-1.4-1.4L9 9.2 7.7 7.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure checkout · Powered by Paddle
            </span>
          ) : (
            <div className="flex items-center gap-5 text-sm font-medium text-white/60">
              <span className="hidden sm:inline">Log In</span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 text-white">Free Download</span>
            </div>
          )}
        </div>

        {step === 'pricing' ? (
          /* ---------------- PRICING ---------------- */
          <div className="pb-16">
            <div className="mt-10 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Choose Your Plan</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
                Production-level real-time rendering, AI features and curated assets — pick the plan that fits your
                workflow.
              </p>
              <div className="mt-6 flex justify-center">
                <BillingToggle billing={billing} onChange={setBilling} />
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {TIERS.map((tier) => {
                const isPro = tier.id === 'pro'
                return (
                  <div
                    key={tier.id}
                    className={`relative flex flex-col rounded-2xl border p-6 ${
                      tier.highlight
                        ? 'border-[#7c6cff] bg-gradient-to-b from-[#7c6cff]/10 to-transparent'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    {tier.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7c6cff] px-3 py-1 text-xs font-bold text-white">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="mt-1 text-sm text-white/50">{tier.tagline}</p>

                    <div className="mt-5 min-h-[44px]">
                      {tier.id === 'community' && <p className="text-3xl font-extrabold">Free</p>}
                      {tier.id === 'pro' && <p className="text-3xl font-extrabold tracking-tight">{proPriceLabel}</p>}
                      {tier.id === 'teams' && (
                        <p className="text-3xl font-extrabold">
                          Custom<span className="ml-1 text-base font-medium text-white/40">/seat</span>
                        </p>
                      )}
                      {isPro && billing === 'yearly' && (
                        <p className="mt-1 text-xs text-white/40">
                          <span className="line-through">USD $450</span> billed yearly · save 20%
                        </p>
                      )}
                    </div>

                    {tier.ctaType === 'checkout' && (
                      <button
                        type="button"
                        onClick={() => setStep('checkout')}
                        className="mt-5 w-full rounded-lg bg-[#7c6cff] py-2.5 text-sm font-semibold text-white transition hover:bg-[#6b5bff]"
                      >
                        {tier.cta}
                      </button>
                    )}
                    {tier.ctaType === 'disabled' && (
                      <button
                        type="button"
                        disabled
                        className="mt-5 w-full cursor-not-allowed rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-white/40"
                      >
                        {tier.cta}
                      </button>
                    )}
                    {tier.ctaType === 'link' && (
                      <Link
                        href="#"
                        className="mt-5 w-full rounded-lg border border-white/15 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/5"
                      >
                        {tier.cta}
                      </Link>
                    )}

                    <ul className="mt-6 space-y-2.5">
                      {tier.features.map((f, i) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                          {i === 0 && f.endsWith('plus:') ? (
                            <span className="font-medium text-white/50">{f}</span>
                          ) : (
                            <>
                              <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7c6cff]" />
                              {f}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            {/* Education note */}
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 sm:flex-row">
              <div>
                <p className="text-sm font-semibold">D5 for Education</p>
                <p className="text-xs text-white/50">Free for students, educators, and academic institutions.</p>
              </div>
              <Link href="#" className="text-sm font-semibold text-[#8f83ff] hover:underline">
                Apply →
              </Link>
            </div>
          </div>
        ) : (
          /* ---------------- CHECKOUT ---------------- */
          <>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('pricing')}
                className="flex items-center gap-1 text-sm text-white/50 transition hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Plans
              </button>
              <span className="text-white/20">/</span>
              <h1 className="text-xl font-semibold tracking-tight">Confirm Order</h1>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
              {/* Left: billing toggle + order summary */}
              <div>
                {/* Billing toggle */}
                <div className="flex items-center gap-6">
                  {['monthly', 'yearly'].map((b) => {
                    const active = billing === b
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBilling(b)}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            active ? 'border-[#7c6cff]' : 'border-white/25'
                          }`}
                        >
                          {active && <span className="h-2 w-2 rounded-full bg-[#7c6cff]" />}
                        </span>
                        <span className={active ? 'text-white' : 'text-white/50'}>
                          {b === 'monthly' ? 'Pay Monthly' : 'Pay Yearly'}
                        </span>
                      </button>
                    )
                  })}
                  <span className="rounded bg-[#22c55e] px-2 py-0.5 text-xs font-semibold text-white">Save 20%</span>
                </div>

                {/* Order summary card */}
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-sm text-white/50">Upgrade to PRO</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight">
                    USD ${plan.price}
                    <span className="ml-2 align-middle text-sm font-medium text-white/40">{plan.per}</span>
                  </p>

                  {/* Selected plan row */}
                  <div className="mt-5 flex items-center justify-between rounded-lg border border-[#6b5bff]/40 bg-[#4b3fa3]/25 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-black px-2 py-1 text-xs font-bold text-white">Pro</span>
                      <div>
                        <p className="text-sm font-semibold">PRO</p>
                        <p className="mt-0.5 text-xs text-white/50">
                          {plan.cadence}
                          {plan.original && (
                            <span className="ml-2 text-white/30 line-through">{plan.original}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">USD ${plan.price}</span>
                  </div>

                  {/* Total */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-sm text-white/60">Total</span>
                    <span className="text-base font-bold">USD ${plan.price}</span>
                  </div>
                </div>
              </div>

              {/* Right: subscribe account + embedded express checkout */}
              <div className="space-y-4">
                {/* Subscribe account */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-white/40">Subscribe Account</p>
                      <p className="mt-1 text-sm font-semibold">Chafik Yahiaoui</p>
                      <p className="text-xs text-white/40">cha****@paddle.com</p>
                    </div>
                    <button type="button" className="text-white/40 hover:text-white/70" aria-label="Switch account">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Payment — embedded Paddle Express checkout */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                  <p className="text-sm font-semibold">Pay With</p>
                  <div className="mt-3">
                    <div id={EXPRESS_FRAME_ID} className={`${EXPRESS_FRAME_ID} checkout-frame w-full`} />
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/25 bg-transparent accent-[#7c6cff]"
                  />
                  <span>
                    I Agree to{' '}
                    <Link href="#" className="font-medium text-[#8f83ff] hover:underline">
                      D5 Membership Subscription Terms.
                    </Link>
                  </span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
