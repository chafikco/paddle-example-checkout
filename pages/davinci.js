'use client'

import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { initializePaddle } from '@paddle/paddle-js'

// Davinci (davinci.ai) "Unlock all models with Pro!" upgrade modal, rebuilt with
// an embedded Paddle Express checkout. Uses the live/production environment so
// the sandbox "Test Mode" badge is gone.
//
// Marketing prices are display-only; the embed uses the live Paddle price IDs.
const PLANS = {
  trial: {
    id: 'trial',
    name: '7-Day Full Access',
    price: '£1.99',
    per: null,
    badge: null,
    dueNow: '£1.99',
    priceId: 'pri_01m7ja721zq3zmzq6yjw4fbfg1', // monthly with trial
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly',
    price: '£15.33',
    per: 'per month',
    badge: 'Save up to 33%',
    dueNow: '£45.99',
    priceId: 'pri_01m7ja848j4mbqpyg5sr2w3tbn', // quarterly
  },
}

const PLAN_ORDER = ['trial', 'quarterly']

const EXPRESS_FRAME_ID = 'davinci-express-frame'
const EXPRESS_INITIAL_FRAME_HEIGHT = 220
const MIN_CHECKOUT_FRAME_HEIGHT = 80

// Format Paddle minor-unit amounts (e.g. "2999") into the localized currency.
function formatAmount(amount, currencyCode) {
  if (amount == null || !currencyCode) return null
  try {
    // 'en-US' keeps the symbol style consistent with Paddle's formatting ("$"/"£"
    // rather than Intl's default "US$" in some locales).
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
      Number(amount) / 100,
    )
  } catch (_) {
    return null
  }
}

