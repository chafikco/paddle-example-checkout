import { useCallback, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { initializePaddle } from '@paddle/paddle-js'
import { PRODUCTS, PRODUCT_BY_KEY, CYCLES, formatUsd, PADDLE_SANDBOX_CLIENT_TOKEN } from '../../utils/crashplanCatalog'
import { ApiLog, DemoBar, FlowMap, Header, ProductIcon, Stepper, postJson } from '../../components/crashplan/ui'

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const daysLeft = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000)) : null)

const STATUS_STYLES = {
  trialing: 'bg-blue-50 text-blue-700 ring-blue-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  past_due: 'bg-rose-50 text-rose-700 ring-rose-200',
  paused: 'bg-slate-100 text-slate-600 ring-slate-200',
}

function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${STATUS_STYLES[status] || STATUS_STYLES.paused}`}>
      {status === 'trialing' ? 'Free trial' : status.replace('_', ' ')}
    </span>
  )
}

function unitText(key, qty) {
  const p = PRODUCT_BY_KEY[key]
  if (!p) return `× ${qty}`
  if (p.unit === 'TB') return `${qty} TB`
  return `${qty} ${p.unit}${qty === 1 ? '' : 's'}`
}

export default function CrashPlanAccount() {
  const router = useRouter()
  const customerId = router.query.customer
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // { title, body, preview, mode, commit }
  const [drafts, setDrafts] = useState({})
  const [addQty, setAddQty] = useState({})
  const [paddle, setPaddle] = useState(null)
  const [error, setError] = useState(null)
  const [showFlow, setShowFlow] = useState(false)
  const refreshRef = useRef(() => {})
  const paddleRef = useRef(null)
  paddleRef.current = paddle

  const addLog = (label, calls, err) => setLog((l) => [{ label, calls: calls || [], error: err }, ...l])

  const refresh = useCallback(async () => {
    if (!customerId) return
    try {
      const res = await postJson('/api/crashplan/account', { customerId })
      setData(res)
      setDrafts({})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [customerId])
  refreshRef.current = refresh

  useEffect(() => {
    refresh()
  }, [refresh])

  // Paddle.js is only needed here to collect a card for a cardless trial.
  useEffect(() => {
    initializePaddle({
      environment: 'sandbox',
      token: PADDLE_SANDBOX_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event?.name === 'checkout.completed') {
          setTimeout(() => {
            paddleRef.current?.Checkout.close()
            refreshRef.current()
          }, 2500)
        }
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
  }, [])

  const core = data?.subscriptions.find((s) => s.role === 'core') || null
  const trials = data?.subscriptions.filter((s) => s.role === 'trial') || []
  const coreKeys = new Set(core?.items.map((i) => i.key) || [])
  const trialKeys = new Set(trials.flatMap((t) => t.items.map((i) => i.key)))
  const trialing = core?.status === 'trialing'
  const coreTrialEnds = core?.items[0]?.trialEndsAt
  const cycle = core?.cycle || 'annual'

  const run = async (label, path, body) => {
    setBusy(true)
    setError(null)
    try {
      const res = await postJson(path, body)
      addLog(label, res.calls)
      return res
    } catch (e) {
      addLog(label, e.calls, e.message)
      setError(e.message)
      throw e
    } finally {
      setBusy(false)
    }
  }

  // Preview a subscription change, then let the user confirm it.
  const reviewUpdate = async ({ title, body, changes, mode = 'prorated_immediately' }) => {
    const res = await run(`Preview: ${title}`, '/api/crashplan/updateItems', {
      subscriptionId: core.id,
      changes,
      mode,
      preview: true,
    }).catch(() => null)
    if (!res) return
    setPending({
      title,
      body,
      preview: res.preview,
      mode: res.mode,
      commit: async () => {
        await run(title, '/api/crashplan/updateItems', { subscriptionId: core.id, changes, mode })
        await refresh()
      },
    })
  }

  const startOptionATrial = (key) => {
    const product = PRODUCT_BY_KEY[key]
    const quantity = Math.max(product.min, addQty[key] || product.min)
    setPending({
      title: `Start a 14-day ${product.name} trial`,
      body: (
        <>
          Creates a <b>separate cardless trial subscription</b> for {unitText(key, quantity)} of {product.name}. Nothing
          is charged and the main subscription is untouched. When the trial ends, CrashPlan cancels it and adds{' '}
          {product.name} to the main subscription so the customer keeps one bill.
        </>
      ),
      preview: { immediateTotal: '0', nextTotal: null, immediateLines: [] },
      mode: 'cardless trial (separate subscription)',
      commit: async () => {
        await run(`Option A → start ${product.name} trial`, '/api/crashplan/startTrial', {
          customerId,
          coreSubscriptionId: core.id,
          key,
          quantity,
        })
        await refresh()
      },
    })
  }

  const reviewConvert = async (trial) => {
    const product = PRODUCT_BY_KEY[trial.trialFor]
    const res = await run(`Preview: convert ${product?.name} trial`, '/api/crashplan/convertTrial', {
      trialSubscriptionId: trial.id,
      preview: true,
    }).catch(() => null)
    if (!res) return
    setPending({
      title: `Trial ends → add ${product?.name} to the main subscription`,
      body: (
        <>
          Cancels the trial subscription and adds {product?.name} to the main subscription. It&apos;s{' '}
          {res.mode === 'do_not_bill' ? 'added to the current trial' : 'prorated to the main renewal date'}, so
          everything renews together on one bill. In production this runs automatically from the trial-end webhook.
        </>
      ),
      preview: res.preview,
      mode: res.mode,
      commit: async () => {
        await run(`Option A → convert ${product?.name} trial`, '/api/crashplan/convertTrial', { trialSubscriptionId: trial.id })
        await refresh()
      },
    })
  }

  const cancelSubscription = async (sub, label) => {
    await run(label, '/api/crashplan/cancel', { subscriptionId: sub.id }).catch(() => null)
    await refresh()
  }

  const activateNow = async () => {
    await run('Demo: end trial now (activate)', '/api/crashplan/activate', { subscriptionId: core.id }).catch(() => null)
    await refresh()
  }

  const addPaymentMethod = async () => {
    const res = await run('Cardless trial → add payment method', '/api/crashplan/paymentMethodTransaction', {
      subscriptionId: core.id,
    }).catch(() => null)
    if (res && paddle) paddle.Checkout.open({ transactionId: res.transactionId, settings: { displayMode: 'overlay', theme: 'light' } })
  }

  const commitPending = async () => {
    const action = pending
    try {
      await action.commit()
      setPending(null)
    } catch (_) {
      // error is shown in the modal via `error`
    }
  }

  const banner = router.query.welcome
    ? 'Your trial has started. Every product below is on one subscription and renews on the same date.'
    : router.query.returning
      ? 'Welcome back! You already have a CrashPlan subscription. Try products you don’t have yet, or add storage, without a second bill.'
      : null

  return (
    <>
      <Head>
        <title>CrashPlan · Console</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen bg-[#eef2f6] text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
        <DemoBar>
          <Link href="/crashplan" className="text-slate-300 hover:text-white">
            Sign-up page
          </Link>
          <button type="button" onClick={() => setShowFlow((v) => !v)} className="text-slate-300 hover:text-white">
            {showFlow ? 'Hide' : 'Show'} flow map
          </button>
          {data?.customer && (
            <span className="ml-auto font-mono text-slate-400">
              {data.customer.email} · {data.customer.id}
            </span>
          )}
        </DemoBar>

        <div className="mx-auto max-w-6xl px-4 py-6">
          {showFlow && (
            <div className="mb-6">
              <FlowMap active="account" />
            </div>
          )}

          <div className="mx-auto max-w-[920px] rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200/70">
            <Header right={<span>Console · Billing</span>} />

            {banner && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{banner}</div>
            )}
            {error && !pending && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</div>
            )}

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">Loading subscription…</div>
            ) : !core ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
                No active CrashPlan subscription for this customer.{' '}
                <Link href="/crashplan" className="text-blue-600 underline">
                  Start a trial
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  {/* Main subscription */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Your plan</span>
                          <StatusPill status={core.status} />
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {CYCLES[cycle].label} ·{' '}
                          {trialing
                            ? `Trial ends ${formatDate(coreTrialEnds)} (${daysLeft(coreTrialEnds)} days left)`
                            : `Renews ${formatDate(core.nextBilledAt)}`}
                          {' · '}
                          {core.collectionMode === 'manual'
                            ? 'Invoiced'
                            : core.variant === 'cardless' && trialing && !core.nextBilledAt
                              ? 'No payment method'
                              : 'Card on file'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">{trialing ? 'First bill' : 'Next bill'}</div>
                        <div className="text-sm font-semibold">
                          {core.nextTotal ? formatUsd(Number(core.nextTotal)) : core.recurringTotal ? formatUsd(Number(core.recurringTotal)) : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 divide-y divide-slate-100">
                      {core.items.map((item) => {
                        const product = PRODUCT_BY_KEY[item.key]
                        const Icon = ProductIcon[item.key] || ProductIcon.storage
                        const draft = drafts[item.key] ?? item.quantity
                        const changed = draft !== item.quantity
                        return (
                          <div key={item.priceId} className="flex flex-wrap items-center gap-3 py-3">
                            <span className="text-slate-700"><Icon /></span>
                            <div className="min-w-[140px] flex-1">
                              <div className="text-sm font-semibold">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {formatUsd(item.unitAmount)} per {product?.unit || 'unit'}/{CYCLES[cycle].short}
                                {item.status === 'trialing' && ` · trial until ${formatDate(item.trialEndsAt)}`}
                              </div>
                            </div>
                            <Stepper
                              value={draft}
                              min={product?.min || 1}
                              disabled={busy}
                              onChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
                            />
                            {changed ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  reviewUpdate({
                                    title: `Change ${item.name} to ${unitText(item.key, draft)}`,
                                    body: trialing
                                      ? 'Quantity changes during the trial use do_not_bill, so the new quantity is what bills when the trial ends.'
                                      : 'Prorated for the rest of the billing period, then billed at the new quantity on renewal.',
                                    changes: [{ key: item.key, quantity: draft }],
                                  })
                                }
                                className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                              >
                                Review
                              </button>
                            ) : (
                              core.items.length > 1 && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    reviewUpdate({
                                      title: `Remove ${item.name}`,
                                      body: trialing
                                        ? 'Removed from the trial. It won’t be billed when the trial ends.'
                                        : 'Removed now; unused time is credited (prorated).',
                                      changes: [{ key: item.key, quantity: 0 }],
                                    })
                                  }
                                  className="px-2 text-xs text-slate-500 hover:text-rose-600 disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {trialing && core.variant === 'cardless' && !core.nextBilledAt && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={addPaymentMethod}
                          className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          Add payment method
                        </button>
                      )}
                      {trialing && (core.variant === 'card' || core.nextBilledAt) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={activateNow}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                          title="Demo shortcut: POST /subscriptions/{id}/activate"
                        >
                          Demo: end trial now →
                        </button>
                      )}
                      {core.managementUrls?.view_subscription && (
                        <a
                          href={core.managementUrls.view_subscription}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
                        >
                          Paddle customer portal ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Option A trials */}
                  {trials.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-semibold">Product trials</div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Separate cardless trial subscriptions (Option A). They merge into your plan when the trial ends.
                      </p>
                      <div className="mt-3 divide-y divide-slate-100">
                        {trials.map((t) => {
                          const item = t.items[0]
                          const Icon = ProductIcon[item?.key] || ProductIcon.storage
                          return (
                            <div key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                              <span className="text-slate-700"><Icon /></span>
                              <div className="min-w-[140px] flex-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  {item?.name} <StatusPill status={t.status} />
                                </div>
                                <div className="text-xs text-slate-500">
                                  {unitText(item?.key, item?.quantity)} · ends {formatDate(item?.trialEndsAt)} (
                                  {daysLeft(item?.trialEndsAt)} days left)
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => reviewConvert(t)}
                                className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                              >
                                Simulate trial end → add to plan
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => cancelSubscription(t, `Cancel ${item?.name} trial`)}
                                className="px-2 text-xs text-slate-500 hover:text-rose-600 disabled:opacity-40"
                              >
                                Cancel trial
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Try / add more products */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">{trialing ? 'Add to your trial' : 'Try more products'}</div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {trialing
                        ? `Added products join your current trial and end on ${formatDate(coreTrialEnds)}.`
                        : 'Every product joins your existing plan and bill.'}
                    </p>

                    <div className="mt-3 space-y-3">
                      {PRODUCTS.filter((p) => !coreKeys.has(p.key)).map((p) => {
                        const Icon = ProductIcon[p.key]
                        const qty = Math.max(p.min, addQty[p.key] || p.min)
                        const inTrial = trialKeys.has(p.key)
                        return (
                          <div key={p.key} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex gap-2">
                              <span className="mt-0.5 text-slate-700"><Icon /></span>
                              <div>
                                <div className="text-sm font-semibold">{p.addOn ? 'Additional storage' : p.name}</div>
                                <div className="text-xs text-slate-500">
                                  {formatUsd(p.amounts[cycle])} per {p.unit}/{CYCLES[cycle].short}
                                </div>
                              </div>
                            </div>
                            {inTrial ? (
                              <div className="mt-2 text-xs text-blue-700">Trial in progress</div>
                            ) : (
                              <>
                                <div className="mt-2 flex items-center gap-2">
                                  <Stepper value={qty} min={p.min} onChange={(v) => setAddQty((a) => ({ ...a, [p.key]: v }))} />
                                  <span className="text-xs text-slate-500">{p.unit === 'TB' ? 'TB' : `${p.unit}s`}</span>
                                </div>
                                <div className="mt-2 flex flex-col gap-1.5">
                                  {trialing ? (
                                    <ActionButton
                                      primary
                                      disabled={busy}
                                      onClick={() =>
                                        reviewUpdate({
                                          title: `Add ${p.name} to your trial`,
                                          body: `Joins the current trial (do_not_bill) and ends with everything else on ${formatDate(coreTrialEnds)}.`,
                                          changes: [{ key: p.key, quantity: qty }],
                                        })
                                      }
                                    >
                                      Add to trial
                                    </ActionButton>
                                  ) : p.addOn ? (
                                    <ActionButton
                                      primary
                                      disabled={busy}
                                      onClick={() =>
                                        reviewUpdate({
                                          title: `Add ${qty} TB of storage`,
                                          body: 'Prorated now so storage renews on the same date as your plan.',
                                          changes: [{ key: p.key, quantity: qty }],
                                        })
                                      }
                                    >
                                      Add storage
                                    </ActionButton>
                                  ) : (
                                    <>
                                      <ActionButton primary disabled={busy} onClick={() => startOptionATrial(p.key)}>
                                        Start 14-day free trial
                                        <Tag>Option A</Tag>
                                      </ActionButton>
                                      <ActionButton
                                        disabled={busy}
                                        onClick={() =>
                                          reviewUpdate({
                                            title: `Add ${p.name}, free until renewal`,
                                            body: `Added with do_not_bill: no charge until ${formatDate(core.nextBilledAt)}, then full price with the rest of your plan.`,
                                            changes: [{ key: p.key, quantity: qty }],
                                            mode: 'do_not_bill',
                                          })
                                        }
                                      >
                                        Free until renewal
                                        <Tag>Option B</Tag>
                                      </ActionButton>
                                      <ActionButton
                                        disabled={busy}
                                        onClick={() =>
                                          reviewUpdate({
                                            title: `Add ${p.name} now`,
                                            body: 'Prorated for the rest of the billing period, then renews with your plan.',
                                            changes: [{ key: p.key, quantity: qty }],
                                          })
                                        }
                                      >
                                        Buy now (prorated)
                                      </ActionButton>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                      {PRODUCTS.every((p) => coreKeys.has(p.key)) && (
                        <div className="text-xs text-slate-500">You have every CrashPlan product.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-[920px]">
            <ApiLog entries={log} onClear={() => setLog([])} />
          </div>
        </div>

        {pending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <div className="text-base font-semibold">{pending.title}</div>
              <p className="mt-2 text-sm text-slate-600">{pending.body}</p>
              <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Charged today</span>
                  <span className="font-semibold">
                    {pending.preview?.immediateTotal ? formatUsd(Number(pending.preview.immediateTotal)) : '$0.00'}
                  </span>
                </div>
                {pending.preview?.immediateLines?.map((l, i) => (
                  <div key={i} className="flex justify-between pl-3 text-xs text-slate-500">
                    <span>
                      {l.name} × {l.quantity}
                      {l.proration && ` (${Math.round(Number(l.proration) * 100)}% of period)`}
                    </span>
                    <span>{formatUsd(Number(l.total))}</span>
                  </div>
                ))}
                {pending.preview?.nextTotal && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      {trialing ? 'Bill when trial ends' : `Next bill${pending.preview.nextBilledAt ? ` (${formatDate(pending.preview.nextBilledAt)})` : ''}`}
                    </span>
                    <span className="font-semibold">{formatUsd(Number(pending.preview.nextTotal))}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 font-mono text-[10px] text-slate-500">
                  {pending.mode.includes(' ') ? pending.mode : `proration_billing_mode: ${pending.mode}`}
                </div>
              </div>
              {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPending(null)
                    setError(null)
                  }}
                  className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={commitPending}
                  className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {busy ? 'Working…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ActionButton({ children, primary, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold disabled:opacity-40 ${
        primary ? 'bg-black text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

function Tag({ children }) {
  return <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-current/20">{children}</span>
}
