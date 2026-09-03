# Guide: Yearly Pro → Yearly Basic at Period End (No Charge Now)

This guide explains how to handle a user moving from a **yearly Pro** plan to a **yearly Basic** plan halfway through their term, with these requirements:

- **No credit or charge now** – no proration, no immediate billing.
- **Keep Pro for the rest of the current period** – user stays on Pro for the remaining 6 months.
- **At the next renewal** – switch to Basic and charge for the Basic yearly plan in the new interval.

---

## 1. How Paddle Behaves

In Paddle’s model:

- **Update subscription (PATCH)** applies the new `items` when you call the API. There is no “effective_from: next_billing_period” for *item* changes (only for pause/cancel).
- **`proration_billing_mode`** only controls *when and how* the customer is billed for that change, not when the plan “takes effect” in Paddle (the subscription’s items change as soon as you PATCH).

So you cannot, in one call, say “change the plan only at next renewal.” You can either:

- Update the subscription **now** and choose **when to bill** (now vs next period, and how much), or  
- Keep the subscription as Pro **in Paddle** and only update it **when you want the switch** (e.g. near renewal), and control “Pro for 6 more months” in your own app.

---

## 2. Two Ways to Implement “Pro Until Period End, Then Basic”

### Option A: Update Paddle Now, Bill at Next Renewal (`full_next_billing_period`)

**Idea:** Call **Update subscription** now and replace Pro with Basic, using **`proration_billing_mode: "full_next_billing_period"`**.  
Paddle will:

- Change the subscription’s items to Basic **immediately** (the subscription in Paddle will show Basic from now on).
- **Not** charge or credit anything now.
- At **next renewal** (`next_billed_at`), create a renewal transaction and charge the **full** Basic yearly amount.

**Trade-off:** In Paddle (and in any reporting or portal that reads the subscription), the plan is Basic from today. If you need “Pro” to show in Paddle for the rest of the period, use Option B.

**Steps:**

1. **Get the subscription**  
   `GET https://api.paddle.com/subscriptions/{subscription_id}`  
   (or from your app if you already have `subscription_id`).

2. **Identify the Basic yearly price**  
   You need the Paddle price ID for “Basic – yearly” (e.g. `pri_01...`).

3. **PATCH the subscription** – replace Pro with Basic, bill at next period:

   ```http
   PATCH https://api.paddle.com/subscriptions/{subscription_id}
   Content-Type: application/json
   Authorization: Bearer YOUR_API_KEY
   ```

   Body:

   ```json
   {
     "items": [
       {
         "price_id": "pri_01xxxx_basic_yearly",
         "quantity": 1
       }
     ],
     "proration_billing_mode": "full_next_billing_period"
   }
   ```

   - `items`: **only** the new Basic yearly price (this removes Pro).
   - `proration_billing_mode`: **`full_next_billing_period`** so:
     - No charge or credit now.
     - At the next renewal, Paddle charges the **full** amount for the new (Basic yearly) plan.

4. **Result**  
   - User is not charged or credited today.  
   - For the rest of the current period you can still treat them as “Pro” in your app (e.g. by checking a “downgrade scheduled at” date or by looking at `next_billed_at` and your own rules).  
   - At `next_billed_at`, Paddle will renew the subscription and charge the full Basic yearly price; from then on the subscription is Basic in both Paddle and your logic.

**Optional – Preview before applying:**  
Use **Preview an update to a subscription** so the user (or you) can see what will happen at renewal:

```http
PATCH https://api.paddle.com/subscriptions/{subscription_id}/preview
```

Same body (`items` + `proration_billing_mode`). Response shows the projected transaction at next billing.

---

### Option B: Keep Pro in Paddle Until Renewal (Application-controlled)

**Idea:** Do **not** change the subscription in Paddle today. In your app you record “downgrade to Basic at end of period.” You keep giving Pro access until the current period ends. **Just before** the next renewal (or when the period has ended), you call **Update subscription** to switch to Basic and charge for Basic (e.g. `full_immediately` or `prorated_immediately` so the next charge is for Basic).

**Steps:**

1. **When the user asks to downgrade (today)**  
   - Do **not** call Paddle Update subscription.  
   - Store in your DB something like:  
     `subscription_id`, `downgrade_to_price_id` (Basic yearly), `effective_after` = current period end (e.g. `next_billed_at` from the subscription).