function RadioDot({ selected }) {
  return (
    <span
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected ? 'border-[#3b82f6]' : 'border-white/30'
      }`}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />}
    </span>
  )
}

export default function DavinciFlow() {
  const [paddle, setPaddle] = useState(null)
  const [selected, setSelected] = useState('trial') // 'trial' | 'quarterly'
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [preview, setPreview] = useState(null) // localized prices from PricePreview, keyed by plan id

  // Guards against opening the checkout twice (incl. React StrictMode's
  // double-invoked mount effect in dev). Only set true when open actually fires.
  const openedRef = useRef(false)

  const plan = PLANS[selected]
  const priceId = plan.priceId

  useEffect(() => {
    initializePaddle({
      environment: 'production',
      token: 'live_93ba7f4e29bffc0902806b9bbbf',
      eventCallback: (event) => {
        if (event?.name === 'ping.size') {
          const reported = [
            event?.data?.height,
            event?.data?.frame_height,
            event?.data?.size?.height,
            event?.height,
          ].find((v) => Number.isFinite(Number(v)) && Number(v) > 0)
          if (reported) {
            setCheckoutFrameHeight(Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reported))))
          }
          return
        }
        if (event?.name === 'checkout.completed') {
          console.log('Davinci checkout completed', event.data?.transaction_id)
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

  // Open the embedded express checkout once Paddle is ready.
  useEffect(() => {
    if (!paddle?.Initialized || openedRef.current) return
    // Let the frame mount before Paddle targets it.
    const t = setTimeout(() => {
      if (openedRef.current) return
      openedRef.current = true
      openExpressCheckout(PLANS[selected].priceId)
    }, 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle])

  // Keep the open checkout in sync with the selected plan.
  useEffect(() => {
    if (!paddle?.Initialized || !openedRef.current) return
    paddle.Checkout.updateCheckout({ items: [{ priceId, quantity: 1 }] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceId])

  // Pull localized prices from PricePreview (currency-enabled plans).
  useEffect(() => {
    if (!paddle?.Initialized) return
    let cancelled = false
    paddle
      .PricePreview({ items: PLAN_ORDER.map((id) => ({ priceId: PLANS[id].priceId, quantity: 1 })) })
      .then((r) => {
        if (cancelled) return
        const currency = r?.data?.currencyCode
        const byPrice = {}
        for (const li of r?.data?.details?.lineItems || []) byPrice[li.price?.id] = li
        const map = {}
        for (const id of PLAN_ORDER) {
          const li = byPrice[PLANS[id].priceId]
          if (!li) continue
          const cycle = li.price?.billingCycle || {}
          const trial = li.price?.trialPeriod || null
          map[id] = {
            // Amount charged now for this plan (trial price when there's a paid trial).
            dueNow: li.formattedTotals?.total || null,
            // Standard recurring unit price (what's charged after any trial).
            recurring: formatAmount(li.price?.unitPrice?.amount, currency) || li.formattedTotals?.total || null,
            interval: cycle.interval || null,
            hasTrial: !!trial,
            trialDays: trial?.frequency || null,
            trialInterval: trial?.interval || null,
          }
        }
        setPreview(map)
      })
      .catch((e) => console.warn('PricePreview failed', e))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle])

  return (
    <>
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
    </Head>
    <div
      className="min-h-screen bg-[#0a0a0b] px-4 py-10 text-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="mx-auto flex min-h-[80vh] max-w-[58rem] items-center justify-center">
        {/* ---------------- Upgrade modal ---------------- */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0F0F0F] shadow-2xl">
          <Link
            href="/"
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_416px]">
            {/* Left: artwork panel. Image (with "Trial for You" + model row baked in)
                is inset with padding and rounded corners to match the original.
                The inner wrapper is black so object-contain letterboxing is invisible
                against the image's black background (keeps the model row visible). */}
            <div className="relative hidden items-center justify-center bg-[#0F0F0F] p-5 md:flex">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black">
                <img
                  src="/davinci-trial.png"
                  alt="Unlock all AI models with Pro"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Right: offer + express checkout */}
            <div className="flex flex-col p-5 sm:p-6">
              <h2 className="text-xl font-bold tracking-tight text-white">Unlock all models with Pro!</h2>
              <p className="mt-2 text-[13px] leading-5 text-white/80">
                Full access to premium AI models, image generation, and video generation.
              </p>

              {/* Plan options. The offer badge is a tab attached to the top plan box. */}
              <div className="mt-8 space-y-3">
                {PLAN_ORDER.map((id, index) => {
                  const p = PLANS[id]
                  const isSelected = selected === id
                  const isTop = index === 0
                  const pv = preview?.[id]
                  // Trial plan shows its due-now (trial) price; others show the recurring unit price.
                  const headline = id === 'trial' ? pv?.dueNow ?? p.price : pv?.recurring ?? p.price
                  const perLabel = id === 'trial' ? null : pv?.interval ? `per ${pv.interval}` : p.per
                  return (
                    <div key={id} className="relative">
                      {isTop && (
                        <span className="absolute left-5 -top-2 z-0 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#123524] px-2.5 pb-2.5 pt-0.5 text-[10px] font-semibold text-[#6ee7a0] ring-1 ring-[#2e7d50]">
                          5,540 people have used this offer today!
                        </span>
                      )}
                    <button
                      type="button"
                      onClick={() => setSelected(id)}
                      className={`relative z-10 flex min-h-[60px] w-full items-center justify-between rounded-xl border px-4 text-left transition ${
                        isSelected
                          ? 'border-[#3b82f6] bg-[#15213c]'
                          : 'border-white/10 bg-[#27272c] hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <RadioDot selected={isSelected} />
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{p.name}</span>
                          {p.badge && (
                            <span className="rounded-md bg-[#22c55e]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#22c55e]">
                              {p.badge}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="text-base font-bold text-white">{headline}</span>
                        {perLabel && <span className="block text-[11px] text-white/60">{perLabel}</span>}
                      </span>
                    </button>
                    </div>
                  )
                })}
              </div>

              {/* Charge disclaimer — reflects the selected plan (prices from PricePreview) */}
              {(() => {
                const pv = preview?.[selected]
                const links = (
                  <>
                    {' '}
                    unless you cancel through your <span className="underline">account settings</span>. By tapping
                    Purchase, you agree to our <span className="underline">Terms</span>,{' '}
                    <span className="underline">Privacy</span> and <span className="underline">Refund Policy</span>. See
                    our <span className="underline">Pricing</span> page for full plan details.
                  </>
                )
                return (
                  <p className="mt-4 text-[11px] leading-[15px] text-white/75">
                    {pv?.hasTrial ? (
                      <>
                        Get a {pv.trialDays}-{pv.trialInterval || 'day'} trial for just {pv.dueNow}. After the trial,{' '}
                        <span className="font-semibold text-white">
                          you&apos;ll be charged {pv.recurring}/{pv.interval || 'month'}
                        </span>
                        {links}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-white">
                          You&apos;ll be charged {pv?.recurring ?? plan.price}/{pv?.interval || 'month'}
                        </span>
                        {links}
                      </>
                    )}
                  </p>
                )
              })()}

              {/* Due now (no divider line above) */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Due now</span>
                <span className="text-base font-bold text-white">{preview?.[selected]?.dueNow ?? plan.dueNow}</span>
              </div>

              {/* Embedded Paddle Express checkout (replaces the PayPal button). */}
              <div className="mt-4">
                <div
                  id={EXPRESS_FRAME_ID}
                  className={`${EXPRESS_FRAME_ID} checkout-frame w-full`}
                  style={{ minHeight: checkoutFrameHeight ? `${checkoutFrameHeight}px` : `${EXPRESS_INITIAL_FRAME_HEIGHT}px` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
