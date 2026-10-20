'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { initializePaddle } from '@paddle/paddle-js'

// CleanMyMac (MacPaw store) replica with an embedded Paddle Express checkout in
// place of the "Buy Now" button. Marketing prices mirror the live store; the
// embedded checkout uses reused Paddle sandbox price IDs so it renders live.
const CUR = '£'

const BILLING = [
  { id: 'annual', label: 'Annual' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'onetime', label: 'One Time' },
]

// One Paddle sandbox price per billing period (Mac-count is display-only here).
const PRICE_IDS = {
  annual: 'pri_01kyt2g25wzwjy7zcxxfvxamww',
  monthly: 'pri_01kyt2f6xfch0rag0a79bzc03p',
  onetime: 'pri_01kyt2gt1cg6k76hba265scky3',
}

const PLANS = {
  annual: [
    { macs: 1, perMonth: '2.58', perMonthWas: null, save: null, billedNow: '30.95', billedWas: null, payToday: '30.95' },
    { macs: 2, perMonth: '4.16', perMonthWas: '5.16', save: 'Save £11.95 per year', billedNow: '49.95', billedWas: '61.90', payToday: '49.95' },
    { macs: 5, perMonth: '8.33', perMonthWas: '12.90', save: 'Save £54.80 per year', billedNow: '99.95', billedWas: '154.75', payToday: '99.95' },
  ],
  monthly: [
    { macs: 1, perMonth: '7.95', perMonthWas: null, save: null, billedNow: null, billedWas: null, payToday: '7.95' },
    { macs: 2, perMonth: '12.95', perMonthWas: '15.90', save: 'Save £2.95 per month', billedNow: null, billedWas: null, payToday: '12.95' },
    { macs: 5, perMonth: '25.95', perMonthWas: '31.80', save: 'Save £5.85 per month', billedNow: null, billedWas: null, payToday: '25.95' },
  ],
  onetime: [
    { macs: 1, price: '89.95', priceWas: null, save: null, payToday: '89.95' },
    { macs: 2, price: '143.95', priceWas: '179.90', save: 'Save £35.95', payToday: '143.95' },
    { macs: 5, price: '287.95', priceWas: '449.75', save: 'Save £161.80', payToday: '287.95' },
  ],
}

const EXPRESS_FRAME_ID = 'cleanmymac-express-frame'
const EXPRESS_INITIAL_FRAME_HEIGHT = 220
const MIN_CHECKOUT_FRAME_HEIGHT = 80

function MacPawLogo() {
  return (
    <span className="flex items-center gap-2">
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gray-900">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M12 3a9 9 0 106.5 2.8"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.4" fill="#fff" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-gray-900">MacPaw</span>
    </span>
  )
}

function InfoIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5" />
      <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MacIcon({ count }) {
  const gid = `macgrad-${count}`
  return (
    <div className="relative">
      <svg viewBox="0 0 64 58" className="h-16 w-16 drop-shadow-sm">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff86e3" />
            <stop offset="1" stopColor="#c02bd6" />
          </linearGradient>
        </defs>
        <rect x="7" y="3" width="50" height="35" rx="4" fill={`url(#${gid})`} />
        <path d="M7 30h50v4a4 4 0 01-4 4H11a4 4 0 01-4-4z" fill="#a51fc0" opacity="0.35" />
        <rect x="27" y="38" width="10" height="7" fill="#e36fd6" />
        <rect x="17" y="45" width="30" height="5" rx="2.5" fill="#e36fd6" />
      </svg>
      {count > 1 && (
        <span className="absolute -bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffb020] text-xs font-bold text-white ring-2 ring-white">
          x{count}
        </span>
      )}
    </div>
  )
}

