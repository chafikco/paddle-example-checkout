'use client'

// Standalone seller-testing page. Kept separate from the main example flows so
// it can be freely edited without touching them. Swap the token / price ID below.

import { useState, useEffect, useRef } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

const DEFAULT_TOKEN = 'test_c04b655964780ae5aab11c04c5e'
const DEFAULT_PRICE_ID = 'pri_01m22xchfhmj1c5z0m5m29ft4p'
const STORAGE_TOKEN_KEY = 'sellerTest.token'
const STORAGE_PRICE_KEY = 'sellerTest.priceId'
const CHECKOUT_FRAME_ID = 'sandbox-test-checkout-frame'
const DEFAULT_CHECKOUT_FRAME_HEIGHT = 500
const MIN_CHECKOUT_FRAME_HEIGHT = 120

export default function SandboxTestPage() {
  const [paddle, setPaddle] = useState(null)
  const [displayMode, setDisplayMode] = useState('inline') // 'inline' | 'overlay'
  const [variant, setVariant] = useState('one-page') // 'one-page' | 'express'
  const [lastEvent, setLastEvent] = useState(null)
  const [checkoutFrameHeight, setCheckoutFrameHeight] = useState(null)
  const [receivedPing, setReceivedPing] = useState(false)
  const checkoutOpenedRef = useRef(false)

  // Applied (active) params vs. editable draft inputs.
  const [token, setToken] = useState(DEFAULT_TOKEN)
  const [priceId, setPriceId] = useState(DEFAULT_PRICE_ID)
  const [tokenInput, setTokenInput] = useState(DEFAULT_TOKEN)
  const [priceInput, setPriceInput] = useState(DEFAULT_PRICE_ID)
  const [justSaved, setJustSaved] = useState(false)

  // Restore any previously saved params on first load.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedToken = window.localStorage.getItem(STORAGE_TOKEN_KEY)
    const savedPrice = window.localStorage.getItem(STORAGE_PRICE_KEY)
    if (savedToken) {
      setToken(savedToken)
      setTokenInput(savedToken)
    }
    if (savedPrice) {
      setPriceId(savedPrice)
      setPriceInput(savedPrice)
    }
  }, [])

  const isDirty = tokenInput.trim() !== token || priceInput.trim() !== priceId

  const saveParams = () => {
    const nextToken = tokenInput.trim()
    const nextPrice = priceInput.trim()
    if (!nextToken || !nextPrice) return

    // Close any open checkout before swapping params.
    closeCheckout()

    setPriceId(nextPrice)
    setToken(nextToken) // changing the token re-initializes Paddle (see effect below)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_TOKEN_KEY, nextToken)
      window.localStorage.setItem(STORAGE_PRICE_KEY, nextPrice)
    }

    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  // Initialize (or re-initialize) Paddle whenever the active token changes.
  useEffect(() => {
    setPaddle(null)
    checkoutOpenedRef.current = false
    setReceivedPing(false)
    setCheckoutFrameHeight(null)

    initializePaddle({
      environment: 'sandbox',
      token,
      eventCallback: (event) => {
        console.log('Paddle event', event)
        setLastEvent(event?.name || null)

        if (event?.name === 'ping.size') {
          const reported = [
            event?.data?.height,
            event?.data?.frame_height,
            event?.data?.size?.height,
            event?.height,
          ].find((v) => Number.isFinite(Number(v)) && Number(v) > 0)
          if (reported) {
            const cap =
              typeof window !== 'undefined'
                ? Math.max(MIN_CHECKOUT_FRAME_HEIGHT, window.innerHeight - 120)
                : DEFAULT_CHECKOUT_FRAME_HEIGHT
            setReceivedPing(true)
            setCheckoutFrameHeight(
              Math.min(cap, Math.max(MIN_CHECKOUT_FRAME_HEIGHT, Math.ceil(Number(reported))))
            )
          }
          return
        }

        if (event?.name === 'checkout.closed') {
          checkoutOpenedRef.current = false
        }
      },
    })
      .then((p) => p && setPaddle(p))
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const closeCheckout = () => {
    checkoutOpenedRef.current = false
    setReceivedPing(false)
    setCheckoutFrameHeight(null)
    if (paddle?.Checkout?.close) {
      try {
        paddle.Checkout.close()
      } catch (_) {}
    }
  }

  const openCheckout = () => {
    if (!paddle?.Initialized) {
      console.warn('Paddle not ready yet.')
      return
    }

    // Re-open cleanly if a checkout is already showing.
    closeCheckout()
    checkoutOpenedRef.current = true

    const isOverlay = displayMode === 'overlay'
    const settings = isOverlay
      ? {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
          variant,
        }
      : {
          displayMode: 'inline',
          theme: 'light',
          locale: 'en',
          variant,
          frameTarget: CHECKOUT_FRAME_ID,
          frameStyle:
            'width: 100%; min-width: 312px; background-color: transparent; border: none;',
          frameInitialHeight: String(DEFAULT_CHECKOUT_FRAME_HEIGHT),
        }

    paddle.Checkout.open({
      settings,
      items: [{ priceId, quantity: 1 }],
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seller test checkout</h1>
            <p className="mt-1 text-sm text-slate-500">
              Standalone sandbox page for testing — separate from the main examples.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
            Sandbox
          </span>
        </div>

        {/* Editable config — change token / price ID and click Save to apply. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveParams()
          }}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="token-input" className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Token
              </label>
              <input
                id="token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                placeholder="test_..."
              />
            </div>
            <div>
              <label htmlFor="price-input" className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Price ID
              </label>
              <input
                id="price-input"
                type="text"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                placeholder="pri_..."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={!isDirty || !tokenInput.trim() || !priceInput.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
            {justSaved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
            {isDirty && !justSaved && (
              <span className="text-sm text-amber-600">Unsaved changes — click Save to apply</span>
            )}
          </div>
        </form>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Display mode</p>
            <div className="inline-flex rounded-full bg-slate-200/70 p-1">
              {['inline', 'overlay'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDisplayMode(m)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                    displayMode === m ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Variant</p>
            <div className="inline-flex rounded-full bg-slate-200/70 p-1">
              {['one-page', 'express'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    variant === v ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={!paddle}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {paddle ? 'Open checkout' : 'Loading…'}
          </button>
        </div>

        {lastEvent && (
          <p className="mt-4 text-xs text-slate-400">
            Last Paddle event: <span className="font-mono text-slate-600">{lastEvent}</span>
          </p>
        )}

        {/* Inline checkout target */}
        {displayMode === 'inline' && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div
              id={CHECKOUT_FRAME_ID}
              className={`${CHECKOUT_FRAME_ID} checkout-frame w-full`}
              style={
                receivedPing && checkoutFrameHeight
                  ? { height: `${checkoutFrameHeight}px` }
                  : { minHeight: `${DEFAULT_CHECKOUT_FRAME_HEIGHT}px` }
              }
            />
          </div>
        )}

        {displayMode === 'overlay' && (
          <p className="mt-6 text-sm text-slate-500">
            Overlay mode: click “Open checkout” and Paddle renders its own full-screen overlay.
          </p>
        )}
      </div>
    </div>
  )
}
