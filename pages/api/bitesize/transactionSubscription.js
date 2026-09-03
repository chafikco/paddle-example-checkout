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
  if (!subscriptionId) {
    return res.status(404).json({ error: 'No subscription for this transaction' })
  }

  return res.status(200).json({ subscription_id: subscriptionId })
}
