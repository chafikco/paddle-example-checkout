'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { initializePaddle } from '@paddle/paddle-js'
import Link from 'next/link'

// Bitesize flow: Paddle price IDs
const BITESIZE_PLANS = [
  {
    id: '1month',
    label: '1 month',
    originalPrice: 20.44,
    discountedPrice: 6.72,
    perDay: 0.22,
    badge: 'SAVE 70%',
    priceId: 'pri_01kr16m6bmh3n1b2vgfdhp0he2', // monthly
  },
  {
    id: '3month',
    label: '3 month',
    originalPrice: 20.44,
    discountedPrice: 12.99,
    perDay: 0.14,
    badge: 'SAVE 70%',
    mostPopular: true,
    priceId: 'pri_01kr16mx10498vah907975hmme', // quarterly
  },
  {
    id: '1year',
    label: '1 year',
    originalPrice: 100.8,
    discountedPrice: 39.99,
    perDay: 0.11,
    badge: 'BEST OFFER',
    priceId: 'pri_01kr16q2hcg87evz577x03c2jn', // yearly
  },
]

const FEATURES = [
  {
    title: 'Know more in minutes',
    description: 'Get the key insights from bestselling books, podcasts, and articles.',
    icon: (
      <svg className="w-10 h-10 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M9.5 15h5" />
      </svg>
    ),
  },
  {
    title: 'Feed your curiosity',
    description: 'Personal recommendations to discover new ideas and hundreds of topics.',
    icon: (
      <svg className="w-10 h-10 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    ),
  },
  {
    title: 'Listen, learn, gain insights!',
    description: 'Learn from experts through bite-size audio & exclusive personal insights.',
    icon: (
      <svg className="w-10 h-10 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    ),
  },
]

const REVIEWS = [
  { stars: 5, text: 'This app has completely changed how I consume content. I get through so many more books now!', name: 'Kev Richards', avatar: 'KR' },
  { stars: 5, text: 'The summaries are spot-on and the audio is perfect for my commute. Highly recommend.', name: 'joycewillow_2', avatar: 'J' },
  { stars: 5, text: "Finally an app that respects my time. Key ideas in 15 minutes is exactly what I needed.", name: 'MaxJohnsonNYC', avatar: 'M' },
  { stars: 5, text: "Best subscription I've ever had. The personal recommendations are uncannily good.", name: 'EmilyBrown.3', avatar: 'E' },
]

const TRUSTED_LOGOS = ['Microsoft', 'Walmart', 'Salesforce', 'Amazon.com', 'NVIDIA']

function DiscountBanner({ timer = '9:42', onContinue }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-100 px-4 py-3">
      <span className="text-sm font-medium text-gray-700">
        70% discount reserved for <span className="font-semibold">{timer}</span>
      </span>
      <button
        type="button"
        onClick={onContinue}
        className="flex-shrink-0 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Continue
      </button>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect }) {
  const isSelected = selected?.id === plan.id
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`w-full text-left rounded-2xl border-2 p-4 transition ${
        isSelected ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-5 w-5 flex-shrink-0 rounded-full border-2 ${
              isSelected ? 'border-[#2563eb] bg-[#2563eb]' : 'border-gray-300'
            }`}
          >
            {isSelected && (
              <svg className="h-full w-full p-0.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          <div>
            {plan.mostPopular && (
              <span className="mb-1 inline-block rounded bg-[#2563eb] px-2 py-0.5 text-xs font-semibold text-white">
                MOST POPULAR
              </span>
            )}
            {plan.badge === 'BEST OFFER' && !plan.mostPopular && (
              <span className="mb-1 inline-block rounded bg-[#7c3aed] px-2 py-0.5 text-xs font-semibold text-white">
                BEST OFFER
              </span>
            )}
            <span className="block font-semibold text-gray-900">{plan.label}</span>
          </div>
        </div>
        <span className="flex-shrink-0 rounded bg-[#2563eb]/10 px-2 py-0.5 text-xs font-semibold text-[#2563eb]">
          {plan.badge}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-sm text-gray-500 line-through">${plan.originalPrice.toFixed(2)}</span>
        <span className="text-sm font-semibold text-gray-700">${plan.discountedPrice.toFixed(2)}</span>
        <span className="text-lg font-bold text-gray-900">${plan.perDay.toFixed(2)} per day</span>
      </div>
    </button>
  )
}

function PricingBlock({ selectedPlan, onSelectPlan, onContinue, timer = '9:42', title = 'Choose your plan', showBanner = true }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      {showBanner && (
        <div className="mb-4 rounded-lg bg-[#f3e8ff] px-4 py-2 text-sm font-medium text-gray-700">
          % Discount Reserved for {timer}
        </div>
      )}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {BITESIZE_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan}
            onSelect={onSelectPlan}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full rounded-xl bg-[#2563eb] py-4 text-base font-semibold text-white hover:bg-[#1d4ed8]"
      >
        CONTINUE
      </button>
      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        We&apos;ve applied a discount to your first subscription. Your plan will renew at the full price of $22.43 at the current term. You can manage your subscription in your account. By continuing, you agree to our{' '}
        <Link href="#" className="text-[#2563eb] underline">Terms</Link>
        <span> &amp; </span>
        <Link href="#" className="text-[#2563eb] underline">Privacy Policy</Link>
        <span> and </span>
        <Link href="#" className="text-[#2563eb] underline">Refund Policy</Link>
        <span>. Personal account</span>
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">Pay safe &amp; secure</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-400">
        <span className="text-xs">Visa</span>
        <span className="text-xs">Mastercard</span>
        <span className="text-xs">American Express</span>
        <span className="text-xs">Apple Pay</span>
        <span className="text-xs">PayPal</span>
        <span className="text-xs">Google Pay</span>
      </div>
    </section>
  )
}

const BITESIZE_CHECKOUT_FRAME_ID = 'bitesize-checkout-frame'
const DEFAULT_CHECKOUT_FRAME_HEIGHT = 420
const MIN_CHECKOUT_FRAME_HEIGHT = 360

export default function BitesizePricingPage() {
  const [selectedPlan, setSelectedPlan] = useState(BITESIZE_PLANS[1]) // 3 month default
  const [timer, setTimer] = useState('9:42')
  const [paddle, setPaddle] = useState(null)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [receivedCheckoutSizePing, setReceivedCheckoutSizePing] = useState(false)
  const checkoutOpenedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    const t = setInterval(() => {
      setTimer((prev) => {
        const [m, s] = prev.split(':').map(Number)
        if (s > 0) return `${m}:${String(s - 1).padStart(2, '0')}`
        if (m > 0) return `${m - 1}:59`
        return '0:00'
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const closeCheckoutModalRef = useRef(null)

  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: 'test_37a3ae9038ae86dd31608afd2b9',
      eventCallback: async (event) => {
        console.log('Paddle event', event)
        if (event?.name === 'ping.size') {
          const reportedHeight = [
            event?.data?.height,
            event?.data?.frame_height,
            event?.data?.size?.height,
            event?.height,
          ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0)

          if (reportedHeight) {
            const viewportCap = typeof window !== 'undefined'
              ? Math.max(MIN_CHECKOUT_FRAME_HEIGHT, window.innerHeight - 220)
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

        if (event.name === 'checkout.completed' && event.data?.transaction_id) {
          closeCheckoutModalRef.current?.()
          const transactionId = event.data.transaction_id
          router.push(`/bitesize/upsell?transaction_id=${encodeURIComponent(transactionId)}`)
        }
      },
    }).then((p) => p && setPaddle(p)).catch(console.error)
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
        frameTarget: BITESIZE_CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%',
        frameInitialHeight: String(DEFAULT_CHECKOUT_FRAME_HEIGHT),
      },
      items: [{ priceId: selectedPlan.priceId, quantity: 1 }],
      customer: {
        email: 'chafik@paddle.com',
        address: {
          countryCode: 'GB',
          postalCode: 'E8 2HL',
        },
      },
    })
  }

  const handleContinue = () => {
    if (!paddle?.Initialized) {
      console.warn('Paddle not ready.')
      return
    }
    setCheckoutModalOpen(true)
    setTimeout(openCheckout, 100)
  }

  const closeCheckoutModal = () => {
    checkoutOpenedRef.current = false
    setCheckoutFrameHeight(null)
    setReceivedCheckoutSizePing(false)
    setCheckoutModalOpen(false)
    if (paddle?.Checkout?.close) paddle.Checkout.close()
  }
  closeCheckoutModalRef.current = closeCheckoutModal

  const scrollToPlans = () => {
    document.getElementById('choose-plan')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-4">
          <span className="text-xl font-bold text-gray-900">Bitesize</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16">
        <div className="pt-4">
          <DiscountBanner timer={timer} onContinue={scrollToPlans} />
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#dbeafe] p-6">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#f97316] text-2xl font-bold text-white shadow">
                70%
              </div>
              <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
                Unlock your personal plan with a 70% discount
              </h1>
            </div>
            <div className="h-24 w-24 flex-shrink-0 rounded-full bg-[#93c5fd]/60 blur-2xl sm:h-32 sm:w-32" aria-hidden />
          </div>
        </div>

        <div id="choose-plan" className="mt-8">
          <PricingBlock
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onContinue={handleContinue}
            timer={timer}
            title="Choose your plan"
            showBanner={false}
          />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Understand key ideas in 15 minutes</h2>
          <div className="mt-6 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex-shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-center text-lg font-bold text-gray-900">
            <span className="text-2xl">15+ million</span>
            <br />
            users have started improving their lives with us.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-amber-400">★★★★★</span>
            <span className="font-semibold text-gray-700">4.9</span>
            <span className="text-sm text-gray-500">out of 5</span>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-sm text-gray-500">
            <span>App Store</span>
            <span>Google Play</span>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            Become a member of our global community of 10 million people.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Customer reviews</h2>
          <div className="mt-4 space-y-4">
            {REVIEWS.map((r) => (
              <div key={r.name} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-amber-400">★★★★★</div>
                <p className="mt-2 text-sm text-gray-700">{r.text}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                    {r.avatar}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{r.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 text-center">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Also trusted by <span className="text-gray-900">+1,500 companies</span>
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-400">
            {TRUSTED_LOGOS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <PricingBlock
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onContinue={handleContinue}
            timer={timer}
            title="Choose a plan"
            showBanner
          />
        </div>
      </main>

      <div
        className={checkoutModalOpen ? 'fixed inset-0 z-40' : 'hidden'}
        role="dialog"
        aria-modal="true"
        aria-hidden={!checkoutModalOpen}
      >
        <div
          className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm"
          aria-hidden
          onClick={closeCheckoutModal}
        />
        <div
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl"
          aria-labelledby="checkout-modal-title"
        >
          <div className="relative px-5 pb-3 pt-4">
            <h2 id="checkout-modal-title" className="text-center text-3xl font-semibold text-black">
              Payment
            </h2>
            <button
              type="button"
              onClick={closeCheckoutModal}
              className="absolute right-4 top-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-[#2563eb] bg-white text-[#2563eb] hover:bg-[#eff6ff]"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="px-5 pb-4 text-center text-[18px] font-black leading-[1.2] text-black sm:text-[20px]">
            <span className="block">
              <span className="text-[#1566ff]">%91</span> of users
            </span>
            <span className="block">stay with us after the first</span>
            <span className="block">30 days of subscription</span>
          </p>
          <div className="overflow-hidden rounded-b-2xl px-4 pb-4">
            <div
              id={BITESIZE_CHECKOUT_FRAME_ID}
              className={`${BITESIZE_CHECKOUT_FRAME_ID} checkout-frame w-full rounded-xl ${checkoutModalOpen ? 'bg-transparent' : 'hidden'}`}
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
