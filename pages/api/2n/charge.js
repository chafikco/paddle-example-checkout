// 2N vaulted-card demo backend.
// After a $0 subscription checkout vaults the customer's card, this endpoint
// resolves the subscription from the completed transaction and issues an
// immediate $10 one-time charge using a NON-CATALOGUE product + price via the
// Paddle "one-time charge" API: POST /subscriptions/{id}/charge

const PADDLE_API = 'https://sandbox-api.paddle.com'
const AUTH = 'Bearer 01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941'

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: AUTH,
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getTransaction(id) {
  const r = await fetch(`${PADDLE_API}/transactions/${id}`, { method: 'GET', headers })
  const j = await r.json()
  return j.data
}

async function getSubscription(id) {
  const r = await fetch(`${PADDLE_API}/subscriptions/${id}`, { method: 'GET', headers })
  const j = await r.json()
  return j.data
}

// The charge endpoint returns the SUBSCRIPTION entity, not the billed transaction.
// The actual one-time charge transaction is fetched from /transactions, filtered
// to the subscription and excluding the original $0 vaulting transaction.
async function getChargeTransaction(subscriptionId, excludeTransactionId) {
  const url = `${PADDLE_API}/transactions?subscription_id=${subscriptionId}&order_by=created_at[DESC]&per_page=20`
  const r = await fetch(url, { method: 'GET', headers })
  const j = await r.json()
  const list = Array.isArray(j.data) ? j.data : []
  // Newest transaction that isn't the vaulting ($0) transaction is the $10 charge.
  return list.find((t) => t.id !== excludeTransactionId) || null
}

export default async function handler(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const { transactionId } = body

    if (!transactionId) {
      return res.status(400).json({ error: { detail: 'Missing transactionId' } })
    }

    // 1) The $0 subscription is created asynchronously after the checkout completes.
    //    Poll the transaction until its subscription_id is populated.
    let subscriptionId = null
    for (let i = 0; i < 15; i++) {
      const tx = await getTransaction(transactionId)
      if (tx?.subscription_id) {
        subscriptionId = tx.subscription_id
        break
      }
      await sleep(2000)
    }

    if (!subscriptionId) {
      return res.status(504).json({
        error: { detail: 'Timed out waiting for the subscription to be created from the checkout.' },
      })
    }

    // 2) Wait for the subscription to become active and grab its currency so the
    //    one-time charge currency matches the subscription's collection currency.
    let currency = 'USD'
    let status
    for (let i = 0; i < 8; i++) {
      const sub = await getSubscription(subscriptionId)
      currency = sub?.currency_code || currency
      status = sub?.status
      if (status === 'active') break
      await sleep(2000)
    }

    // 3) Issue the immediate $10 one-time charge with a non-catalogue product + price.
    const chargePayload = {
      effective_from: 'immediately',
      items: [
        {
          quantity: 1,
          price: {
            name: 'One-time charge',
            description: '2N one-time $10 charge (non-catalogue)',
            tax_mode: 'account_setting',
            unit_price: { amount: '1000', currency_code: currency },
            product: {
              name: '2N One-time Charge',
              tax_category: 'standard',
            },
          },
        },
      ],
    }

    const chargeRes = await fetch(`${PADDLE_API}/subscriptions/${subscriptionId}/charge`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chargePayload),
    })
    const charge = await chargeRes.json()

    if (!chargeRes.ok || charge.error) {
      return res.status(chargeRes.status || 400).json({
        subscriptionId,
        subscriptionStatus: status,
        error: charge.error || { detail: 'One-time charge failed' },
      })
    }

    // 4) Resolve the actual transaction created by the one-time charge. It's
    //    created asynchronously, so poll /transactions until it shows up.
    let chargeTransaction = null
    for (let i = 0; i < 8; i++) {
      chargeTransaction = await getChargeTransaction(subscriptionId, transactionId)
      if (chargeTransaction) break
      await sleep(2000)
    }

    return res.status(200).json({
      subscriptionId,
      subscriptionStatus: status,
      currency,
      chargeTransactionId: chargeTransaction?.id || null,
      chargeStatus: chargeTransaction?.status || null,
      charge,
    })
  } catch (err) {
    console.error('2N charge error', err)
    return res.status(500).json({ error: { detail: err.message || 'Unexpected error' } })
  }
}
