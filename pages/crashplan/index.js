import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { initializePaddle } from '@paddle/paddle-js'
import { PRODUCTS, PRODUCT_BY_KEY, CYCLES, priceFor, formatUsd, PADDLE_SANDBOX_CLIENT_TOKEN } from '../../utils/crashplanCatalog'
import { ApiLog, ClockIcon, DemoBar, FlowMap, Header, NoCardIcon, ProductIcon, Stepper, postJson } from '../../components/crashplan/ui'

const CHECKOUT_FRAME = 'crashplan-checkout'
const MAIN_PRODUCTS = PRODUCTS.filter((p) => !p.addOn)
const POSTAL_REQUIRED = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'IN']
const COUNTRIES = [
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'], ['DE', 'Germany'],
  ['FR', 'France'], ['NL', 'Netherlands'], ['ES', 'Spain'], ['IT', 'Italy'], ['IE', 'Ireland'], ['IN', 'India'],
  ['AE', 'United Arab Emirates'], ['SG', 'Singapore'], ['JP', 'Japan'], ['BR', 'Brazil'],
]

const INITIAL_SELECTION = {
  endpoints: { on: true, qty: 10 },
  m365: { on: true, qty: 10 },
  gworkspace: { on: false, qty: 10 },
  servers: { on: false, qty: 1 },
  storage: { on: false, qty: 1 },
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function perMonth(product, cycle) {
  return product.amounts[cycle] / CYCLES[cycle].months
}

function priceLine(product, cycle) {
  const c = CYCLES[cycle]
  return `${formatUsd(perMonth(product, cycle))} per ${product.unit}/month, ${c.billed} (${formatUsd(product.amounts[cycle])}/${c.short})`
}

function unitLabel(product, qty) {
  if (product.unit === 'TB') return `${qty} TB`
  return `${qty} ${product.unit}${qty === 1 ? '' : 's'}`
}

export default function CrashPlanSignup() {
  const router = useRouter()
  const test = router.query.test === 'b' ? 'B' : 'A'

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [cycle, setCycle] = useState('annual')
  const [selection, setSelection] = useState(INITIAL_SELECTION)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('US')
  const [postal, setPostal] = useState('')
  const [paddle, setPaddle] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [log, setLog] = useState([])
  const [showFlow, setShowFlow] = useState(true)
  const checkoutOpenRef = useRef(false)
  const paymentRef = useRef(null)
  const formStateRef = useRef({})

  formStateRef.current = { name, company }

  const addLog = (label, calls, err) => setLog((l) => [{ label, calls: calls || [], error: err }, ...l])

  const lines = useMemo(
    () =>
      PRODUCTS.filter((p) => selection[p.key].on).map((p) => ({
        product: p,
        qty: Math.max(p.min, selection[p.key].qty),
        monthly: perMonth(p, cycle) * Math.max(p.min, selection[p.key].qty),
      })),
    [selection, cycle],
  )
  const monthlyTotal = lines.reduce((s, l) => s + l.monthly, 0)
  const cycleTotal = lines.reduce((s, l) => s + l.product.amounts[cycle] * l.qty, 0)
  const checkoutItems = useMemo(
    () => lines.map((l) => ({ priceId: priceFor(l.product.key, cycle, 'card'), quantity: l.qty })),
    [lines, cycle],
  )

  // Paddle.js: Test A checkout + IP country detection for Test B.
  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: PADDLE_SANDBOX_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event?.name === 'checkout.completed') onCheckoutCompleted(event.data?.transaction_id)
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!paddle?.Initialized) return
    paddle
      .PricePreview({ items: [{ priceId: PRODUCTS[0].prices.annual.card, quantity: 1 }] })
      .then((r) => {
        const detected = r?.data?.address?.countryCode
        if (detected && COUNTRIES.some(([code]) => code === detected)) setCountry(detected)
      })
      .catch(() => {})
  }, [paddle])

  const onCheckoutCompleted = async (transactionId) => {
    if (!transactionId) return
    setSubmitting(true)
    try {
      const res = await postJson('/api/crashplan/fromTransaction', { transactionId })
      addLog('Checkout completed → resolve subscription', res.calls)
      router.push(`/crashplan/account?customer=${res.customerId}&welcome=1`)
    } catch (e) {
      addLog('Resolve subscription', e.calls, e.message)
      setError(e.message)
      setSubmitting(false)
    }
  }

  // Test A: Paddle owns the payment step. Open once, then keep items in sync.
  const checkoutReady = test === 'A' && step === 'form' && paddle?.Initialized && isEmail(email) && checkoutItems.length > 0
  useEffect(() => {
    if (!paddle?.Initialized) return
    if (!checkoutReady) {
      if (checkoutOpenRef.current) {
        paddle.Checkout.close()
        checkoutOpenRef.current = false
      }
      return
    }
    if (checkoutOpenRef.current) {
      paddle.Checkout.updateCheckout({ items: checkoutItems })
      return
    }
    const t = setTimeout(() => {
      checkoutOpenRef.current = true
      paddle.Checkout.open({
        settings: {
          displayMode: 'inline',
          variant: 'one-page',
          theme: 'light',
          frameTarget: CHECKOUT_FRAME,
          frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
          frameInitialHeight: '450',
          showAddDiscounts: false,
          allowLogout: false,
        },
        items: checkoutItems,
        customer: { email },
        customData: { demo: 'crashplan', role: 'core', name: formStateRef.current.name, company: formStateRef.current.company },
      })
    }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutReady, checkoutItems])

  useEffect(() => {
    return () => {
      if (checkoutOpenRef.current) paddle?.Checkout?.close()
    }
  }, [paddle])

  const setTest = (t) => {
    if (checkoutOpenRef.current) {
      paddle?.Checkout.close()
      checkoutOpenRef.current = false
    }
    router.replace({ query: { ...router.query, test: t === 'B' ? 'b' : 'a' } }, undefined, { shallow: true })
  }

  const toggleProduct = (key) => setSelection((s) => ({ ...s, [key]: { ...s[key], on: !s[key].on } }))
  const setQty = (key, qty) => setSelection((s) => ({ ...s, [key]: { ...s[key], qty } }))

  const continueWithEmail = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) return
    setChecking(true)
    setError(null)
    try {
      const res = await postJson('/api/crashplan/lookup', { email })
      addLog('Email gate → customer lookup', res.calls)
      const hasSubscription = res.subscriptions.some((s) => s.role === 'core')
      if (res.customer && hasSubscription) {
        router.push(`/crashplan/account?customer=${res.customer.id}&returning=1`)
        return
      }
      setStep('form')
    } catch (err) {
      addLog('Email gate → customer lookup', err.calls, err.message)
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const postalRequired = POSTAL_REQUIRED.includes(country)
  const canStartCardless = lines.length > 0 && isEmail(email) && name.trim() && (!postalRequired || postal.trim())

  const startTrial = async () => {
    if (test === 'A') {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!canStartCardless) {
      setError(lines.length ? 'Add your name, email and location to start the trial.' : 'Choose at least one product.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await postJson('/api/crashplan/signupCardless', {
        email,
        name,
        company,
        countryCode: country,
        postalCode: postal,
        cycle,
        items: lines.map((l) => ({ key: l.product.key, quantity: l.qty })),
      })
      addLog('Test B → cardless trial for all selected products', res.calls)
      router.push(`/crashplan/account?customer=${res.customerId}&welcome=1`)
    } catch (err) {
      addLog('Test B → cardless trial', err.calls, err.message)
      setError(err.message)
      setSubmitting(false)
    }
  }

  const headerRight =
    test === 'A' ? (
      <><ClockIcon /> 14-day free trial</>
    ) : (
      <><ClockIcon /> 14-day free trial, no credit card required</>
    )

  return (
    <>
      <Head>
        <title>CrashPlan · Start your free trial</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen bg-[#eef2f6] text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
        <DemoBar>
          <div className="flex overflow-hidden rounded-md border border-slate-700">
            {['A', 'B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTest(t)}
                className={`px-2.5 py-1 ${test === t ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Test {t}: {t === 'A' ? 'with credit card' : 'without credit card'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowFlow((v) => !v)} className="text-slate-300 hover:text-white">
            {showFlow ? 'Hide' : 'Show'} flow map
          </button>
          <span className="ml-auto text-slate-400">
            Returning-customer demo: enter an email that already has a trial.
          </span>
        </DemoBar>

        <div className="mx-auto max-w-6xl px-4 py-6">
          {showFlow && (
            <div className="mb-6">
              <FlowMap active={step === 'email' ? 'email' : test} />
            </div>
          )}

          <div className="mx-auto max-w-[920px] rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200/70">
            <Header right={headerRight} />

            {step === 'email' ? (
              <form onSubmit={continueWithEmail} className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8">
                <h1 className="text-xl font-semibold tracking-tight">Start your 14-day free trial</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Back up endpoints, Microsoft 365, Google Workspace and servers on one plan, with one bill.
                </p>
                <label className="mt-6 block text-xs font-medium text-slate-600">Work email</label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={!isEmail(email) || checking}
                  className="mt-4 h-11 w-full rounded-md bg-black text-sm font-semibold text-white disabled:opacity-40"
                >
                  {checking ? 'Checking…' : 'Continue'}
                </button>
                <p className="mt-3 text-[11px] text-slate-400">
                  Existing customers go straight to their console to try more products.
                </p>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
                {/* Left: CrashPlan-owned form */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <SectionTitle>1. Choose your products</SectionTitle>
                  <div className="space-y-2.5">
                    {MAIN_PRODUCTS.map((p) => {
                      const s = selection[p.key]
                      const Icon = ProductIcon[p.key]
                      return (
                        <div
                          key={p.key}
                          className={`rounded-lg border p-3 transition ${s.on ? 'border-[#b8cdea] bg-[#eaf1fb]' : 'border-slate-200 bg-white'}`}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={s.on}
                              onChange={() => toggleProduct(p.key)}
                              className="mt-2.5 h-4 w-4 accent-blue-600"
                            />
                            <span className="mt-2 text-slate-700"><Icon /></span>
                            <span>
                              <span className="block text-sm font-semibold">{p.name}</span>
                              <span className="block text-xs text-slate-600">{p.description}</span>
                              <span className="block text-xs text-slate-600">{priceLine(p, cycle)}</span>
                            </span>
                          </label>
                          {s.on && (
                            <div className="mt-3">
                              <div className="mb-1.5 text-xs text-slate-600">
                                Number of {p.unit === 'server' ? 'servers' : 'users'}
                              </div>
                              <div className="flex flex-wrap items-start gap-3">
                                <div>
                                  <Stepper value={Math.max(p.min, s.qty)} min={p.min} onChange={(v) => setQty(p.key, v)} />
                                  {p.min > 1 && <div className="mt-1.5 text-[11px] text-slate-500">Minimum {p.min} users</div>}
                                </div>
                                {p.key === 'm365' && !selection.storage.on && (
                                  <button
                                    type="button"
                                    onClick={() => toggleProduct('storage')}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-left text-sm text-slate-700 hover:border-slate-300"
                                  >
                                    + Need more
                                    <br />
                                    storage?
                                  </button>
                                )}
                              </div>
                              {p.key === 'm365' && selection.storage.on && (
                                <StorageRow
                                  cycle={cycle}
                                  qty={selection.storage.qty}
                                  onQty={(v) => setQty('storage', v)}
                                  onRemove={() => toggleProduct('storage')}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {selection.storage.on && !selection.m365.on && (
                      <div className="rounded-lg border border-[#b8cdea] bg-[#eaf1fb] p-3">
                        <StorageRow
                          cycle={cycle}
                          qty={selection.storage.qty}
                          onQty={(v) => setQty('storage', v)}
                          onRemove={() => toggleProduct('storage')}
                        />
                      </div>
                    )}
                  </div>

                  <SectionTitle className="mt-5">2. About you</SectionTitle>
                  <div className="grid grid-cols-3 gap-2">
                    {['Google', 'Microsoft', 'Apple'].map((sso) => (
                      <button
                        key={sso}
                        type="button"
                        title="SSO is handled by CrashPlan's identity provider (not part of this demo)"
                        className="h-10 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300"
                      >
                        {sso}
                      </button>
                    ))}
                  </div>
                  <div className="my-3 flex items-center gap-3 text-xs text-slate-500">
                    <div className="h-px flex-1 bg-slate-200" />
                    or use your email
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={name} onChange={setName} placeholder="Full name" />
                    <Input value={email} onChange={setEmail} placeholder="name@company.com" type="email" />
                  </div>
                  <Input className="mt-2" value={company} onChange={setCompany} placeholder="Company name" />
                  {test === 'B' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none"
                      >
                        {COUNTRIES.map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                      <Input value={postal} onChange={setPostal} placeholder={postalRequired ? 'Postal code' : 'Postal code (optional)'} />
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-600">
                    Use a work account so teammates can join the same organization.
                  </p>

                  {test === 'A' && (
                    <div ref={paymentRef}>
                      <SectionTitle className="mt-5">3. Payment</SectionTitle>
                      {checkoutReady ? (
                        <div className={`${CHECKOUT_FRAME} w-full`} />
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                          {checkoutItems.length ? 'Enter a valid email to load the payment form.' : 'Choose at least one product.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: order summary */}
                <div>
                  <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-xs text-slate-600">Order summary</div>
                    <div className="relative grid grid-cols-2 rounded-lg border border-slate-200">
                      {Object.values(CYCLES).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setCycle(c.key)}
                          className={`h-10 rounded-lg text-sm font-medium transition ${cycle === c.key ? 'bg-white shadow-[inset_0_0_0_1.5px_#0f172a]' : 'text-slate-600'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                      <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Save more
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {lines.map((l) => (
                        <div key={l.product.key} className="flex items-end justify-between text-sm">
                          <div>
                            <div className="font-semibold">{l.product.name}</div>
                            <div className="text-xs text-slate-600">{unitLabel(l.product, l.qty)}</div>
                          </div>
                          <div className="text-xs text-slate-700">{formatUsd(l.monthly)}</div>
                        </div>
                      ))}
                      {!lines.length && <div className="text-xs text-slate-400">No products selected</div>}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Due today</span>
                        <span>$0.00</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {test === 'A' ? 'After 14 days: ' : 'Pricing after your trial: '}
                        {formatUsd(monthlyTotal)} per month, {CYCLES[cycle].billed} ({formatUsd(cycleTotal)}/{CYCLES[cycle].short})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={startTrial}
                      disabled={submitting || !lines.length}
                      className="mt-4 h-11 w-full rounded-md bg-black text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {submitting ? 'Starting trial…' : 'Start free trial'}
                    </button>
                    {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

                    {test === 'A' ? (
                      <p className="mt-4 text-xs text-slate-600">
                        Change quantities anytime. Add or remove products later without re-entering your card.
                      </p>
                    ) : (
                      <>
                        <p className="mt-4 flex gap-2 text-xs text-slate-600">
                          <span className="mt-0.5 shrink-0"><NoCardIcon /></span>
                          No credit card needed. We&apos;ll remind you before your trial ends, and you can add payment in
                          your console to keep going.
                        </p>
                        <p className="mt-2 text-xs text-slate-600">Add or remove products anytime from your console.</p>
                      </>
                    )}
                  </div>
                  {test === 'A' && (
                    <p className="mt-2 px-1 text-[11px] text-slate-500">
                      Demo: the card form and its &ldquo;Start trial&rdquo; button are Paddle Checkout. Sandbox card 4242 4242
                      4242 4242, any future date, CVC 100.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-[920px]">
            <ApiLog entries={log} onClear={() => setLog([])} />
          </div>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children, className = '' }) {
  return <div className={`mb-2.5 text-xs text-slate-700 ${className}`}>{children}</div>
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none ${className}`}
    />
  )
}

function StorageRow({ cycle, qty, onQty, onRemove }) {
  const storage = PRODUCT_BY_KEY.storage
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <span className="mt-0.5 text-slate-700"><ProductIcon.storage /></span>
          <div>
            <div className="text-sm font-semibold">Additional storage</div>
            <div className="text-xs text-slate-600">{priceLine(storage, cycle)}</div>
          </div>
        </div>
        <button type="button" onClick={onRemove} className="text-xs text-slate-500 hover:text-slate-800">
          Remove
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Stepper value={qty} min={1} onChange={onQty} />
        <span className="text-xs text-slate-600">TB</span>
      </div>
    </div>
  )
}
