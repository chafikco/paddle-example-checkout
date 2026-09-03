const PADDLE_API_KEY = '01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941'
const PADDLE_API_BASE = 'https://sandbox-api.paddle.com'
const DEFAULT_PRICE_ID = 'pri_01khnybwbv3bpdhexah0hv5nd8' // first upsell: book infographics

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }
  const { subscription_id: subscriptionId, price_id: priceId } = body || {}
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return res.status(400).json({ error: 'subscription_id required' })
  }
  const targetPriceId = (typeof priceId === 'string' && priceId) ? priceId : DEFAULT_PRICE_ID

  const patchRes = await fetch(
    `${PADDLE_API_BASE}/subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${PADDLE_API_KEY}`,
      },
      body: JSON.stringify({
        items: [{ price_id: targetPriceId, quantity: 1 }],
        proration_billing_mode: 'prorated_immediately',
      }),
    }
  )

  const patchData = await patchRes.json()
  if (!patchRes.ok) {
    const raw = patchData?.error?.detail
    const message = Array.isArray(raw)
      ? raw.map((d) => (typeof d === 'string' ? d : d?.detail ?? JSON.stringify(d))).join(', ')
      : typeof raw === 'string'
        ? raw
        : patchData?.error?.message ?? 'Update failed'
    return res.status(patchRes.status).json({ error: message })
  }

  return res.status(200).json(patchData)
}
