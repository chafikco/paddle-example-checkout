import { getSubscriptionForTransaction } from './subscriptionStore'

const PADDLE_API_KEY = '01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941'
const PADDLE_API_BASE = 'https://sandbox-api.paddle.com'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { transaction_id: transactionId } = req.query
  if (!transactionId) {
    return res.status(400).json({ error: 'transaction_id required' })
  }

  // 1) Prefer subscription_id from webhook store (subscription.created)
  const fromStore = getSubscriptionForTransaction(transactionId)
  if (fromStore) {
    return res.status(200).json({ subscription_id: fromStore })
  }

  // 2) Fallback: get transaction from Paddle (may have subscription_id once provisioned)
  const response = await fetch(
    `${PADDLE_API_BASE}/transactions/${transactionId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${PADDLE_API_KEY}`,
      },
    }
  )
  const data = await response.json()
  if (!response.ok) {
    return res.status(response.status).json(data)
  }
  const subscriptionId = data?.data?.subscription_id ?? null
  if (subscriptionId) {
    return res.status(200).json({ subscription_id: subscriptionId })
  }

  // Return 200 with no subscription_id so client keeps polling (404 was mistaken for missing route)
  return res.status(200).json({ subscription_id: null })
}
