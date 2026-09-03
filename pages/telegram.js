'use client'

import { useEffect, useRef, useState } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

const TELEGRAM_PLANS = [
  {
    id: 'annual',
    label: 'Annual',
    subtitle: '12 months · £34.99',
    savingsText: '-40%',
    priceText: '£2.91/month',
    ctaText: 'Subscribe for £34.99 / year',
    priceId: 'pri_01khnxbjsqhrw5dmgnced0efa0',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    subtitle: '',
    savingsText: null,
    priceText: '£4.99/month',
    ctaText: 'Subscribe for £4.99 / month',
    priceId: 'pri_01khnx9dma2x8n7zbc5z3315nq',
  },
]

const TELEGRAM_FEATURES = [
  { title: 'Stories', description: 'Unlimited posting, priority order, stealth mode, permanent view history and more.' },
  { title: 'Unlimited Cloud Storage', description: '4 GB per each document, unlimited storage for your chats and media overall.' },
  { title: 'Doubled Limits', description: 'Up to 1000 channels, 30 folders, 10 pins, 20 public links, 4 accounts and more.' },
  { title: 'Telegram Business', description: 'Upgrade your account with business features such as location, opening hours.' },
  { title: 'Last Seen Times', description: 'View the last seen and read times of others even if you hide yours.' },
  { title: 'Voice-to-Text Conversion', description: 'Read the transcript of incoming voice messages.' },
  { title: 'Faster Download Speed', description: 'No limits on media and document download speed.' },
  { title: 'Real-Time Translation', description: 'Translate chats and channels in real time.' },
  { title: 'Animated Emoji', description: 'Include animated emoji from different packs in any message you send.' },
]

const PREMIUM_SPARKLES = ['✦', '✧', '✶', '✦', '✧', '✶', '✦', '✧']
const TELEGRAM_CHECKOUT_FRAME_ID = 'telegram-checkout-frame'

/** Native asset size */
const PHONE = { w: 415, h: 843 }

/**
 * Black bezel: only inside the display opening (under the PNG’s transparent glass),
 * not full-bleed on the asset (avoids black wrapping the silver frame / canvas corners).
 */
const DISPLAY_INSET = {
  top: `${(7 / PHONE.h) * 100}%`,
  bottom: `${(9 / PHONE.h) * 100}%`,
  left: `${(9 / PHONE.w) * 100}%`,
  right: `${(9 / PHONE.w) * 100}%`,
}

/** Prototype inset inside black: slightly larger L/R so side bezels match top/bottom thickness. */
const PROTO_EDGE = {
  y: 'max(5px, 1.15%)',
  x: 'max(10px, 2.45%)',
}

/**
 * z-order (back → front):
 * 0 — black (inner bezel ring inside the display cutout only)
 * 10 — prototype UI (inset inside black)
 * 20 — device frame PNG (status bar + island + hardware; transparent display)
 */
function PhoneMockup({ children }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[66px] bg-[#d4d4d4] shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
      style={{
        width: '100%',
        maxWidth: PHONE.w,
        aspectRatio: `${PHONE.w} / ${PHONE.h}`,
      }}
    >
      <div
        className="absolute z-0 rounded-[59px] bg-black"
        style={{
          top: DISPLAY_INSET.top,
          bottom: DISPLAY_INSET.bottom,
          left: DISPLAY_INSET.left,
          right: DISPLAY_INSET.right,
        }}
        aria-hidden
      >
        <div
          className="absolute flex min-h-0 flex-col overflow-hidden rounded-[52px] bg-[#f5f5f7]"
          style={{
            top: PROTO_EDGE.y,
            bottom: PROTO_EDGE.y,
            left: PROTO_EDGE.x,
            right: PROTO_EDGE.x,
          }}
        >
          {children}
        </div>
      </div>

      <img
        src="/device-iphone-17-pro-silver.png"
        alt=""
        width={PHONE.w}
        height={PHONE.h}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-fill"
        draggable={false}
      />
    </div>
  )
}

