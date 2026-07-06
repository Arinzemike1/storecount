# StoreCount

A mobile-first PWA that helps small business owners track inventory, ring up
customer bills in seconds, and see revenue and profit without manual math.

## Features

- **Multi-step onboarding** — name → contact → 4-digit PIN → done
- **PIN lock** — PBKDF2-hashed PIN, remembered device unlocks with PIN only
- **Dashboard** — revenue, profit, sales today/this week, restock warnings,
  recent activity, quick actions
- **Products** — add/edit/delete with optional photo, category, cost & selling
  price (profit per unit computed live), search and stock-status filters
- **New Sale** — tap-to-add cart, quantity steppers capped by stock, instant
  totals, checkout reduces inventory and records revenue + profit
- **Receipts** — itemized, with transaction reference, date, time, and profit
- **Reports** — today/week/month revenue & profit, 7-day revenue chart, top
  sellers, most profitable, restock list
- **Settings** — profile, business name, change PIN, lock, erase data
- **PWA** — installable (manifest + icons), offline via service worker

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · zero runtime dependencies
beyond React.

## Getting started

```bash
npm install
npm run dev
```

Production:

```bash
npm run build && npm start
```

App icons are generated procedurally (no design tooling needed):

```bash
node scripts/generate-icons.mjs
```

## Architecture

- **Design tokens** — all colors, radii, and shadows are CSS variables in
  [app/globals.css](app/globals.css); re-branding is a one-file change.
- **Data layer** — [lib/storage.ts](lib/storage.ts) defines a `StorageAdapter`
  interface (localStorage today; IndexedDB or a synced backend later without
  touching UI). [lib/store.ts](lib/store.ts) provides tiny observable stores
  consumed through `useSyncExternalStore` hooks.
- **Domain logic** — pure functions in [lib/calc.ts](lib/calc.ts) (aggregations,
  stock status) and [lib/inventory.ts](lib/inventory.ts) (CRUD + checkout
  transaction). Sales snapshot price/cost at checkout so history stays correct
  when products change.
- **Auth** — [lib/auth.ts](lib/auth.ts): PIN hashed with PBKDF2 + random salt
  via WebCrypto; unlock state lives in sessionStorage so closing the app locks
  it.
- **UI kit** — small reusable components in [components/ui/](components/ui/)
  (Button, Card, Field, Sheet, PinInput, StatCard, icons…), all styled through
  the tokens.

All data is stored on-device, which is what makes the app fully functional
offline once installed.
