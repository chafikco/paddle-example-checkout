# Guide: Recreating a Two-Column Checkout with Paddle (Currency Selection)

This guide explains how to build a checkout page like the Chatly example: **order summary on the left**, **inline Paddle checkout on the right**, with a **crucial currency selector** (e.g. local currency vs USD). It is based on the patterns used in `pages/customise.js` and the Paddle Transaction Preview API.

---

## 1. High-Level Architecture

- **Left column (dark):** Your app renders the order summary: plan name, price in selected currency, currency selector (e.g. TRY | USD), optional annual billing toggle, subtotal, tax, total, and “Subscribe” (or “Confirm”) that opens or focuses the checkout.
- **Right column (light):** Paddle Checkout runs **inline** inside a target `div` (same pattern as `customise.js`: the frame div is always in the DOM; you toggle visibility with a class).
- **Currency selection:** When the user picks a currency (e.g. TRY or USD), you:
  1. Call **Transaction Preview** (or your `/api/pricePreview` that wraps it) with `currency_code` and `address.country_code` so totals and displayed price match that currency.
  2. When opening **Checkout**, pass the same **address** (and optionally customer) so Paddle shows the correct currency and tax in the iframe.

Paddle uses **address/country** to determine display currency and tax. So “currency selection” is implemented by passing the appropriate **country + currency** into both preview and checkout.

---

## 2. Backend: Transaction Preview with Currency and Address

Your **pricePreview** API (or equivalent) should call Paddle’s **Preview a transaction** endpoint and support **currency** and **address** so the left column can show the correct price.

### 2.1 Paddle API: `POST https://api.paddle.com/transactions/preview`

Request body (snake_case):

- **`items`** (required): array of `{ price_id, quantity }` (and optionally `include_in_totals`).
- **`currency_code`** (optional): e.g. `"USD"` or `"TRY"`. Use this to force the preview (and thus your displayed price) into the user’s chosen currency.
- **`address`** (optional but recommended when using currency): e.g. `{ "country_code": "TR" }` for TRY or `{ "country_code": "US" }` for USD. Paddle uses this for tax and localization; it should match the currency the user selected.

Example (conceptually what your API should send to Paddle):

```json
{
  "items": [
    { "price_id": "pri_xxxx", "quantity": 1 }
  ],
  "currency_code": "TRY",
  "address": {
    "country_code": "TR"
  }
}
```

Your existing `pages/api/pricePreview.js` currently only sends `items`. Extend it to accept optional `currency_code` and `address` from the request body and forward them to Paddle. Example shape from client:

```js
// Client sends:
{ items: [...], currency_code: "TRY", address: { country_code: "TR" } }
// or
{ items: [...], currency_code: "USD", address: { country_code: "US" } }
```

Return the API response (including `data.details.totals`, `data.details.line_items`, etc.) so the front end can render subtotal, tax, and total in the chosen currency.

---

## 3. Front End: Price Preview with Currency and Address

Mirror what `customise.js` does, but drive the request from the **selected currency** (and optionally billing interval).

### 3.1 State

- `items`: array of `{ price_id, quantity }` (e.g. the selected plan).
- `currencyCode`: `"TRY"` or `"USD"` (or your two options).
- `address`: e.g. `{ country_code: "TR" }` or `{ country_code: "US" }` — keep this in sync with `currencyCode` (TRY → TR, USD → US).
- `totals`: result of the transaction preview (or your API response) used to render the left column.

### 3.2 Calling Your Price Preview API

When the user changes currency (or plan), call your API with `items`, `currency_code`, and `address`:

```js
const res = await fetch('/api/pricePreview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: params,                    // e.g. [{ price_id: "pri_xxx", quantity: 1 }]
    currency_code: currencyCode,      // "TRY" or "USD"
    address: { country_code: address.country_code }
  }),
});
const { data } = await res.json();
setTotals(data);
```

Use `data.details.totals` and `data.details.line_items` to show subtotal, tax, total, and line items in the selected currency (and format with the correct symbol, e.g. TRY vs USD).

### 3.3 Optional: Paddle.js PricePreview / TransactionPreview

You can also use **Paddle.TransactionPreview()** (or **Paddle.PricePreview()**) from the client with the same `currencyCode` and `address` so client-side logic stays in sync with what you show. Use **camelCase** (e.g. `currencyCode`, `address: { countryCode: "TR" }`). When the user changes currency, call it again and update your summary state. This matches the “PricePreview” pattern from the existing guide and gives you totals consistent with Paddle.

---

## 4. Currency Selector UI

- Render two buttons (or tabs): e.g. **TRY** (with Turkish flag) and **USD** (with US flag), like in the reference.
- On click:
  - Set `currencyCode` to `"TRY"` or `"USD"`.
  - Set `address` to `{ country_code: "TR" }` or `{ country_code: "US" }`.
  - Call your price preview API (and/or Paddle.TransactionPreview) with `currency_code` and `address`.
  - Update the order summary (subtotal, tax, total) from the new response.