function PlanCard({ plan, period, selected, onSelect }) {
  const isSelected = selected === plan.macs
  const isOneTime = period === 'onetime'
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.macs)}
      className={`relative flex w-full flex-col items-center overflow-hidden rounded-2xl border-2 bg-white pt-9 text-center transition ${
        isSelected ? 'border-[#2f80ed] shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Mac icon overlapping the top */}
      <div className="-mt-2">
        <MacIcon count={plan.macs} />
      </div>

      <p className="mt-3 text-lg font-bold text-gray-900">
        Plan for {plan.macs} {plan.macs === 1 ? 'Mac' : 'Macs'}
      </p>

      <div className="mt-1 flex items-baseline justify-center gap-2">
        {isOneTime ? (
          <span className="text-lg font-bold text-gray-900">{`${CUR}${plan.price}`}</span>
        ) : (
          <span className="text-lg font-bold text-gray-900">
            {`${CUR}${plan.perMonth}`}
            <span className="font-semibold">/month</span>
          </span>
        )}
        {!isOneTime && plan.perMonthWas && (
          <span className="text-sm text-gray-400 line-through">{`${CUR}${plan.perMonthWas}`}</span>
        )}
        {isOneTime && plan.priceWas && (
          <span className="text-sm text-gray-400 line-through">{`${CUR}${plan.priceWas}`}</span>
        )}
      </div>

      {plan.save && (
        <p className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-[#e5397f]">
          {plan.save}
          <InfoIcon className="h-3.5 w-3.5" />
        </p>
      )}

      {/* Radio */}
      <span
        className={`mt-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          isSelected ? 'border-[#2f80ed]' : 'border-gray-300'
        }`}
      >
        {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#2f80ed]" />}
      </span>

      {/* Billed footer */}
      <div
        className={`mt-4 w-full px-4 py-3 text-sm ${
          isSelected ? 'bg-[#eaf1fc] text-gray-700' : 'bg-[#f5f5f7] text-gray-500'
        }`}
      >
        {isOneTime ? (
          'One-time payment'
        ) : plan.billedNow ? (
          <>
            Billed <span className="font-bold text-gray-900">{`${CUR}${plan.billedNow}`}</span>{' '}
            {plan.billedWas && (
              <span className="text-gray-400 line-through">{`${CUR}${plan.billedWas}`}</span>
            )}{' '}
            per year
          </>
        ) : (
          'Billed monthly'
        )}
      </div>
    </button>
  )
}

function FeatureItem({ icon, children, linkClass = '' }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-gray-500">{icon}</span>
      <span className={`text-sm leading-tight ${linkClass || 'text-gray-600'}`}>{children}</span>
    </div>
  )
}

export default function CleanMyMacStore() {
  const [paddle, setPaddle] = useState(null)
  const [period, setPeriod] = useState('annual')
  const [selectedMacs, setSelectedMacs] = useState(1)
  const [, setCheckoutFrameHeight] = useState(null)
  const [, setReceivedPing] = useState(false)
  const expressOpenRef = useRef(false)

  const plans = PLANS[period]
  const selectedPlan = plans.find((p) => p.macs === selectedMacs) || plans[0]
  const priceId = PRICE_IDS[period]

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
          console.log('CleanMyMac checkout completed', event.data?.transaction_id)
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
        theme: 'light',
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

  // Auto-load the embedded express checkout and keep it in sync with the plan.
  useEffect(() => {
    if (!paddle?.Initialized || !priceId) return
    if (expressOpenRef.current) {
      paddle.Checkout.updateCheckout({ items: [{ priceId, quantity: 1 }] })
    } else {
      setReceivedPing(false)
      setCheckoutFrameHeight(null)
      expressOpenRef.current = true
      openExpressCheckout(priceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle, priceId])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/">
            <MacPawLogo />
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-800">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
              </svg>
              Store
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              Menu
            </span>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-5xl px-4 pt-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Store</span>
          <span className="text-gray-300">›</span>
          <span className="flex items-center gap-1 font-medium text-gray-800">
            CleanMyMac
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Ukraine banner */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="rounded-xl bg-[#fdf6e3] px-4 py-3 text-center text-sm text-gray-700">
          Every user of MacPaw products helps us support 🇺🇦 Ukraine.{' '}
          <Link href="#" className="font-medium text-[#2f80ed] hover:underline">
            Learn more about how you can help.
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <h1 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Get the most out of your Mac with a CleanMyMac plan
        </h1>

        {/* Billing period toggle + info */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="inline-flex rounded-xl bg-[#f0f0f2] p-1">
            {BILLING.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setPeriod(b.id)}
                aria-pressed={period === b.id}
                className={`rounded-lg px-6 py-2 text-sm font-semibold transition ${
                  period === b.id
                    ? 'bg-white text-[#2f80ed] shadow-sm ring-1 ring-[#2f80ed]'
                    : 'text-gray-800 hover:text-gray-900'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <InfoIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Plan cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.macs}
              plan={plan}
              period={period}
              selected={selectedMacs}
              onSelect={setSelectedMacs}
            />
          ))}
        </div>

        {/* Features + checkout card */}
        <div className="mt-6 rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
            {/* Left: feature icons */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <FeatureItem
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 8v4l2.5 1.5" />
                  </svg>
                }
              >
                Instant Activation
              </FeatureItem>
              <FeatureItem
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                    <path strokeLinecap="round" d="M8 3v4M16 3v4M4 10h16" />
                  </svg>
                }
              >
                30-day money back guarantee
              </FeatureItem>
              <FeatureItem
                icon={<InfoIcon className="h-5 w-5 text-[#2f80ed]" />}
                linkClass="text-[#2f80ed]"
              >
                Easy subscription cancellation
              </FeatureItem>
              <FeatureItem
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a8 8 0 1116 0v4a2 2 0 01-2 2h-1v-6h3M4 13v4a2 2 0 002 2h1v-6H4" />
                  </svg>
                }
              >
                24/7 Technical and Sales Support
              </FeatureItem>
              <FeatureItem
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path strokeLinecap="round" d="M8 11V8a4 4 0 018 0v3" />
                  </svg>
                }
              >
                Secure payment encryption
              </FeatureItem>
            </div>

            {/* Right: pay today + embedded express checkout */}
            <div>
              <p className="text-right text-sm text-gray-500">
                You pay today:{' '}
                <span className="font-bold text-gray-900">{`${CUR}${selectedPlan.payToday}`}</span>
              </p>

              {/* Express checkout embed — replaces the "Buy Now" button */}
              <div className="mt-3 rounded-xl bg-[#f9f9fb] p-3">
                <div id={EXPRESS_FRAME_ID} className={`${EXPRESS_FRAME_ID} checkout-frame w-full`} />
                {!paddle && (
                  <p className="py-6 text-center text-sm text-gray-400">Loading secure checkout…</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold">
                <span className="text-[#1a1f71]">VISA</span>
                <span className="text-[#eb001b]">Mastercard</span>
                <span className="text-[#016fd0]">AMEX</span>
                <span className="text-[#003087]">PayPal</span>
                <span className="text-[#cc0000]">Maestro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spec card */}
        <div className="mt-8 rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            <div className="sm:border-r sm:border-gray-100">
              <svg className="mx-auto h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="12" rx="2" />
                <path strokeLinecap="round" d="M8 20h8" />
              </svg>
              <p className="mt-2 text-xs text-gray-400">System Requirements:</p>
              <p className="mt-1 text-sm text-gray-700">macOS 11+, 320 MB</p>
              <p className="text-sm text-gray-700">Min. display size: 1200x800 px</p>
            </div>
            <div className="sm:border-r sm:border-gray-100">
              <svg className="mx-auto h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l2.5 5 5.5.8-4 3.9.9 5.4L12 16.9 7.1 19l.9-5.4-4-3.9L9.5 9z" />
              </svg>
              <p className="mt-2 text-xs text-gray-400">Rating:</p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="text-[#ffb020]">★★★★★</span> / 4.7*
              </p>
            </div>
            <div className="sm:border-r sm:border-gray-100">
              <svg className="mx-auto h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12l-8 8-8-8V5a1 1 0 011-1h6l9 8z" />
                <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
              </svg>
              <p className="mt-2 text-xs text-gray-400">Pricing:</p>
              <p className="mt-1 text-sm text-gray-700">{`Starting at ${CUR}2.58/month`}</p>
            </div>
            <div>
              <InfoIcon className="mx-auto h-5 w-5 text-gray-400" />
              <p className="mt-2 text-xs text-gray-400">Latest Version:</p>
              <p className="mt-1 text-sm text-gray-700">5.5.7, 22 July 2026</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          *4.7 - rating for all versions, based on 3327 user reviews.
        </p>
      </main>
    </div>
  )
}
