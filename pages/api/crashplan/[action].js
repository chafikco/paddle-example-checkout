import { PRODUCTS, lookupPrice, priceFor } from '../../../utils/crashplanCatalog'

const API = 'https://sandbox-api.paddle.com'
const KEY = process.env.PADDLE_SANDBOX_API_KEY || '01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941'

class PaddleError extends Error {
  constructor(message, details) {
    super(message)
    this.details = details
  }
}

// Every Paddle call made while handling a request is recorded so the demo UI
// can show exactly which API calls each use case needs.
function createClient() {
  const calls = []
  async function paddle(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    calls.push({ method, path, body: body || null, status: res.status })
    if (!res.ok) throw new PaddleError(json?.error?.detail || `Paddle ${res.status}`, json?.error)
    return json.data
  }
  return { paddle, calls }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cycleOf(sub) {
  return sub.billing_cycle?.frequency === 2 ? 'twoYear' : 'annual'
}

// A subscription is "cardless" when it was created from cardless-trial prices.
function variantOf(sub) {
  return sub.items.some((i) => lookupPrice(i.price.id)?.variant === 'cardless') ? 'cardless' : 'card'
}

function summarize(sub) {
  const cycle = cycleOf(sub)
  return {
    id: sub.id,
    status: sub.status,
    role: sub.custom_data?.role || 'core',
    trialFor: sub.custom_data?.key || null,
    coreSubscriptionId: sub.custom_data?.core_subscription_id || null,
    cycle,
    variant: variantOf(sub),
    currency: sub.currency_code,
    collectionMode: sub.collection_mode,
    createdAt: sub.created_at,
    nextBilledAt: sub.next_billed_at,
    currentPeriod: sub.current_billing_period,
    scheduledChange: sub.scheduled_change,
    nextTotal: sub.next_transaction?.details?.totals?.grand_total ?? null,
    recurringTotal: sub.recurring_transaction_details?.totals?.grand_total ?? null,
    items: sub.items.map((i) => {
      const info = lookupPrice(i.price.id)
      return {
        key: info?.key || null,
        name: PRODUCTS.find((p) => p.key === info?.key)?.name || i.price.description,
        priceId: i.price.id,
        variant: info?.variant || null,
        quantity: i.quantity,
        status: i.status,
        trialEndsAt: i.trial_dates?.ends_at || null,
        unitAmount: Number(i.price.unit_price.amount),
      }
    }),
    managementUrls: sub.management_urls || null,
  }
}

async function getSubscription(paddle, id) {
  return paddle('GET', `/subscriptions/${id}?include=next_transaction,recurring_transaction_details`)
}

async function findOrCreateCustomer(paddle, { email, name }) {
  const existing = await paddle('GET', `/customers?email=${encodeURIComponent(email)}`)
  if (existing?.length) return existing[0]
  return paddle('POST', '/customers', { email, name: name || undefined })
}

async function waitForSubscription(paddle, transactionId) {
  for (let i = 0; i < 12; i++) {
    const txn = await paddle('GET', `/transactions/${transactionId}`)
    if (txn.subscription_id) return txn.subscription_id
    await sleep(1000)
  }
  throw new PaddleError('Subscription was not created in time')
}

// Starts a cardless trial without Paddle Checkout: a $0 transaction for
// cardless-trial prices, marked as billed, becomes a trialing subscription.
async function createCardlessTrial(paddle, { customerId, addressId, businessId, items, customData }) {
  const txn = await paddle('POST', '/transactions', {
    customer_id: customerId,
    address_id: addressId,
    business_id: businessId || undefined,
    collection_mode: 'automatic',
    items,
    custom_data: customData,
  })
  await paddle('PATCH', `/transactions/${txn.id}`, { status: 'billed' })
  return waitForSubscription(paddle, txn.id)
}

// Maps a desired product list onto price IDs that are valid for the subscription's state:
// trialing subscriptions only accept trial prices of the same variant (they join the
// current trial, `do_not_bill`); active subscriptions take no-trial prices.
function buildItems(sub, desired) {
  const cycle = cycleOf(sub)
  const trialing = sub.status === 'trialing'
  const variant = trialing ? variantOf(sub) : 'none'
  const currentByKey = {}
  for (const i of sub.items) {
    const key = lookupPrice(i.price.id)?.key
    if (key) currentByKey[key] = i
  }
  return desired
    .filter((d) => d.quantity > 0)
    .map((d) => ({
      price_id: currentByKey[d.key]?.price.id || priceFor(d.key, cycle, variant),
      quantity: d.quantity,
    }))
}

function currentDesired(sub) {
  return sub.items
    .map((i) => ({ key: lookupPrice(i.price.id)?.key, quantity: i.quantity }))
    .filter((d) => d.key)
}

function mergeDesired(base, changes) {
  const map = Object.fromEntries(base.map((d) => [d.key, d.quantity]))
  for (const c of changes) map[c.key] = c.quantity
  return Object.entries(map).map(([key, quantity]) => ({ key, quantity }))
}

function summarizePreview(preview) {
  return {
    immediateTotal: preview.immediate_transaction?.details?.totals?.grand_total ?? null,
    immediateLines:
      preview.immediate_transaction?.details?.line_items?.map((l) => ({
        name: PRODUCTS.find((p) => p.key === lookupPrice(l.price_id)?.key)?.name || l.product?.name,
        quantity: l.quantity,
        total: l.totals?.total,
        proration: l.proration?.rate || null,
      })) || [],
    nextTotal: preview.next_transaction?.details?.totals?.grand_total ?? null,
    nextBilledAt: preview.next_billed_at,
    updateSummary: preview.update_summary || null,
  }
}

async function updateSubscription(paddle, sub, desired, requestedMode, preview) {
  const items = buildItems(sub, desired)
  if (!items.length) throw new PaddleError('A subscription needs at least one product')
  const mode = sub.status === 'trialing' ? 'do_not_bill' : requestedMode
  const body = { items, proration_billing_mode: mode }
  if (preview) {
    return { preview: summarizePreview(await paddle('PATCH', `/subscriptions/${sub.id}/preview`, body)), mode }
  }
  await paddle('PATCH', `/subscriptions/${sub.id}`, body)
  return { mode }
}

const handlers = {
  // Email gate: is this a new or an existing CrashPlan customer?
  async lookup({ paddle }, { email }) {
    const customers = await paddle('GET', `/customers?email=${encodeURIComponent(email)}`)
    const customer = customers?.[0]
    if (!customer) return { customer: null, subscriptions: [] }
    const subs = await paddle('GET', `/subscriptions?customer_id=${customer.id}&status=active,trialing,past_due,paused`)
    return { customer: { id: customer.id, email: customer.email, name: customer.name }, subscriptions: subs.map(summarize) }
  },

  async account({ paddle }, { customerId }) {
    const customer = await paddle('GET', `/customers/${customerId}`)
    const list = await paddle('GET', `/subscriptions?customer_id=${customerId}&status=active,trialing,past_due,paused`)
    const subs = await Promise.all(list.map((s) => getSubscription(paddle, s.id)))
    return { customer: { id: customer.id, email: customer.email, name: customer.name }, subscriptions: subs.map(summarize) }
  },

  // Test B: one subscription, every selected product on the same cardless 14-day trial.
  async signupCardless({ paddle }, { email, name, company, countryCode, postalCode, cycle, items }) {
    const customer = await findOrCreateCustomer(paddle, { email, name })
    const address = await paddle('POST', `/customers/${customer.id}/addresses`, {
      country_code: countryCode,
      postal_code: postalCode || undefined,
    })
    const business = company ? await paddle('POST', `/customers/${customer.id}/businesses`, { name: company }) : null
    const subscriptionId = await createCardlessTrial(paddle, {
      customerId: customer.id,
      addressId: address.id,
      businessId: business?.id,
      items: items.map((i) => ({ price_id: priceFor(i.key, cycle, 'cardless'), quantity: i.quantity })),
      customData: { demo: 'crashplan', role: 'core', company: company || null },
    })
    return { customerId: customer.id, subscriptionId }
  },

  // Test A: checkout completed in Paddle.js; resolve the customer + subscription it created.
  async fromTransaction({ paddle }, { transactionId }) {
    const subscriptionId = await waitForSubscription(paddle, transactionId)
    const txn = await paddle('GET', `/transactions/${transactionId}`)
    return { customerId: txn.customer_id, subscriptionId }
  },

  // Use cases 2/4 and adding/removing products: change items on the core subscription.
  async updateItems({ paddle }, { subscriptionId, changes, mode = 'prorated_immediately', preview }) {
    const sub = await paddle('GET', `/subscriptions/${subscriptionId}`)
    return updateSubscription(paddle, sub, mergeDesired(currentDesired(sub), changes), mode, preview)
  },

  // Use case 3, Option A: a separate cardless 14-day trial subscription for the new product.
  async startTrial({ paddle }, { customerId, coreSubscriptionId, key, quantity }) {
    const core = await paddle('GET', `/subscriptions/${coreSubscriptionId}`)
    const subscriptionId = await createCardlessTrial(paddle, {
      customerId,
      addressId: core.address_id,
      businessId: core.business_id,
      items: [{ price_id: priceFor(key, cycleOf(core), 'cardless'), quantity }],
      customData: { demo: 'crashplan', role: 'trial', key, core_subscription_id: coreSubscriptionId },
    })
    return { subscriptionId }
  },

  // Option A, trial end: cancel the trial subscription and add the product to the core
  // subscription (prorated, so it renews with everything else on one bill).
  async convertTrial({ paddle }, { trialSubscriptionId, mode = 'prorated_immediately', preview }) {
    const trial = await paddle('GET', `/subscriptions/${trialSubscriptionId}`)
    const core = await paddle('GET', `/subscriptions/${trial.custom_data.core_subscription_id}`)
    const changes = trial.items.map((i) => ({ key: lookupPrice(i.price.id).key, quantity: i.quantity }))
    const base = currentDesired(core)
    const desired = mergeDesired(
      base,
      changes.map((c) => ({ key: c.key, quantity: (base.find((b) => b.key === c.key)?.quantity || 0) + c.quantity })),
    )
    if (preview) return updateSubscription(paddle, core, desired, mode, true)
    await paddle('POST', `/subscriptions/${trial.id}/cancel`, { effective_from: 'immediately' })
    return updateSubscription(paddle, core, desired, mode, false)
  },

  async cancel({ paddle }, { subscriptionId }) {
    await paddle('POST', `/subscriptions/${subscriptionId}/cancel`, { effective_from: 'immediately' })
    return {}
  },

  // Demo shortcut: end a card trial now so the "active subscription" use cases can be shown.
  async activate({ paddle }, { subscriptionId }) {
    await paddle('POST', `/subscriptions/${subscriptionId}/activate`)
    return {}
  },

  // Cardless trial → customer adds a card from the console (opened with Paddle.js).
  async paymentMethodTransaction({ paddle }, { subscriptionId }) {
    const txn = await paddle('GET', `/subscriptions/${subscriptionId}/update-payment-method-transaction`)
    return { transactionId: txn.id }
  },
}

export default async function handler(req, res) {
  const action = handlers[req.query.action]
  if (!action) return res.status(404).json({ error: 'Unknown action' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const client = createClient()
  try {
    const result = await action(client, req.body || {})
    return res.status(200).json({ ...result, calls: client.calls })
  } catch (e) {
    return res.status(400).json({ error: e.message, details: e.details || null, calls: client.calls })
  }
}
