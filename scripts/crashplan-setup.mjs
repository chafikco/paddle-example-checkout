// Creates the CrashPlan demo catalog in the Paddle sandbox and prints the
// catalog JSON used by utils/crashplanCatalog.js.
// Usage: PADDLE_SANDBOX_API_KEY=... node scripts/crashplan-setup.mjs

const API = 'https://sandbox-api.paddle.com'
const KEY = process.env.PADDLE_SANDBOX_API_KEY || '01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941'

const PRODUCTS = [
  { key: 'endpoints', name: 'CrashPlan Endpoints', description: 'Laptops and desktops, per user', annual: 8800, twoYear: 15840, min: 1 },
  { key: 'm365', name: 'CrashPlan Microsoft 365', description: 'Exchange, SharePoint, OneDrive, per user. Includes 50 GB pooled storage per user', annual: 3000, twoYear: 5400, min: 5 },
  { key: 'gworkspace', name: 'CrashPlan Google Workspace', description: 'Gmail and Drive, per user', annual: 3000, twoYear: 5400, min: 1 },
  { key: 'servers', name: 'CrashPlan Servers', description: 'Windows and Linux, per server', annual: 18900, twoYear: 34020, min: 1 },
  { key: 'storage', name: 'CrashPlan Storage', description: 'Additional pooled storage, per 1 TB', annual: 12000, twoYear: 21600, min: 1 },
]

const CYCLES = {
  annual: { interval: 'year', frequency: 1 },
  twoYear: { interval: 'year', frequency: 2 },
}

const VARIANTS = {
  card: { interval: 'day', frequency: 14, requires_payment_method: true },
  cardless: { interval: 'day', frequency: 14, requires_payment_method: false },
  none: null,
}

async function call(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path}: ${JSON.stringify(json.error)}`)
  return json.data
}

const catalog = {}
for (const p of PRODUCTS) {
  const product = await call('/products', {
    name: p.name,
    description: p.description,
    tax_category: 'standard',
    custom_data: { demo: 'crashplan', key: p.key },
  })
  catalog[p.key] = { productId: product.id, prices: {} }
  for (const [cycleKey, cycle] of Object.entries(CYCLES)) {
    catalog[p.key].prices[cycleKey] = {}
    for (const [variant, trial] of Object.entries(VARIANTS)) {
      const price = await call('/prices', {
        product_id: product.id,
        description: `${p.name} – ${cycleKey === 'annual' ? 'Annual' : '2 years'} (${variant === 'none' ? 'no trial' : `14-day ${variant} trial`})`,
        name: cycleKey === 'annual' ? 'Annual' : '2 years',
        unit_price: { amount: String(cycleKey === 'annual' ? p.annual : p.twoYear), currency_code: 'USD' },
        billing_cycle: cycle,
        trial_period: trial,
        quantity: { minimum: p.min, maximum: 1000 },
        custom_data: { demo: 'crashplan', key: p.key, cycle: cycleKey, variant },
      })
      catalog[p.key].prices[cycleKey][variant] = price.id
    }
  }
}

console.log(JSON.stringify(catalog, null, 2))