- Optionally show a line like: “1 USD = X.XXXX TRY. Charges can vary based on exchange rates.” (You can get approximate rates from your preview response or a separate source.)

---

## 5. Inline Checkout (Same Page, Right Column)

Follow the same pattern as **customise.js**:

1. **Frame div always in the DOM**  
   Use a single div that is always rendered (e.g. `id="checkout-frame"` and a class like `checkout-frame`). Toggle visibility with a class (e.g. `hidden` when checkout is closed, visible when open). This avoids the “appendChild” / 404 issues that occur when the target is conditionally mounted.

2. **Open checkout from user action**  
   When the user clicks “Subscribe” (or “Confirm & checkout”), call `paddle.Checkout.open()` with:
   - **settings:** `displayMode: "inline"`, `frameTarget: "checkout-frame"`, `theme`, `locale`, `frameStyle`, `frameInitialHeight`.
   - **items:** same as what you used for the preview (e.g. `[{ priceId: "pri_xxx", quantity: 1 }]`).
   - **customer / address:** pass the **address** (and optionally email) that matches the **selected currency** so Paddle shows the correct currency and tax in the iframe:
     ```js
     customer: {
       email: "user@example.com",
       address: {
         countryCode: "TR",  // or "US" when USD is selected
         postalCode: "...",   // optional but can help tax
       }
     }
     ```

3. **Timing**  
   If the checkout frame is inside a modal or shown only after click, open checkout after a short delay (e.g. `setTimeout(openCheckout, 50)`) so the frame is in the DOM and visible before Paddle injects the iframe.

4. **frameTarget**  
   Paddle expects **frameTarget** to be the **class name** of the container div (not necessarily the id). Give the div that class as well (e.g. `class="checkout-frame"`) so Paddle can find it.

Result: the right column shows Paddle’s form (contact, payment, total) in the same currency and country you used for the left column.

---

## 6. Two-Column Layout (Like the Reference)

- **Left column (dark background):**
  - Back link + “Chatly” (or your product name).
  - “Subscribe to [Plan Name]”.
  - Main price: e.g. “TRY 2,037.69” or “USD 45.00” + “every 3 months” (from `totals` and selected currency).
  - **Currency selector:** TRY | USD (and optional exchange-rate text).
  - Line items: plan name, billing interval, price.
  - Optional: “Save 50% with annual billing” toggle; when toggled, switch the `items` to the annual price and re-call the preview so totals update.
  - Order summary: Subtotal, “Add promotion code”, Tax, **Total due today** (all from `totals` in the selected currency).

- **Right column (light background):**
  - Inline Paddle checkout container (the div with `frameTarget` class).
  - Paddle renders contact and payment fields inside it; currency/totals will match the `customer.address` (and thus your currency selector) you passed when opening checkout.

---

## 7. Optional: Annual Billing Toggle

- Store billing interval in state (e.g. `every 3 months` vs `annual`).
- When the user toggles “Save 50% with annual billing”, switch the `price_id` (or items) to the annual price, keep the same `currency_code` and `address`, and call the preview API again. Update the left column and the “Subscribe” action so that when you call `Checkout.open`, you pass the same annual items. No change to the currency flow: still pass the same `address` / `currencyCode` for the selected currency.

---

## 8. Checklist Summary

| Feature | How to implement |
|--------|-------------------|
| **Currency selection (local vs USD)** | Store `currencyCode` (e.g. TRY/USD) and matching `address.country_code` (TR/US). Pass both to transaction preview API and to `Checkout.open` via `customer.address`. |
| **Order summary on the same page** | Call your `/api/pricePreview` (or Paddle Transaction Preview) with `items` + `currency_code` + `address`; render `data.details.totals` and `data.details.line_items` on the left. |
| **Inline checkout** | One div with class = `frameTarget`, always in DOM. On “Subscribe”, call `Checkout.open` with `displayMode: "inline"`, `frameTarget`, and `customer.address` matching selected currency. |
| **Correct price in checkout iframe** | Pass the same `address` (and items) to `Checkout.open` as used for the preview so Paddle displays that currency and tax. |
| **Exchange rate note** | Optional: show “1 USD = X.XX TRY” (from your own logic or preview-related data) under the currency selector. |

---

## 9. References

- **customise.js:** Pricing and inline checkout on the same page; `frameTarget` and frame always in DOM; `Checkout.open` with `settings` and `items`.
- **pricePreview API:** `pages/api/pricePreview.js` — extend with `currency_code` and `address` and forward to `POST https://api.paddle.com/transactions/preview` (or sandbox equivalent).
- Paddle: [Preview a transaction](https://developer.paddle.com/api-reference/transactions/preview-transaction), [Paddle.TransactionPreview()](https://developer.paddle.com/paddlejs/methods/paddle-transactionpreview), [Checkout.open](https://developer.paddle.com/paddlejs/methods/paddle-checkout-open), [Localize prices](https://developer.paddle.com/build/products/offer-localized-pricing).

Using this flow, users can select their currency (e.g. TRY or USD), see the order summary in that currency, and complete payment in the same currency inside the inline Paddle checkout.