export default function TelegramFlowPage() {
  const [selectedPlan, setSelectedPlan] = useState(TELEGRAM_PLANS[0])
  const [paddle, setPaddle] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const checkoutOpenedRef = useRef(false)

  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: 'test_37a3ae9038ae86dd31608afd2b9',
      eventCallback: (event) => {
        console.log('Paddle event', event)
      },
    })
      .then((instance) => {
        if (instance) setPaddle(instance)
      })
      .catch(console.error)
  }, [])

  const openCheckout = () => {
    if (!paddle?.Initialized || !selectedPlan?.priceId || checkoutOpenedRef.current) return
    checkoutOpenedRef.current = true
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'light',
        locale: 'en',
        variant: 'express',
        frameTarget: TELEGRAM_CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%',
        frameInitialHeight: '500',
      },
      items: [{ priceId: selectedPlan.priceId, quantity: 1 }],
      customer: { email: 'chafik+telegram@paddle.com' },
    })
  }

  const handleSubscribe = () => {
    if (!paddle?.Initialized) return
    setCheckoutOpen(true)
    setTimeout(openCheckout, 100)
  }

  const closeCheckout = () => {
    checkoutOpenedRef.current = false
    setCheckoutOpen(false)
    if (paddle?.Checkout?.close) paddle.Checkout.close()
  }

  return (
    <div className="min-h-screen bg-[#f3f4f7] py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[min(100%,480px)] flex-col items-center px-3 sm:px-4">
        <PhoneMockup>
          <div className="min-h-0 w-full flex-1 overflow-y-auto px-3 pb-28 pt-10">
            <div className="w-full rounded-[22px] bg-white px-3 py-4 shadow-sm ring-1 ring-black/[0.04]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f3f7] text-black"
                  aria-label="Back"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold leading-none text-[#8d6bff]">Telegram Premium</h1>
                <div className="h-10 w-10" />
              </div>

              <div className="relative mt-2 rounded-2xl bg-gradient-to-b from-[#fbf8ff] to-white py-5">
                <div className="pointer-events-none absolute inset-0">
                  {PREMIUM_SPARKLES.map((sparkle, idx) => (
                    <span
                      key={`${sparkle}-${idx}`}
                      className="absolute text-xs text-[#b69bff]/80"
                      style={{
                        left: `${8 + ((idx * 11) % 84)}%`,
                        top: `${12 + ((idx * 9) % 70)}%`,
                      }}
                    >
                      {sparkle}
                    </span>
                  ))}
                </div>
                <h2 className="text-center text-5xl leading-none text-[#8d6bff]">★</h2>
              </div>

              <p className="mt-2 text-center text-[13px] font-semibold leading-tight text-black">
                Go beyond the limits and unlock dozens of exclusive features by subscribing to Telegram Premium.
              </p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
                {TELEGRAM_PLANS.map((plan, idx) => {
                  const isSelected = selectedPlan.id === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full px-3 py-3.5 text-left ${idx !== TELEGRAM_PLANS.length - 1 ? 'border-b border-black/10' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] ${
                              isSelected ? 'border-[#2aabee] bg-[#2aabee] text-white' : 'border-gray-300 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <div>
                            <p className="text-[15px] font-semibold text-black">
                              {plan.label}{' '}
                              {plan.savingsText && (
                                <span className="rounded bg-[#1f9dff] px-1 py-0.5 text-[10px] font-semibold text-white">
                                  {plan.savingsText}
                                </span>
                              )}
                            </p>
                            {plan.subtitle && <p className="text-[13px] text-gray-500">{plan.subtitle}</p>}
                          </div>
                        </div>
                        <p className="text-[14px] font-medium text-gray-500">{plan.priceText}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-[11px] font-semibold tracking-wide text-gray-500">WHAT&apos;S INCLUDED</p>
              <div className="mt-2 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white">
                {TELEGRAM_FEATURES.map((feature) => (
                  <div key={feature.title} className="flex gap-2.5 px-3 py-3">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#f66f45] text-xs text-white">
                      ✦
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-tight text-black">{feature.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7] to-transparent px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4">
            <button
              type="button"
              onClick={handleSubscribe}
              className="w-full rounded-full bg-gradient-to-r from-[#5ea2ff] to-[#7f6bff] py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(103,125,255,0.3)]"
            >
              {selectedPlan.ctaText}
            </button>
          </div>
        </PhoneMockup>
      </div>

      <div className={checkoutOpen ? 'fixed inset-0 z-40' : 'hidden'} role="dialog" aria-modal="true" aria-hidden={!checkoutOpen}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden onClick={closeCheckout} />
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 rounded-t-[36px] bg-[#f4f4f6]/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="rounded-[30px] border border-black/5 bg-white px-3 pb-3 pt-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <h3 className="text-[22px] font-semibold tracking-tight text-black">Paddle Pay</h3>
              <button
                type="button"
                onClick={closeCheckout}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                aria-label="Close checkout"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              id={TELEGRAM_CHECKOUT_FRAME_ID}
              className={`${TELEGRAM_CHECKOUT_FRAME_ID} checkout-frame min-h-[500px] w-full overflow-hidden rounded-3xl`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
