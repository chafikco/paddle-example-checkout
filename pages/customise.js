import { useEffect, useRef, useState } from "react";
import { initializePaddle } from '@paddle/paddle-js';

// Minimal customise page: no pricing/seat/addon logic — just load the
// inline checkout immediately. Keeps the desktop/mobile layout toggle and
// a sandbox/production environment toggle.
const ENVIRONMENTS = {
  sandbox: {
    environment: 'sandbox',
    token: 'test_37a3ae9038ae86dd31608afd2b9',
    priceId: 'pri_01kxp0mgwznbkcqkc2dbmsr0t9',
  },
  production: {
    environment: 'production',
    token: 'live_93ba7f4e29bffc0902806b9bbbf',
    priceId: 'pri_01hybd14vew7jd4t03nnpc1p3q',
  },
};

const CHECKOUT_FRAME_ID = 'checkout-frame';

// Default payload for the in-flight debug box. Anything valid for
// Paddle.Checkout.updateCheckout() works — swap price_ids, change quantities,
// add a discountId / discountCode, or pre-fill the customer.
const DEFAULT_DEBUG_PAYLOAD = `{
  "items": [
    { "priceId": "pri_01kxp0mgwznbkcqkc2dbmsr0t9", "quantity": 1 }
  ],
  "discountId": "",
  "customer": {
    "email": "chafik+test@paddle.com",
    "address": { "countryCode": "GB", "postalCode": "SW1A 1AA" }
  }
}`;

