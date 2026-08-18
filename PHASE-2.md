# Phase 2 — backlog

Phase 1 shipped: merchants publish products to a per-store storefront, customers
order as guests, merchants confirm and fulfil, and completed orders land in
Sales and Reports. See `supabase/schema.sql` for the shared data model and
[../storecount-storefront/README.md](../storecount-storefront/README.md) for how
the two apps connect.

Items are ordered by what actually blocks real use. **1 and 2 are the ones that
matter**; the rest is debt and polish.

---

## 1. Web Push notifications — the biggest functional gap

Nothing tells a merchant an order arrived. `useOrderPolling()` in
[lib/orders.ts](lib/orders.ts) only runs while the app is open and visible, so a
phone in a pocket learns nothing. A storefront where orders sit unseen for an
hour is worse than no storefront.

Polling cannot fix this and neither can Supabase Realtime — only Web Push can.

- `public/sw.js` already exists and is registered in **both** apps, so half the
  infrastructure is there. Each needs a `push` event handler and
  `notificationclick` → open `/orders`.
- The storefront is now a PWA too, so the same work also unlocks customer-side
  notifications ("your order was confirmed"), which is what removes the last
  reason for its Orders badge to go stale.
- Generate VAPID keys; store the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- New `push_subscriptions` table keyed by `user_id`, with endpoint + keys.
- Subscribe from the merchant app (permission prompt belongs in Settings, next
  to the Online Store group — never on first load).
- Send on order insert. The `orders_bump_store` trigger already fires there;
  either extend it or send from the storefront's `POST /api/orders` after insert.
- Once this lands, drop the polling interval — it becomes a fallback, not the
  primary signal.

**Also fixes:** the storefront's Orders badge only refreshes once per store
visit, so a customer with a stale tab sees an out-of-date count. Push closes
that on the customer side too.

## 2. Online payments (Paystack)

The schema already carries `payment_method` and `payment_status` on `orders`,
and the UI already says "Pay on delivery". The wiring is missing.

- New `order_payments` table: order_id, provider, provider_ref, amount, status,
  raw payload, timestamps.
- Initialise a transaction when the customer picks "Pay now" at checkout.
- Webhook route with **signature verification**. Flip `payment_status` there and
  only there — never trust the browser redirect, which is trivially forged.
- **Rule that must not be broken:** an online-paid order is still `pending`
  until the merchant accepts. Money in hand does not move stock. If the merchant
  declines, refund.
- Refund path on reject and on cancel-after-accept.
- Merchant payout/settlement is a separate question — decide whether funds land
  in the merchant's own Paystack account (simplest, no money transmission on
  your side) or a platform account.

## 3. Security hardening

### 3a. Move storefront reads to the anon key + RLS

`lib/queries.ts` in the storefront holds the **service-role key**, which bypasses
RLS entirely. An SSRF or dependency compromise in that public deployment reads
every merchant's sales history and PIN hashes. The ESLint import guard limits
the surface but does not reduce the blast radius.

Two policies shrink it to "public catalogs":

```sql
create policy store_public_read on stores for select to anon
  using (is_published);
create policy store_products_public_read on store_products for select to anon
  using (exists (select 1 from stores s
                 where s.id = store_products.store_id and s.is_published));
```

Keep the service role only for the order-insert route. ~20 lines of SQL.

### 3b. Stop returning the PIN hash to the client

`/api/auth/login` and `/api/sync/pull` both return `pin.salt`, `pin.hash`, and
`pin.iterations`, and the client stores them in localStorage. That is an
offline-crackable hash over a 10,000-value keyspace; PBKDF2-150k buys minutes,
not security.

Bigger than it looks — offline PIN unlock depends on it. Scope deliberately.
Likely shape: derive and store the credential locally at onboarding only, and
require re-entry (not re-derivation) on a new device.

### 3c. Revocable tokens

`lib/jwt.ts` issues 30-day tokens with no `jti` and no revocation. "Log out &
erase data" clears the local copy while the token stays valid for a month.
Add `users.token_version`, embed it in the payload, bump it on logout and on PIN
change. ~15 lines.

*(Login rate limiting was moved into Phase 1 and is done — see
[lib/login-throttle.ts](lib/login-throttle.ts).)*

## 4. Personal data retention

`orders` now holds customer names, phone numbers, and home addresses. In Nigeria
this is NDPA-regulated. Add a scheduled job:

- Null `delivery_address` and `customer_note` on orders delivered > 90 days ago.
- Purge `customers` rows with no orders in 24 months.

---

## Smaller items

| | |
|---|---|
| **QR code for the store link** | The share sheet has copy + WhatsApp but no QR. Merchants will want to print one. Needs a decision first: add a small dependency (~20KB) and update the README's "zero runtime dependencies" claim, or hand-roll ~300 lines of Reed–Solomon. There is a pending task chip for this. |
| **Login error auto-dismiss** | [app/login/page.tsx:54](app/login/page.tsx) clears errors after 1200ms. Fine for "PIN incorrect", too fast to read "try again in 5 minutes" from the new lockout. |
| **Legacy stripped phone numbers** | Orders placed before the phone fix stored the normalized form. Original input wasn't kept, so it can't be recovered. Optional heuristic, verify before committing: `update orders set customer_phone = '0' \|\| customer_phone where length(customer_phone) = 10;` |
| **Storage orphan janitor** | Un-publishing a product deletes its `store_products` row but leaves the image in the `store-images` bucket. Each is ~15KB, so this is cost hygiene, not urgent. |
| **Slug changes break printed links** | No alias table — changing a slug kills any QR already stuck on a wall. Currently mitigated only by a warning in the UI. |
| **Duplicate Call affordance** | The order tracking page has a full-width "Call the shop" button and the header now has a Call pill. Harmless, but worth a look. |
| **`.env.local` not committed anywhere** | Neither repo has one on disk. Fine for you, a trap for the next person — `.env.local.example` in both is the reference. |

---

## Deferred to Phase 3

- **Delivery fee is invisible to Reports.** `summarize()` and `dailyRevenue()` in
  [lib/calc.ts](lib/calc.ts) sum `Sale.total`, and the fee deliberately lives on
  the order only. Fixing it properly means extending `Sale` and reworking those
  functions — rider costs stay invisible until then.
- Merchant-managed rider list (names and phones only, no rider accounts or app),
  assignment on dispatch, WhatsApp/SMS address handoff.
- Customer accounts with OTP, so order history follows the person rather than
  the device.
- Opening hours with automatic open/close.