2. **Access control for the next 6 months**  
   - In Paddle the subscription stays **Pro**.  
   - In your app, when deciding “does this user get Pro or Basic?”, use your stored “downgrade at period end” and `next_billed_at`:  
     - If `now < next_billed_at` (or your stored period end), treat them as **Pro**.  
     - After that, treat them as **Basic** (and rely on step 3 to align Paddle with that).

3. **When to apply the change in Paddle**  
   You must switch the subscription to Basic **before** (or as) the next renewal happens, so that the next charge is for Basic, not Pro.

   - **Option B1 – Scheduled job (recommended)**  
     - Cron (e.g. daily) finds subscriptions where:  
       - You have a “downgrade to Basic at period end” record, and  
       - `next_billed_at` is in the near future (e.g. within 1–7 days, but **not** within Paddle’s “cannot change” window; Paddle often disallows changes when next billing is within 30 minutes).  
     - For each such subscription, call:

       ```http
       PATCH https://api.paddle.com/subscriptions/{subscription_id}
       ```

       Body:

       ```json
       {
         "items": [
           {
             "price_id": "pri_01xxxx_basic_yearly",
             "quantity": 1
           }
         ],
         "proration_billing_mode": "full_immediately"
       }
       ```

       So the **next** transaction Paddle creates will be for Basic (full amount). After that, delete or mark as done your “downgrade at period end” record.

   - **Option B2 – Webhook-driven**  
     - Listen for an event that tells you “renewal is coming” or “period ended” (e.g. a notification or a scheduled reminder).  
     - When that fires, call the same PATCH as in B1.  
     - You must do this early enough that the subscription is already Basic before Paddle generates the renewal transaction (otherwise the renewal might still be for Pro).

4. **Result**  
   - No charge or credit today.  
   - User stays on Pro in both Paddle and your app until the period end.  
   - At the chosen time you switch the subscription to Basic and the next charge is for the Basic yearly plan.

---

## 3. Proration Modes (Quick Reference)

| Mode | When customer is billed | Typical use |
|------|--------------------------|-------------|
| `do_not_bill` | No charge now or at renewal for this change | Change plan without any billing (e.g. comp change). Items still change immediately in Paddle. |
| `full_next_billing_period` | Full amount for the *new* plan at **next** renewal | Option A above: switch to Basic now in Paddle, charge at next renewal. |
| `prorated_next_billing_period` | Prorated amount at next renewal | Not ideal for “no charge now, then full Basic year”; use `full_next_billing_period` for that. |
| `full_immediately` | Full amount **now** | Use when you actually switch them to Basic and charge immediately (e.g. Option B when you run the job). |
| `prorated_immediately` | Prorated amount **now** | Use if you want to charge a prorated amount at the time of the switch. |

For “no charge now, then charge for Basic yearly in the new interval”:

- **Option A:** `full_next_billing_period` when you PATCH **now** to Basic.  
- **Option B:** PATCH **later** (near renewal) to Basic with `full_immediately` (or `prorated_immediately` if you prefer proration at that moment).

---

## 4. API Summary

- **Get subscription:**  
  `GET https://api.paddle.com/subscriptions/{subscription_id}`  
  → Use `items`, `next_billed_at`, and optionally `current_billing_period`.

- **Update subscription (apply plan change):**  
  `PATCH https://api.paddle.com/subscriptions/{subscription_id}`  
  Body: `items` (e.g. only Basic yearly) + `proration_billing_mode`.

- **Preview update (optional):**  
  `PATCH https://api.paddle.com/subscriptions/{subscription_id}/preview`  
  Same body; use to show the customer or yourself what will be charged.

- **Sandbox:** Use `https://sandbox-api.paddle.com` and your sandbox API key for testing.

---

## 5. Recommendation

- If you are okay with the subscription **showing as Basic in Paddle** for the rest of the current period and you want the simplest flow: use **Option A** with **`full_next_billing_period`** and a single PATCH now.
- If you need the subscription to **remain Pro in Paddle** until the period end and have more control in your app: use **Option B** (store downgrade intent, keep Pro in Paddle, run a job or webhook near renewal to PATCH to Basic with `full_immediately` so the next charge is for the Basic yearly plan).

Both approaches achieve: no charge or credit today, Pro for the remaining 6 months (in access logic and/or in Paddle), and then a charge for the Basic yearly plan in the new interval.
