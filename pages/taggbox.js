'use client'

import { useState, useEffect, useRef } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

// Taggbox-style pricing flow. Paddle sandbox price IDs reused from the playground.
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Best For Small Sites, Testing',
    price: { monthly: 'Free', annually: 'Free' },
    suffix: { monthly: '', annually: '' },
    feedsLabel: null,
    current: true,
    highlighted: false,
    poweredBy: false,
    priceId: null,
    features: [
      { label: '1 Feeds', included: true },
      { label: '500 Views/Month', included: true },
      { label: '10+ Platforms', included: true },
      { label: 'LinkedIn & Twitter Feed', included: true },
      { label: 'Updates every 4 Days', included: true },
      { label: 'Manual Moderation', included: true },
      { label: '500 Posts', included: true },
      { label: 'Ad Free', included: false },
      { label: 'Review Collection', included: true },
      { label: 'Video Walkthrough & Guide', included: true },
      { label: 'Social Publish (1 Posts/Month)', included: true },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Best For Small Businesses',
    price: { monthly: '$19', annually: '$14' },
    suffix: { monthly: '/mo', annually: '/mo' },
    feedsLabel: '2 Feeds',
    current: false,
    highlighted: false,
    poweredBy: false,
    priceId: {
      monthly: 'pri_01gswmcwfgbecj8v5fgw807mas',
      annually: 'pri_01gswmc7s6n2sn1nyen8gc12ed',
    },
    features: [
      { label: '10K Views/Month', included: true },
      { label: '15+ Platforms', included: true },
      { label: 'LinkedIn & Twitter Feed', included: true },
      { label: 'Updates every 2 Hours', included: true },
      { label: 'Manual Moderation', included: true },
      { label: '5,000 Posts', included: true },
      { label: '100% Ad Free', included: true },
      { label: 'Review Collection', included: true },
      { label: 'Video Walkthrough & Guide', included: true },
      { label: 'Social Publish (20 Posts/Month)', included: true },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'Best For Growing Brands',
    price: { monthly: '$29', annually: '$22' },
    suffix: { monthly: '/mo', annually: '/mo' },
    feedsLabel: '4 Feeds',
    current: false,
    highlighted: false,
    poweredBy: false,
    priceId: {
      monthly: 'pri_01gswn2pwscp9j6btjb6rkj1f4',
      annually: 'pri_01gswn2btpmzsss87d9rn2arnj',
    },
    features: [
      { label: '50K Views/Month', included: true },
      { label: '15+ Platforms', included: true },
      { label: 'LinkedIn & Twitter Feed', included: true },
      { label: 'Updates every 30 Minutes', included: true },
      { label: 'Automatic Moderation', included: true },
      { label: '30,000 Posts', included: true },
      { label: '100% Ad Free', included: true },
      { label: 'Review Collection', included: true },
      { label: 'Video Walkthrough & Guide', included: true },
      { label: 'Social Publish (50 Posts/Month)', included: true },
    ],
  },
  {
    id: 'advance',
    name: 'Advance',
    subtitle: 'Best For E-commerce, Large Brands',
    price: { monthly: '$79', annually: '$59' },
    suffix: { monthly: '/mo', annually: '/mo' },
    feedsLabel: '10 Feeds',
    current: false,
    highlighted: true,
    poweredBy: true,
    priceId: {
      monthly: 'pri_01gswn42yn53crcajg39z2s8kg',
      annually: 'pri_01gswn3prc1n5t776r84es63vd',
    },
    features: [
      { label: '1M Views/Month', included: true },
      { label: '15+ Platforms', included: true },
      { label: 'LinkedIn & Twitter Feed', included: true },
      { label: 'Updates every 15 Minutes', included: true },
      { label: 'AI Moderation', included: true },
      { label: '1,00,000 Posts', included: true },
      { label: '100% Ad Free', included: true },
      { label: 'Review Collection', included: true },
      { label: 'Video Walkthrough & Guide', included: true },
      { label: 'Social Publish (150 Posts/Month)', included: true },
    ],
  },
]

