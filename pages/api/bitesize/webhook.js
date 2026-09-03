import { setSubscriptionForTransaction } from './subscriptionStore'

export const config = {
  api: { bodyParser: true },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const eventType = body?.event_type
    const data = body?.data ?? {}

    if (eventType === 'subscription.created' && data?.transaction_id && data?.id) {
      setSubscriptionForTransaction(data.transaction_id, data.id)
    }
  } catch (e) {
    console.error('Bitesize webhook parse error', e)
  }
  return res.status(200).json({ received: true })
}
