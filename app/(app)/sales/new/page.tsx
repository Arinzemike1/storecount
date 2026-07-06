"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ProductImage } from "@/components/ui/product-image";
import {
  BoxIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format";
import { cartTotals, checkout, type CartLine } from "@/lib/inventory";
import { useProducts, useSettings } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function NewSalePage() {
  const router = useRouter();
  const products = useProducts();
  const settings = useSettings();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [reviewing, setReviewing] = useState(false);
  const [completing, setCompleting] = useState(false);

  const money = (amount: number) => formatMoney(amount, settings);

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
      const capped = Math.min(Math.max(0, quantity), product.quantity);
      if (capped <= 0) next.delete(product.id);
      else next.set(product.id, capped);
      return next;
    });
  }

  function completeSale() {
    if (lines.length === 0 || completing) return;
    setCompleting(true);
    const sale = checkout(lines);
    router.replace(`/sales/${sale.id}?new=1`);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur pt-safe">
        <div className="flex items-center gap-3 px-5 h-14">
          <h1 className="text-[22px] font-bold tracking-tight text-ink flex-1">
            New Sale
          </h1>
          <button
            onClick={() => router.back()}
            aria-label="Cancel sale"
            className="size-10 rounded-full bg-surface border border-border-strong text-ink-2 flex items-center justify-center active:scale-95 transition-transform"
          >
            <XIcon className="size-5" />
          </button>
        </div>
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
              const soldOut = inCart >= product.quantity;
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
                        {money(product.sellingPrice)} ·{" "}
                        {product.quantity - inCart} left
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
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review & confirm */}
      <Sheet
        open={reviewing}
        onClose={() => setReviewing(false)}
        title="Confirm sale"
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
        <Button full onClick={completeSale} loading={completing}>
          Complete Sale
        </Button>
      </Sheet>
    </div>
  );
}
