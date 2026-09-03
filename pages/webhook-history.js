import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

/** Paddle returns `meta.pagination.next` as a URL; `after` is the cursor query param. */
function afterCursorFromPagination(pagination) {
  const next = pagination?.next
  if (!next || typeof next !== 'string') return null
  try {
    const url = next.startsWith('http') ? new URL(next) : new URL(next, 'https://api.paddle.com')
    return url.searchParams.get('after')
  } catch {
    return null
  }
}

function toRfc3339(localDatetime) {
  if (!localDatetime) return undefined
  const d = new Date(localDatetime)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function getRequestErrorMessage(json, httpStatus) {
  if (json?.error && typeof json.error === 'string') return json.error
  const err = json?.paddle?.error ?? json?.error
  const detail = err?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.message)).filter(Boolean).join('; ')
  }
  return err?.message || `Request failed (${httpStatus})`
}

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'not_attempted', label: 'Not attempted' },
  { value: 'processing', label: 'Processing' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
]

export default function WebhookHistoryPage() {
  const [apiKey, setApiKey] = useState('')
  const [environment, setEnvironment] = useState('sandbox')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const [notificationSettingId, setNotificationSettingId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [perPage, setPerPage] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorHttpStatus, setErrorHttpStatus] = useState(null)
  const [data, setData] = useState(null)
  const [afterCursor, setAfterCursor] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)

  useEffect(() => {
    if (!selectedRow) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedRow(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedRow])

  const runSearch = useCallback(
    async (cursor) => {
      setLoading(true)
      setError(null)
      setErrorHttpStatus(null)
      try {
        const res = await fetch('/api/paddle/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            environment,
            search: search || undefined,
            filter: filter || undefined,
            status: status || undefined,
            notification_setting_id: notificationSettingId || undefined,
            from: toRfc3339(from),
            to: toRfc3339(to),
            per_page: perPage,
            after: cursor || undefined,
            order_by: 'id[DESC]',
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          setData(null)
          setErrorHttpStatus(res.status)
          setError(getRequestErrorMessage(json, res.status))
          return
        }
        setErrorHttpStatus(null)
        if (cursor) {
          setData((prev) => ({
            ...json,
            data: [...(prev?.data || []), ...(json.data || [])],
          }))
        } else {
          setData(json)
        }
        setAfterCursor(afterCursorFromPagination(json?.meta?.pagination))
      } catch (e) {
        setErrorHttpStatus(null)
        setError(e.message || 'Network error')
        setData(null)
      } finally {
        setLoading(false)
      }
    },
    [apiKey, environment, search, filter, status, notificationSettingId, from, to, perPage],
  )

  const handleSearch = () => {
    if (!apiKey.trim()) return
    setAfterCursor(null)
    runSearch(null)
  }

  const showPermissionHelp =
    errorHttpStatus === 403 ||
    errorHttpStatus === 401 ||
    (error && /permitted|forbidden|unauthorized|authentication/i.test(error))

  const handleLoadMore = () => {
    if (afterCursor && !loading) runSearch(afterCursor)
  }

  const rows = data?.data || []

  return (
    <div className="min-h-screen bg-gray-900 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-yellow-400">Paddle Billing</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Webhook / notification history</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Paste your API key and use filters to query{' '}
              <a
                href="https://developer.paddle.com/api-reference/notifications/list-notifications"
                className="text-yellow-400/90 underline hover:text-yellow-400"
                target="_blank"
                rel="noreferrer"
              >
                List notifications
              </a>
              . Keys are sent only to this app&apos;s server and forwarded to Paddle; they are not stored.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            ← Home
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="webhook-history-fields grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-400">API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="paddle_apikey_… (server-side key from Paddle)"
                  className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
                />
              </label>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Use a{' '}
                <strong className="font-medium text-gray-400">server-side</strong> API key from Paddle (Developer tools →
                Authentication), not a client-side token. Listing notifications requires the{' '}
                <code className="rounded bg-white/5 px-1 py-0.5 text-gray-300">notification.read</code> permission. Match{' '}
                <strong className="font-medium text-gray-400">Sandbox</strong> vs <strong className="font-medium text-gray-400">Live</strong> to
                your key. See{' '}
                <a
                  href="https://developer.paddle.com/api-reference/about/api-keys"
                  className="text-yellow-400/90 underline hover:text-yellow-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  API keys
                </a>{' '}
                and{' '}
                <a
                  href="https://developer.paddle.com/api-reference/about/permissions"
                  className="text-yellow-400/90 underline hover:text-yellow-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  permissions
                </a>
                .
              </p>
            </div>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Environment</span>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              >
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Search (notification id or event type)</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. ntf_01… or transaction.completed"
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Filter (txn / customer / subscription id)</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="txn_…, ctm_…, or sub_…"
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'any'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Notification setting id</span>
              <input
                value={notificationSettingId}
                onChange={(e) => setNotificationSettingId(e.target.value)}
                placeholder="ntfset_…"
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">From (UTC)</span>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">To (UTC)</span>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-gray-400">Per page (max 200)</span>
              <input
                type="number"
                min={1}
                max={200}
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value) || 50)}
                className="w-full rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/30"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || !apiKey.trim()}
              onClick={handleSearch}
              className="rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
            {afterCursor && (
              <button
                type="button"
                disabled={loading}
                onClick={handleLoadMore}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Load more
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <p>{error}</p>
            {showPermissionHelp && (
              <ul className="mt-3 list-inside list-disc space-y-1 border-t border-red-500/30 pt-3 text-gray-300">
                <li>
                  Edit or create an API key in Paddle and enable{' '}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-xs text-emerald-200/90">notification.read</code> (or
                  Notifications read).
                </li>
                <li>Confirm Environment matches the key (sandbox keys only work with Sandbox).</li>
                <li>Do not use Paddle.js checkout tokens here; use your Billing API secret key.</li>
              </ul>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <p className="mt-6 text-xs text-gray-500">Click a row to view the notification payload.</p>
        )}

        {rows.length > 0 && (
          <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">Notification id</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">Type</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">Occurred</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-400/40"
                    onClick={() => setSelectedRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedRow(row)
                      }
                    }}
                    aria-label={`View payload for notification ${row.id}`}
                  >
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-yellow-200/90">{row.id}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-200">{row.type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">{row.status}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{row.occurred_at || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{row.delivered_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && rows.length === 0 && !loading && !error && (
          <p className="mt-8 text-center text-sm text-gray-500">No notifications match your filters.</p>
        )}

        {data?.meta?.pagination && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Page size: {data.meta.pagination.per_page ?? perPage}
            {data.meta.request_id ? ` · request_id: ${data.meta.request_id}` : ''}
          </p>
        )}

        {selectedRow && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close payload panel"
              onClick={() => setSelectedRow(null)}
            />
            <div
              className="relative flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-gray-950 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payload-panel-title"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <h2 id="payload-panel-title" className="text-lg font-semibold text-white">
                    Notification payload
                  </h2>
                  <p className="mt-1 break-all font-mono text-xs text-yellow-200/80">{selectedRow.id}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{selectedRow.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-100/95">
                  {JSON.stringify(selectedRow.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
