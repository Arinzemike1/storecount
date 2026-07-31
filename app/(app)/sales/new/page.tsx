"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ProductImage } from "@/components/ui/product-image";
import {
  BoxIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format";
import {
  cartTotals,
  checkout,
  checkoutPendingSale,
  discardPendingSale,
  savePendingSale,
  type CartLine,
} from "@/lib/inventory";
import { usePendingSales, useProducts, useSettings } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function NewSalePage() {
  return (
    <Suspense>
      <NewSale />
    </Suspense>
  );
}

function NewSale() {
  const router = useRouter();
  const products = useProducts();
  const settings = useSettings();
  const pendingSales = usePendingSales();
  const pendingId = useSearchParams().get("pending");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState<null | "complete" | "pend">(null);
  const [resumedId, setResumedId] = useState<string | null>(null);
  // Quantities this hold already took off the shelf. They stay available to
  // this customer, so effective stock = live stock + reserved.
  const [reserved, setReserved] = useState<Map<string, number>>(new Map());

  const money = (amount: number) => formatMoney(amount, settings);

  // Resume a held sale exactly once, after its record hydrates on the client.
  // Adjusting state during render (rather than in an effect) keeps the first
  // paint in sync with the server and avoids a cascading re-render.
  if (pendingId && resumedId !== pendingId) {
    const pending = pendingSales.find((p) => p.id === pendingId);
    if (pending) {
      // Load the reserved quantities, dropping products that no longer exist.
      const next = new Map<string, number>();
      for (const item of pending.items) {
        if (!products.some((p) => p.id === item.productId)) continue;
        next.set(item.productId, item.quantity);
      }
      setResumedId(pendingId);
      setCart(next);
      setReserved(next);
      setCustomerName(pending.customerName ?? "");
    }
  }

  // Units sellable to this order: on-shelf stock plus anything this hold has
  // already reserved for the customer.
  const maxFor = (product: Product) =>
    product.quantity + (reserved.get(product.id) ?? 0);

  const sellable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => p.quantity > 0 || cart.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, query, cart]);

  const lines: CartLine[] = useMemo(
    () =>
      [...cart.entries()]
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((line): line is CartLine => line !== null),
    [cart, products],
  );

  const totals = cartTotals(lines);

  function setQuantity(product: Product, quantity: number) {
    setCart((current) => {
      const next = new Map(current);
      const capped = Math.min(Math.max(0, quantity), maxFor(product));
      if (capped <= 0) next.delete(product.id);
      else next.set(product.id, capped);
      return next;
    });
  }

  function completeSale() {
    if (lines.length === 0 || busy) return;
    setBusy("complete");
    const sale = pendingId
      ? checkoutPendingSale(pendingId, lines)
      : checkout(lines);
    router.replace(`/sales/${sale.id}?new=1`);
  }

  function pendSale() {
    if (lines.length === 0 || busy) return;
    setBusy("pend");
    savePendingSale(lines, customerName, pendingId ?? undefined);
    router.replace("/sales");
  }

  function discardPending() {
    if (!pendingId || busy) return;
    discardPendingSale(pendingId);
    router.replace("/sales");
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur pt-safe">
        <div className="flex items-center gap-3 px-5 h-14">
          <h1 className="text-[22px] font-bold tracking-tight text-ink flex-1">
            {pendingId ? "Resume Sale" : "New Sale"}
          </h1>
          <button
            onClick={() => router.back()}
            aria-label="Cancel sale"
            className="size-10 rounded-full bg-surface border border-border-strong text-ink-2 flex items-center justify-center active:scale-95 transition-transform"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        {pendingId && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 rounded-control bg-warning-soft text-warning px-4 h-11 text-[14px] font-medium">
              <ClockIcon className="size-4 shrink-0" />
              <span className="truncate">
                Held sale{customerName ? ` · ${customerName}` : ""} — edit, then
                complete or update.
              </span>
            </div>
          </div>
        )}
        {products.length > 0 && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2.5 bg-surface border border-border-strong rounded-control px-4 h-12 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
              <SearchIcon className="size-5 text-ink-3 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-transparent text-[16px] text-ink placeholder:text-ink-3 outline-none"
              />
            </div>
          </div>
        )}
      </header>

      {/* Product list */}
      <main className="flex-1 px-5 pb-44">
        {products.length === 0 ? (
          <EmptyState
            icon={<BoxIcon />}
            title="Nothing to sell yet"
            message="Add products to your inventory first, then record sales here."
            action={
              <Link href="/products/new">
                <Button size="md">Add a product</Button>
              </Link>
            }
          />
        ) : sellable.length === 0 ? (
          <p className="text-center text-[15px] text-ink-2 py-12">
            {query
              ? "No products match your search."
              : "Everything is out of stock."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sellable.map((product) => {
              const inCart = cart.get(product.id) ?? 0;
              const available = maxFor(product);
              const soldOut = inCart >= available;
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 bg-surface rounded-card border px-3.5 py-3 transition-colors ${
                    inCart > 0 ? "border-primary/40 shadow-card" : "border-border"
                  }`}
                >
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:opacity-100"
                    onClick={() => setQuantity(product, inCart + 1)}
                    disabled={soldOut}
                    aria-label={`Add ${product.name} to sale`}
                  >
                    <ProductImage product={product} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-[15px] truncate">
                        {product.name}
                      </p>
                      <p className="text-[13px] text-ink-3">
                        {money(product.sellingPrice)} · {available - inCart} left
                      </p>
                    </div>
                  </button>

                  {inCart === 0 ? (
                    <button
                      onClick={() => setQuantity(product, 1)}
                      aria-label={`Add ${product.name}`}
                      className="size-10 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-90 transition-transform shrink-0"
                    >
                      <PlusIcon className="size-5" strokeWidth={2.2} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setQuantity(product, inCart - 1)}
                        aria-label={`Remove one ${product.name}`}
                        className="size-10 rounded-full bg-surface-2 border border-border-strong text-ink flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <MinusIcon className="size-4" strokeWidth={2.4} />
                      </button>
                      <span className="w-8 text-center font-bold text-ink tabular-nums">
                        {inCart}
                      </span>
                      <button
                        onClick={() => setQuantity(product, inCart + 1)}
                        disabled={soldOut}
                        aria-label={`Add one more ${product.name}`}
                        className="size-10 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-90 transition-transform disabled:bg-border-strong disabled:text-ink-3"
                      >
                        <PlusIcon className="size-4" strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart summary bar */}
      {totals.totalQuantity > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border shadow-float pb-safe animate-fade-up">
          <div className="mx-auto max-w-md px-5 py-4 flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] text-ink-2">
                  {totals.totalQuantity}{" "}
                  {totals.totalQuantity === 1 ? "item" : "items"} · Subtotal
                </p>
                <p className="text-2xl font-bold tracking-tight text-ink">
                  {money(totals.total)}
                </p>
              </div>
              <Button size="md" onClick={() => setReviewing(true)}>
                Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review & confirm */}
      <Sheet
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={pendingId ? "Resume sale" : "Confirm sale"}
      >
        <div className="divide-y divide-border">
          {lines.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-3 py-3">
              <span className="size-8 rounded-lg bg-primary-soft text-primary text-[13px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                {quantity}×
              </span>
              <p className="flex-1 min-w-0 font-medium text-ink text-[15px] truncate">
                {product.name}
              </p>
              <p className="font-semibold text-ink tabular-nums">
                {money(product.sellingPrice * quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between py-4 border-t border-border-strong mt-1">
          <p className="text-[15px] font-semibold text-ink-2">Grand Total</p>
          <p className="text-2xl font-bold tracking-tight text-ink">
            {money(totals.total)}
          </p>
        </div>

        {/* Optional customer label for a hold */}
        <label className="flex flex-col gap-1.5 mb-4">
          <span className="text-sm font-medium text-ink-2">
            Customer{" "}
            <span className="text-ink-3 font-normal">
              (for pay-later holds)
            </span>
          </span>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Name or phone — optional"
            className="h-13 w-full bg-surface border border-border-strong rounded-control px-4 text-[16px] text-ink placeholder:text-ink-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
          />
        </label>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-stretch gap-2.5">
            <Button
              full
              variant="secondary"
              onClick={pendSale}
              loading={busy === "pend"}
              className="flex-1"
            >
              <ClockIcon className="size-5" />
              {pendingId ? "Update hold" : "Save for later"}
            </Button>
            <Button
              full
              onClick={completeSale}
              loading={busy === "complete"}
              className="flex-1"
            >
              Complete Sale
            </Button>
          </div>
          {pendingId && (
            <Button full variant="danger-soft" onClick={discardPending}>
              Discard hold
            </Button>
          )}
        </div>
      </Sheet>
    </div>
  );
}
