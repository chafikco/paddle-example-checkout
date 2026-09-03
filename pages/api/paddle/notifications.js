/**
 * Proxies GET /notifications to Paddle Billing API.
 * @see https://developer.paddle.com/api-reference/notifications/list-notifications
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    apiKey,
    environment = 'sandbox',
    after,
    per_page,
    notification_setting_id,
    order_by,
    search,
    status,
    filter,
    to,
    from: fromParam,
  } = req.body || {}

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid apiKey' })
  }

  const base =
    environment === 'live'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com'

  const params = new URLSearchParams()

  if (after) params.set('after', after)
  if (per_page != null && per_page !== '') {
    const n = Number(per_page)
    if (!Number.isNaN(n)) params.set('per_page', String(Math.min(200, Math.max(1, n))))
  }
  if (notification_setting_id) {
    const v = Array.isArray(notification_setting_id)
      ? notification_setting_id.join(',')
      : String(notification_setting_id)
    if (v.trim()) params.set('notification_setting_id', v.trim())
  }
  if (order_by) params.set('order_by', order_by)
  if (search) params.set('search', String(search).trim())
  if (status) {
    const v = Array.isArray(status) ? status.join(',') : String(status)
    if (v.trim()) params.set('status', v.trim())
  }
  if (filter) params.set('filter', String(filter).trim())
  if (to) params.set('to', to)
  if (fromParam) params.set('from', fromParam)

  const url = `${base}/notifications${params.toString() ? `?${params}` : ''}`

  try {
    const paddleRes = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    })

    const data = await paddleRes.json().catch(() => ({}))

    if (!paddleRes.ok) {
      const err = data?.error
      const detail = err?.detail
      let message
      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail.map((d) => (typeof d === 'string' ? d : d?.message)).filter(Boolean).join('; ')
      } else {
        message = err?.message
      }
      return res.status(paddleRes.status).json({
        error: message || paddleRes.statusText,
        code: err?.code,
        paddle: data,
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('notifications proxy', err)
    return res.status(502).json({
      error: err?.message || 'Failed to reach Paddle API',
    })
  }
}
