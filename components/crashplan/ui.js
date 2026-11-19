import Link from 'next/link'

export function postJson(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (r) => {
    const json = await r.json()
    if (!r.ok) {
      const err = new Error(json.error || 'Request failed')
      err.calls = json.calls || []
      throw err
    }
    return json
  })
}

const iconProps = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }

export const ProductIcon = {
  endpoints: () => (
    <svg {...iconProps}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>
  ),
  m365: () => (
    <svg {...iconProps}><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18Z" /></svg>
  ),
  gworkspace: () => (
    <svg {...iconProps} strokeWidth={2.2}><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M12 12h8" /></svg>
  ),
  servers: () => (
    <svg {...iconProps}><rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" /><path d="M8 7.5h.01M8 16.5h.01" /></svg>
  ),
  storage: () => (
    <svg {...iconProps}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" /></svg>
  ),
}

export function ClockIcon() {
  return (
    <svg {...iconProps} width={14} height={14}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  )
}

export function NoCardIcon() {
  return (
    <svg {...iconProps} width={15} height={15}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M4 4l16 16" /></svg>
  )
}

export function Stepper({ value, min = 1, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
      >
        -
      </button>
      <input
        type="number"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="h-9 w-20 rounded-md border border-slate-200 bg-white text-center text-sm text-slate-900 [appearance:textfield] focus:border-blue-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

export function Header({ right }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link href="/crashplan" className="text-[15px] font-semibold tracking-tight text-slate-900">
        CrashPlan
      </Link>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">{right}</div>
    </div>
  )
}

// Demo chrome (outside the mock UI): links + context for the SE walkthrough.
export function DemoBar({ children }) {
  return (
    <div className="border-b border-slate-200 bg-slate-900 text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-xs">
        <Link href="/" className="text-slate-400 hover:text-white">
          ← Playground
        </Link>
        <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-semibold text-amber-300">Paddle sandbox demo</span>
        {children}
      </div>
    </div>
  )
}

const METHOD_COLORS = {
  GET: 'text-sky-300',
  POST: 'text-emerald-300',
  PATCH: 'text-amber-300',
}

export function ApiLog({ entries, onClear }) {
  if (!entries.length) return null
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-[11px] text-slate-300">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="font-semibold text-slate-100">Paddle API calls made by CrashPlan&apos;s backend</span>
        {onClear && (
          <button type="button" onClick={onClear} className="text-slate-500 hover:text-slate-200">
            Clear
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-auto px-3 py-2 font-mono">
        {entries.map((entry, i) => (
          <div key={i} className="mb-3">
            <div className={`mb-1 font-sans font-semibold ${entry.error ? 'text-rose-300' : 'text-slate-100'}`}>
              {entry.label}
              {entry.error && <span className="ml-2 font-normal">— {entry.error}</span>}
            </div>
            {entry.calls.map((c, j) => (
              <details key={j} className="ml-2">
                <summary className="cursor-pointer select-none">
                  <span className={METHOD_COLORS[c.method] || ''}>{c.method}</span> {c.path.split('?')[0]}{' '}
                  <span className={c.status >= 400 ? 'text-rose-400' : 'text-slate-500'}>{c.status}</span>
                </summary>
                {c.body && <pre className="ml-4 whitespace-pre-wrap text-slate-400">{JSON.stringify(c.body, null, 2)}</pre>}
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const OWNERS = {
  crashplan: { label: 'CrashPlan UI', dot: 'bg-slate-400', box: 'border-slate-200 bg-white', accent: 'before:bg-slate-300' },
  checkout: { label: 'Paddle Checkout', dot: 'bg-blue-500', box: 'border-blue-200 bg-blue-50/70', accent: 'before:bg-blue-500' },
  api: { label: 'Paddle API (CrashPlan backend)', dot: 'bg-emerald-500', box: 'border-emerald-200 bg-emerald-50/70', accent: 'before:bg-emerald-500' },
  result: { label: 'Outcome', dot: 'bg-violet-500', box: 'border-violet-200 bg-violet-50/70', accent: 'before:bg-violet-500' },
}

function Step({ owner = 'crashplan', title, children, api, active, className = '' }) {
  const o = OWNERS[owner]
  return (
    <div
      className={`relative overflow-hidden rounded-lg border py-2.5 pl-3.5 pr-3 text-[11px] leading-4 text-slate-600 before:absolute before:inset-y-0 before:left-0 before:w-1 ${o.box} ${o.accent} ${
        active ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      } ${className}`}
    >
      <div className="text-xs font-semibold text-slate-900">{title}</div>
      {children && <div className="mt-0.5">{children}</div>}
      {api && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {[].concat(api).map((a) => (
            <code key={a} className="rounded bg-slate-900/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              {a}
            </code>
          ))}
        </div>
      )}
    </div>
  )
}

const Arrow = () => (
  <div className="flex rotate-90 items-center justify-center text-slate-300 md:rotate-0" aria-hidden>
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5h15M12 1l4 4-4 4" />
    </svg>
  </div>
)

function Lane({ label, tone, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 p-2.5">
      <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
        {label}
      </div>
      <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_18px_minmax(0,1.5fr)_18px_minmax(0,0.9fr)]">
        {children}
      </div>
    </div>
  )
}

// End-to-end visualisation of the proposed CrashPlan flow and which party owns each step.
export function FlowMap({ active }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">How the flow works</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          {Object.values(OWNERS).map((o) => (
            <span key={o.label} className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${o.dot}`} />
              {o.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-2 md:grid-cols-[170px_28px_minmax(0,1fr)]">
        {/* Shared entry point, centred across both lanes */}
        <div className="relative flex items-center md:row-span-2">
          <Step title="1. Email" api="GET /customers?email" active={active === 'email'} className="w-full">
            Ask for email only, then route by lifecycle stage.
          </Step>
          <div className="absolute left-full top-1/2 hidden w-[14px] border-t border-slate-300 md:block" aria-hidden />
        </div>

        {/* Branch connectors: each lane gets an elbow from the shared vertical line to its centre */}
        <div className="relative hidden md:block" aria-hidden>
          <div className="absolute -bottom-1 left-[13px] top-1/2 border-l border-slate-300" />
          <div className="absolute left-[13px] right-0 top-1/2 border-t border-slate-300" />
        </div>
        <div className="md:col-start-3">
          <Lane label="New customer" tone="bg-blue-100 text-blue-700">
            <Step title="2. One sign-up form" active={active === 'form'}>
              Products, quantities, storage, Annual / 2 years. Each product is a price on <b>one</b> subscription.
            </Step>
            <Arrow />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Step owner="checkout" title="Test A · with card" active={active === 'A'}>
                Inline checkout with card-trial prices. Card saved, $0 today.
              </Step>
              <Step owner="api" title="Test B · cardless" api={['POST /transactions', 'status: billed']} active={active === 'B'}>
                No checkout. Cardless-trial prices.
              </Step>
            </div>
            <Arrow />
            <Step owner="result" title="1 subscription, 1 bill">
              Every product trials 14 days and renews together.
            </Step>
          </Lane>
        </div>

        <div className="relative hidden md:col-start-2 md:row-start-2 md:block" aria-hidden>
          <div className="absolute -top-1 bottom-1/2 left-[13px] border-l border-slate-300" />
          <div className="absolute left-[13px] right-0 top-1/2 border-t border-slate-300" />
        </div>
        <div className="md:col-start-3 md:row-start-2">
          <Lane label="Existing customer" tone="bg-emerald-100 text-emerald-700">
            <Step title="Console" active={active === 'account'}>
              Shows the current plan and offers products they don&apos;t have yet.
            </Step>
            <Arrow />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Step owner="api" title="Try a product (Option A)" api="cardless trial → cancel + PATCH" active={active === 'optionA'}>
                Separate 14-day trial; merges into the plan at trial end.
              </Step>
              <Step owner="api" title="Free until renewal (Option B)" api="PATCH · do_not_bill">
                Full price from the next renewal.
              </Step>
              <Step owner="api" title="Add storage / products" api="PATCH · prorated_immediately">
                Prorated, same renewal date.
              </Step>
              <Step owner="api" title="Still on trial?" api="PATCH · do_not_bill">
                Joins the current trial, ends the same day.
              </Step>
            </div>
            <Arrow />
            <Step owner="result" title="Still 1 subscription, 1 bill">
              Everything co-terms on the main subscription.
            </Step>
          </Lane>
        </div>
      </div>
    </div>
  )
}

