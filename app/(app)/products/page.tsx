"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StockBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductImage } from "@/components/ui/product-image";
import { Button } from "@/components/ui/button";
import { BoxIcon, PlusIcon, SearchIcon, StoreIcon } from "@/components/ui/icons";
import { stockStatus } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { updateProduct } from "@/lib/inventory";
import { useStorefront } from "@/lib/orders";
import { useProducts, useSettings } from "@/lib/store";
import type { StockStatus } from "@/lib/types";

type Filter = "all" | StockStatus | "online";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in-stock", label: "In Stock" },
  { id: "low-stock", label: "Low Stock" },
  { id: "out-of-stock", label: "Out of Stock" },
];

export default function ProductsPage() {
  const products = useProducts();
  const settings = useSettings();
  const storefront = useStorefront();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === "online") {
        if (!product.published) return false;
      } else if (filter !== "all" && stockStatus(product, settings) !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q)
      );
    });
  }, [products, settings, query, filter]);

  // Publishing 40 products one form at a time is a real onboarding cliff.
  const chips = storefront
    ? [...filters, { id: "online" as Filter, label: "Sell online" }]
    : filters;

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyPublish(published: boolean) {
    for (const id of selected) updateProduct(id, { published });
    setSelected(new Set());
    setSelecting(false);
  }

  return (
    <>
      <PageHeader
        title="Products"
        action={
          <Link
            href="/products/new"
            aria-label="Add product"
            className="size-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-card active:scale-95 transition-transform"
          >
            <PlusIcon className="size-5" strokeWidth={2.2} />
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-5">
        {products.length === 0 ? (
          <EmptyState
            icon={<BoxIcon />}
            title="No products yet"
            message="Add the items you sell to start tracking stock and recording sales."
            action={
              <Link href="/products/new">
                <Button size="md">
                  <PlusIcon className="size-5" /> Add your first product
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Search */}
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

            {/* Stock filter chips */}
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
              {chips.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
                    filter === id
                      ? "bg-ink text-white border-ink"
                      : "bg-surface text-ink-2 border-border-strong"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {storefront && (
              <div className="flex items-center justify-between gap-3 -mt-1">
                <p className="text-[13px] text-ink-3">
                  {selecting
                    ? `${selected.size} selected`
                    : `${products.filter((p) => p.published).length} of ${products.length} online`}
                </p>
                <button
                  onClick={() => {
                    setSelecting((s) => !s);
                    setSelected(new Set());
                  }}
                  className="text-[13px] font-semibold text-primary"
                >
                  {selecting ? "Done" : "Select"}
                </button>
              </div>
            )}

            {visible.length === 0 ? (
              <p className="text-center text-[15px] text-ink-2 py-12">
                No products match your search.
              </p>
            ) : (
              <Card className="divide-y divide-border animate-fade-in">
                {visible.map((product) => {
                  const status = stockStatus(product, settings);
                  const rowClass =
                    "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2 first:rounded-t-card last:rounded-b-card";

                  const body = (
                    <>
                      {selecting && (
                        <span
                          aria-hidden
                          className={`size-5 rounded-md border-2 shrink-0 flex items-center justify-center ${
                            selected.has(product.id)
                              ? "bg-primary border-primary text-on-primary"
                              : "border-border-strong"
                          }`}
                        >
                          {selected.has(product.id) && (
                            <span className="size-2 rounded-sm bg-current" />
                          )}
                        </span>
                      )}
                      <ProductImage product={product} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-[15px] truncate">
                          {product.name}
                        </p>
                        <p
                          className={`text-[13px] ${
                            status === "out-of-stock"
                              ? "text-danger font-medium"
                              : status === "low-stock"
                                ? "text-warning font-medium"
                                : "text-ink-3"
                          }`}
                        >
                          {product.quantity} left
                          {product.category ? ` · ${product.category}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-semibold text-ink">
                          {formatMoney(product.sellingPrice, settings)}
                        </p>
                        {product.published && storefront ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <StoreIcon className="size-3.5" /> Online
                          </span>
                        ) : (
                          <StockBadge status={status} />
                        )}
                      </div>
                    </>
                  );

                  return selecting ? (
                    <button
                      key={product.id}
                      onClick={() => toggleSelected(product.id)}
                      aria-pressed={selected.has(product.id)}
                      className={rowClass}
                    >
                      {body}
                    </button>
                  ) : (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className={rowClass}
                    >
                      {body}
                    </Link>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </main>

      {selecting && selected.size > 0 && (
        <div className="fixed bottom-20 inset-x-0 z-30 bg-transparent backdrop-blur pb-safe">
          <div className="mx-auto max-w-md flex gap-3 px-5 py-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => applyPublish(false)}
            >
              Take offline
            </Button>
            <Button className="flex-1" onClick={() => applyPublish(true)}>
              Sell online
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