const PINK = '#e6447e'
const CHECKOUT_FRAME_ID = 'taggbox-checkout-frame'
const DEFAULT_CHECKOUT_FRAME_HEIGHT = 460
const MIN_CHECKOUT_FRAME_HEIGHT = 380

const SIDEBAR_ITEMS = [
  {
    label: 'Home',
    path: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10',
  },
  {
    label: 'Content Gallery',
    path: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 11l4-4 4 4 4-5 4 4',
  },
  {
    label: 'Product Catalog',
    path: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7',
  },
  {
    label: 'Customize & Publish',
    path: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z',
  },
  {
    label: 'Apps & more',
    path: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  },
  {
    label: 'Analytics',
    path: 'M4 20V10m6 10V4m6 16v-6',
  },
]

function CheckIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-[#22c55e]" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="ml-1 inline-block h-3 w-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlanCard({ plan, frequency, onSelect }) {
  return (
    <div className="relative flex h-full flex-col">
      {plan.poweredBy && (
        <div className="absolute -top-3 right-4 z-10 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
          Powered by
          <span className="font-semibold text-gray-800">✦ TruSense</span>
        </div>
      )}
      <div
        className={`flex h-full flex-col rounded-2xl bg-white p-6 ${
          plan.highlighted
            ? 'border-2 border-[#e6447e] shadow-[0_4px_24px_rgba(230,68,126,0.12)]'
            : 'border border-gray-200'
        }`}
        style={plan.id === 'free' ? { borderTop: `3px solid ${PINK}` } : undefined}
      >
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <p className="mt-1 text-xs text-gray-500">{plan.subtitle}</p>

        <div className="mt-4 flex items-end">
          <span className="text-3xl font-extrabold text-gray-900">{plan.price[frequency]}</span>
          {plan.suffix[frequency] && (
            <span className="mb-1 ml-1 text-xs text-gray-400">{plan.suffix[frequency]}</span>
          )}
        </div>

        {plan.current ? (
          <button
            type="button"
            disabled
            className="mt-5 w-full rounded-lg bg-[#e6447e] py-2.5 text-sm font-semibold text-white"
          >
            Current Plan
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(plan)}
            className="mt-5 w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#e6447e] hover:text-[#e6447e]"
          >
            Select Plan
          </button>
        )}

        {plan.feedsLabel && (
          <p className="mt-5 text-sm font-semibold text-gray-900">{plan.feedsLabel}</p>
        )}

        <ul className={`${plan.feedsLabel ? 'mt-3' : 'mt-5'} space-y-2.5`}>
          {plan.features.map((feature) => (
            <li key={feature.label} className="flex items-center text-xs text-gray-600">
              {feature.included ? <CheckIcon /> : <CrossIcon />}
              <span className="ml-2">{feature.label}</span>
              <InfoIcon />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function TaggboxPricingPage() {
  const [frequency, setFrequency] = useState('monthly')
  const [paddle, setPaddle] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [receivedCheckoutSizePing, setReceivedCheckoutSizePing] = useState(false)
  const checkoutOpenedRef = useRef(false)
  const closeModalRef = useRef(null)

  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: 'test_37a3ae9038ae86dd31608afd2b9',
      eventCallback: (event) => {
        console.log('Paddle event', event)
        if (event?.name === 'ping.size') {
          const reportedHeight = [
            event?.data?.height,
            event?.data?.frame_height,
            event?.data?.size?.height,
            event?.height,
          ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0)

          if (reportedHeight) {
            const viewportCap =
              typeof window !== 'undefined'
                ? Math.max(MIN_CHECKOUT_FRAME_HEIGHT, window.innerHeight - 200)
                : DEFAULT_CHECKOUT_FRAME_HEIGHT
            const nextHeight = Math.min(
              viewportCap,
              Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reportedHeight)))
            )
            setReceivedCheckoutSizePing(true)
            setCheckoutFrameHeight(nextHeight)
          }
          return
        }

        if (event?.name === 'checkout.completed') {
          // Keep the modal open so Paddle can render its success state inline.
          console.log('checkout completed', event.data?.transaction_id)
        }
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
  }, [])

  const openCheckout = (plan) => {
    if (!paddle?.Initialized || !plan?.priceId || checkoutOpenedRef.current) return
    checkoutOpenedRef.current = true
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'light',
        locale: 'en',
        frameTarget: CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: String(DEFAULT_CHECKOUT_FRAME_HEIGHT),
      },
      items: [{ priceId: plan.priceId[frequency], quantity: 1 }],
      customer: {
        email: 'chafik@paddle.com',
        address: {
          countryCode: 'GB',
          postalCode: 'E8 2HL',
        },
      },
    })
  }

  const handleSelectPlan = (plan) => {
    if (!paddle?.Initialized) {
      console.warn('Paddle not ready yet.')
      return
    }
    setSelectedPlan(plan)
    setTimeout(() => openCheckout(plan), 100)
  }

  const closeModal = () => {
    checkoutOpenedRef.current = false
    setCheckoutFrameHeight(null)
    setReceivedCheckoutSizePing(false)
    setSelectedPlan(null)
    if (paddle?.Checkout?.close) paddle.Checkout.close()
  }
  closeModalRef.current = closeModal

  const modalOpen = selectedPlan !== null

  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-gray-900">
      {/* Sidebar */}
      <aside className="flex w-[72px] flex-shrink-0 flex-col items-center border-r border-gray-200 bg-white py-4">
        <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-[#e6447e] text-sm font-bold text-white">
          T
        </div>
        <nav className="flex flex-col items-center gap-5">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex flex-col items-center gap-1 text-gray-400 transition hover:text-[#e6447e]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
              </svg>
              <span className="text-center text-[8px] leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <button
            type="button"
            className="rounded-md bg-[#e6447e] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#d63a72]"
          >
            Upgrade Now
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
            </svg>
            96 hours
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="text-xs">EN</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
              C
            </div>
          </div>
        </header>

        {/* Pricing area */}
        <main className="relative flex-1 px-6 py-8">
          <button
            type="button"
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Frequency toggle */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${frequency === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={frequency === 'annually'}
              onClick={() => setFrequency((f) => (f === 'monthly' ? 'annually' : 'monthly'))}
              className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full bg-[#e6447e] transition"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  frequency === 'annually' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${frequency === 'annually' ? 'text-gray-900' : 'text-gray-400'}`}>
              Annually
            </span>
            <span className="ml-1 text-sm font-semibold text-[#e6447e]">Save 25%</span>
          </div>

          {/* Plan cards */}
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} frequency={frequency} onSelect={handleSelectPlan} />
            ))}
          </div>

          {/* Compare */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              className="rounded-md border border-[#e6447e] px-5 py-2 text-sm font-medium text-[#e6447e] transition hover:bg-[#e6447e] hover:text-white"
            >
              Compare All Plans
            </button>
          </div>
        </main>
      </div>

      {/* Payment modal with inline Paddle checkout */}
      <div
        className={modalOpen ? 'fixed inset-0 z-50' : 'hidden'}
        role="dialog"
        aria-modal="true"
        aria-hidden={!modalOpen}
      >
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[1px]" aria-hidden onClick={closeModal} />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-base font-semibold text-gray-900">Payment</h2>
            <button
              type="button"
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-5 pb-3 pt-4">
            <p className="text-sm font-medium text-gray-700">
              Complete your purchase for the{' '}
              <span className="font-semibold text-[#e6447e]">{selectedPlan?.name}</span> plan.
            </p>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-4 pb-4">
            <div
              id={CHECKOUT_FRAME_ID}
              className={`${CHECKOUT_FRAME_ID} checkout-frame w-full rounded-lg ${modalOpen ? '' : 'hidden'}`}
              style={
                receivedCheckoutSizePing && checkoutFrameHeight
                  ? { height: `${checkoutFrameHeight}px` }
                  : { minHeight: `${DEFAULT_CHECKOUT_FRAME_HEIGHT}px` }
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
