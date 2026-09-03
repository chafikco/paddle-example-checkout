'use client'

import { useState, useEffect, useRef } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

// $0 subscription price used purely to vault the customer's card.
const VAULT_PRICE_ID = 'pri_01m1kjr2dvp3b6qz1nearthct6'
const CHECKOUT_FRAME_ID = 'twon-checkout-frame'
const DEFAULT_CHECKOUT_FRAME_HEIGHT = 460
const MIN_CHECKOUT_FRAME_HEIGHT = 300

const STEPS = [
  { id: 'save', title: 'Save your card', caption: '$0.00 authorization today' },
  { id: 'charge', title: 'One-time charge', caption: '$10.00 using your saved card' },
]

function StepBadge({ index, state }) {
  // state: 'done' | 'active' | 'todo'
  return (
    <span
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ${
        state === 'done'
          ? 'bg-emerald-500 text-white ring-emerald-500'
          : state === 'active'
            ? 'bg-indigo-600 text-white ring-indigo-600'
            : 'bg-white text-slate-400 ring-slate-200'
      }`}
    >
      {state === 'done' ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  )
}

function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function TwoNVaultFlow() {
  const [paddle, setPaddle] = useState(null)
  // status: 'collecting' | 'processing' | 'done' | 'error'
  const [status, setStatus] = useState('collecting')
  const [chargeResult, setChargeResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [receivedPing, setReceivedPing] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState(null)
  const checkoutOpenedRef = useRef(false)
  const handledCompletionRef = useRef(false)
  const paddleRef = useRef(null)

  const startCharge = async (transactionId) => {
    setStatus('processing')
    try {
      const r = await fetch('/api/2n/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      })
      const j = await r.json()
      if (!r.ok || j.error) {
        throw new Error(j?.error?.detail || j?.message || 'One-time charge failed')
      }
      setChargeResult(j)
      setStatus('done')
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

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
                ? Math.max(MIN_CHECKOUT_FRAME_HEIGHT, window.innerHeight - 160)
                : DEFAULT_CHECKOUT_FRAME_HEIGHT
            setReceivedPing(true)
            setCheckoutFrameHeight(Math.min(cap, Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reported)))))
          }
          return
        }

        if (event?.name === 'checkout.completed' && !handledCompletionRef.current) {
          handledCompletionRef.current = true
          const transactionId = event?.data?.transaction_id
          if (paddleRef.current?.Checkout?.close) {
            try { paddleRef.current.Checkout.close() } catch (_) {}
          }
          startCharge(transactionId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCheckout = () => {
    if (!paddle?.Initialized || checkoutOpenedRef.current) return
    checkoutOpenedRef.current = true

    // Open the checkout immediately so it always loads...
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'light',
        locale: 'en',
        variant: 'one-page',
        showAddTaxId: false,
        frameTarget: CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: String(DEFAULT_CHECKOUT_FRAME_HEIGHT),
      },
      items: [{ priceId: VAULT_PRICE_ID, quantity: 1 }],
    })

    // ...then geolocate the customer by IP via PricePreview in the background and
    // pre-fill their detected country so they don't have to pick it manually.
    paddle
      .PricePreview({ items: [{ priceId: VAULT_PRICE_ID, quantity: 1 }] })
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

  // Auto-load the card-vaulting checkout once Paddle is ready.
  useEffect(() => {
    if (paddle?.Initialized && status === 'collecting') {
      const t = setTimeout(openCheckout, 80)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle, status])

  const reset = () => {
    handledCompletionRef.current = false
    checkoutOpenedRef.current = false
    setChargeResult(null)
    setErrorMsg('')
    setReceivedPing(false)
    setCheckoutFrameHeight(null)
    setDetectedCountry(null)
    setStatus('collecting')
  }

  const saveDone = status === 'processing' || status === 'done' || status === 'error'
  const chargeActive = status === 'processing'
  const chargeDone = status === 'done'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white">
              2N
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Secure card setup</p>
              <p className="text-xs text-slate-500">Powered by Paddle · Sandbox</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
            <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1l6 3v5c0 4-2.7 7.5-6 9-3.3-1.5-6-5-6-9V4l6-3zm3.7 6.3a1 1 0 00-1.4-1.4L9 9.2 7.7 7.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
            </svg>
            256-bit secure
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Left: explainer */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Save a card, then pay once</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              We securely store your card with a <span className="font-semibold text-slate-700">$0.00</span>{' '}
              authorization, then immediately place a one-time{' '}
              <span className="font-semibold text-slate-700">$10.00</span> charge using the saved card — no re-entry
              required.
            </p>

            {/* Steps */}
            <ol className="mt-8 space-y-5">
              {STEPS.map((step, i) => {
                const state =
                  step.id === 'save'
                    ? saveDone
                      ? 'done'
                      : 'active'
                    : chargeDone
                      ? 'done'
                      : chargeActive
                        ? 'active'
                        : 'todo'
                return (
                  <li key={step.id} className="flex items-start gap-4">
                    <StepBadge index={i} state={state} />
                    <div className="pt-0.5">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="text-xs text-slate-500">{step.caption}</p>
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* Illustrative note: this whole panel is yours to design. The $0 card
                vaulting is an implementation detail you can hide from customers. */}
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Example
                </span>
                <p className="text-xs font-semibold text-slate-600">What your customers could see instead</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                The $0 card-save + $10 charge is an implementation detail. You control all copy and the breakdown —
                customers never need to see the $0 vaulting step. For example:
              </p>

              {/* Mock customer-facing receipt — just $10, no $0 mention */}
              <div className="mt-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">2N — Service activation</span>
                  <span className="font-medium text-slate-900">$10.00</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-semibold text-slate-900">Total due today</span>
                  <span className="text-lg font-bold text-slate-900">$10.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: checkout / status */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            {status === 'collecting' && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Card details</h2>
                    {detectedCountry && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        Location detected ({detectedCountry}) &amp; pre-filled
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    $0.00 today
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
              </>
            )}

            {status !== 'collecting' && (
              <div className="flex min-h-[420px] flex-col">
                <h2 className="text-lg font-semibold text-slate-900">Processing your payment</h2>

                <div className="mt-6 space-y-3">
                  {/* Card saved */}
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Card securely saved</p>
                      <p className="text-xs text-emerald-700">$0.00 authorization complete</p>
                    </div>
                  </div>

                  {/* $10 charge */}
                  <div
                    className={`flex items-center gap-3 rounded-xl p-4 ring-1 ${
                      chargeDone
                        ? 'bg-emerald-50 ring-emerald-200'
                        : status === 'error'
                          ? 'bg-rose-50 ring-rose-200'
                          : 'bg-indigo-50 ring-indigo-200'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
                        chargeDone ? 'bg-emerald-500' : status === 'error' ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                    >
                      {chargeDone ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : status === 'error' ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <Spinner className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          chargeDone ? 'text-emerald-900' : status === 'error' ? 'text-rose-900' : 'text-indigo-900'
                        }`}
                      >
                        {chargeDone
                          ? '$10.00 charged'
                          : status === 'error'
                            ? 'One-time charge failed'
                            : 'Charging $10.00…'}
                      </p>
                      <p
                        className={`text-xs ${
                          chargeDone ? 'text-emerald-700' : status === 'error' ? 'text-rose-700' : 'text-indigo-700'
                        }`}
                      >
                        {chargeDone
                          ? 'One-time charge via saved card'
                          : status === 'error'
                            ? errorMsg
                            : 'Using the one-time charge API…'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Result details */}
                {chargeDone && chargeResult && (
                  <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Subscription</span>
                      <span className="font-mono">{chargeResult.subscriptionId}</span>
                    </div>
                    {chargeResult.chargeTransactionId && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Charge txn</span>
                        <span className="font-mono">{chargeResult.chargeTransactionId}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Charge status</span>
                      <span className="font-medium text-slate-700">{chargeResult.chargeStatus || '—'}</span>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-6">
                  {chargeDone && (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      All done — card saved &amp; $10.00 charged
                    </div>
                  )}
                  {status === 'error' && (
                    <button
                      type="button"
                      onClick={reset}
                      className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