export default function Customise() {
  const [paddle, setPaddle] = useState();
  const [environment, setEnvironment] = useState('sandbox'); // 'sandbox' | 'production'
  const [envReady, setEnvReady] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const openedRef = useRef(false);
  const isLive = environment === 'production';

  // Paddle.js locks the environment in at setup and can't switch it on the same
  // page load, so we persist the choice and reload to re-init cleanly.
  const switchEnvironment = (env) => {
    if (env === environment) return;
    try { window.localStorage.setItem('customise.env', env); } catch (_) {}
    window.location.reload();
  };

  // Read the persisted environment once on mount (before Paddle initialises).
  useEffect(() => {
    let saved = null;
    try { saved = window.localStorage.getItem('customise.env'); } catch (_) {}
    if (saved === 'production' || saved === 'sandbox') setEnvironment(saved);
    setEnvReady(true);
  }, []);

  // ----- In-flight debug box state -----
  const [debugJson, setDebugJson] = useState(DEFAULT_DEBUG_PAYLOAD);
  const [debugStatus, setDebugStatus] = useState('');

  // Parse + sanitise the debug JSON payload.
  const parseDebugPayload = () => {
    const payload = JSON.parse(debugJson);
    // Drop empty discount fields so they don't trigger a lookup error.
    if (!payload.discountId) delete payload.discountId;
    if (!payload.discountCode) delete payload.discountCode;
    return payload;
  };

  // Apply the JSON payload to the already-open inline checkout via updateCheckout.
  // NOTE: updateCheckout only *merges* the fields you pass — it cannot *remove*
  // data that's already on the checkout (e.g. a previously-set address). To clear
  // prefilled data, use "Open fresh" below instead.
  const applyDebugUpdate = () => {
    if (!paddle?.Initialized) { setDebugStatus('Paddle not ready yet.'); return; }
    let payload;
    try {
      payload = parseDebugPayload();
    } catch (e) {
      setDebugStatus('Invalid JSON: ' + e.message);
      return;
    }
    try {
      paddle.Checkout.updateCheckout(payload);
      setDebugStatus(`updateCheckout() applied at ${new Date().toLocaleTimeString()} (note: can't unset fields — use "Open fresh" to clear)`);
    } catch (e) {
      setDebugStatus('updateCheckout error: ' + String(e));
    }
  };

  // Close and re-open the checkout from scratch using the JSON payload.
  // Since this is a fresh open, omitting "customer" clears any prefilled data.
  const openFreshCheckout = () => {
    if (!paddle?.Initialized) { setDebugStatus('Paddle not ready yet.'); return; }
    let payload;
    try {
      payload = parseDebugPayload();
    } catch (e) {
      setDebugStatus('Invalid JSON: ' + e.message);
      return;
    }
    const { priceId } = ENVIRONMENTS[environment];
    const items = Array.isArray(payload.items) && payload.items.length
      ? payload.items
      : [{ priceId, quantity: 1 }];
    try { paddle.Checkout.close(); } catch (_) {}
    openedRef.current = true;
    // Small delay so the previous inline checkout tears down before re-opening.
    setTimeout(() => {
      try {
        paddle.Checkout.open({
          settings: {
            displayMode: 'inline',
            theme: 'light',
            locale: 'en',
            variant: 'express',
            frameTarget: CHECKOUT_FRAME_ID,
            frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
            frameInitialHeight: '450',
            showNonExpressPaymentMethods: true,
            allowLogout: false,
          },
          items,
          ...(payload.customer ? { customer: payload.customer } : {}),
          ...(payload.discountId ? { discountId: payload.discountId } : {}),
          ...(payload.discountCode ? { discountCode: payload.discountCode } : {}),
        });
        setDebugStatus(`Re-opened fresh checkout at ${new Date().toLocaleTimeString()} (omit "customer" to clear prefill)`);
      } catch (e) {
        setDebugStatus('open error: ' + String(e));
      }
    }, 150);
  };

  // Initialise Paddle once, after we've read the persisted environment.
  // (Switching environments reloads the page, so this runs once per load.)
  useEffect(() => {
    if (!envReady) return;
    const { environment: env, token } = ENVIRONMENTS[environment];
    initializePaddle({
      environment: env,
      token,
      eventCallback: (event) => console.log(event),
    })
      .then((paddleInstance) => {
        if (paddleInstance) setPaddle(paddleInstance);
      })
      .catch((error) => console.log(error));
  }, [envReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the checkout immediately once Paddle is ready.
  // openedRef guards against React StrictMode double-invocation in dev.
  useEffect(() => {
    if (!paddle?.Initialized || openedRef.current) return;
    openedRef.current = true;

    const { priceId } = ENVIRONMENTS[environment];
    paddle.Checkout.open({
      settings: {
        displayMode: 'inline',
        theme: 'light',
        locale: 'en',
        variant: 'express',
        frameTarget: CHECKOUT_FRAME_ID,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        frameInitialHeight: '450',
        showNonExpressPaymentMethods: true,
        allowLogout: false,
      },
      items: [{ priceId, quantity: 1 }],
      customer: {
        name: 'Chafik',
        email: 'chafik+uk@paddle.com',
        address: {
          countryCode: 'GB',
          postalCode: 'HP23 6FE',
        },
      },
    });
  }, [paddle]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`bg-gray-900 ${isMobileView ? "min-h-screen pb-16" : "py-24 sm:py-32"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Control bar: layout toggle + environment toggle */}
        <div className="flex items-center justify-between gap-4 py-4 sm:py-6">
          {/* Layout toggle: Desktop / Mobile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-pressed={!isMobileView}
              aria-label="Desktop layout"
              className={`rounded-lg p-2 transition ${!isMobileView ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400" : "text-gray-400 hover:text-white"}`}
              onClick={() => setIsMobileView(false)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={isMobileView}
              aria-label="Mobile layout"
              className={`rounded-lg p-2 transition ${isMobileView ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400" : "text-gray-400 hover:text-white"}`}
              onClick={() => setIsMobileView(true)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
            <span className="text-sm text-gray-400">{isMobileView ? "Mobile view" : "Desktop view"}</span>
          </div>

          {/* Environment toggle: Sandbox / Live */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={!isLive}
              onClick={() => switchEnvironment('sandbox')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${!isLive ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400" : "text-gray-400 hover:text-white"}`}
            >
              Sandbox
            </button>
            <button
              type="button"
              aria-pressed={isLive}
              onClick={() => switchEnvironment('production')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${isLive ? "bg-green-500/20 text-green-400 ring-1 ring-green-400" : "text-gray-400 hover:text-white"}`}
            >
              Live
            </button>
            {isLive && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-black">Production</span>
            )}
          </div>
        </div>

        {/* Checkout container — width adapts to the layout toggle */}
        <div className={isMobileView ? "mx-auto max-w-[420px]" : "mx-auto max-w-2xl"}>
          <div className="sm:text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Checkout</h2>
            <p className="mt-2 text-base text-gray-300">
              Complete your purchase below{isLive ? " · live mode" : ""}.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-4 sm:p-6 ring-1 ring-yellow-400">
            <div id={CHECKOUT_FRAME_ID} className="checkout-frame w-full min-h-[450px]" />
          </div>

          {/* ---- In-flight debug box: test pre-fill / items / discounts without redeploying ---- */}
          <div className="mt-6 rounded-2xl border border-dashed border-yellow-300/40 bg-white/5 p-5">
            <h3 className="text-sm font-semibold text-yellow-300">Debug · updateCheckout (in-flight)</h3>
            <p className="mt-1 text-xs text-gray-400">
              Edit the payload, then apply it live to the checkout above. Supports any{" "}
              <code>updateCheckout</code> field — <code>items</code> (price_ids + quantity),{" "}
              <code>discountId</code>/<code>discountCode</code>, and <code>customer</code> (email + address prefill).
            </p>
            <p className="mt-1 text-xs text-gray-500">
              <strong className="text-gray-400">Apply updateCheckout</strong> merges fields but can&apos;t remove
              already-set data (Paddle limitation). To clear prefilled data (e.g. address), use{" "}
              <strong className="text-gray-400">Open fresh</strong> and omit <code>customer</code> from the JSON.
            </p>
            <textarea
              value={debugJson}
              onChange={(e) => setDebugJson(e.target.value)}
              rows={10}
              spellCheck={false}
              className="mt-3 w-full rounded-lg border border-white/20 bg-black/40 p-3 font-mono text-xs text-white focus:border-yellow-400 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={applyDebugUpdate}
                className="rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-yellow-500"
              >
                Apply updateCheckout
              </button>
              <button
                type="button"
                onClick={openFreshCheckout}
                className="rounded-lg border border-yellow-400 px-3 py-1.5 text-sm font-semibold text-yellow-400 hover:bg-yellow-400/10"
              >
                Open fresh (clears prefill)
              </button>
              <button
                type="button"
                onClick={() => setDebugJson(DEFAULT_DEBUG_PAYLOAD)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white"
              >
                Reset
              </button>
              {debugStatus && <span className="text-xs text-gray-300">{debugStatus}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
