"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { StockBadge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { CartIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { profitPerUnit, stockStatus } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import { deleteProduct } from "@/lib/inventory";
import { useProducts, useSettings } from "@/lib/store";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const products = useProducts();
  const settings = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const product = products.find((p) => p.id === id);
  if (!product) {
    return (
      <>
        <PageHeader title="Product" back />
        <p className="text-center text-[15px] text-ink-2 py-12 px-6">
          This product no longer exists.
        </p>
      </>
    );
  }

  const money = (amount: number) => formatMoney(amount, settings);
  const unitProfit = profitPerUnit(product);

  return (
    <>
      <PageHeader
        title="Product Details"
        back
        action={
          <Link
            href={`/products/${product.id}/edit`}
            aria-label="Edit product"
            className="size-10 rounded-full bg-surface border border-border-strong text-ink flex items-center justify-center active:scale-95 transition-transform"
          >
            <PencilIcon className="size-5" />
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-5 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-3 pt-2 pb-1">
          <ProductImage product={product} size="lg" />
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-ink">
              {product.name}
            </h2>
            {product.category && (
              <p className="text-[14px] text-ink-2 mt-0.5">{product.category}</p>
            )}
          </div>
          <StockBadge status={stockStatus(product, settings)} />
        </div>

        <Card className="divide-y divide-border">
          <DetailRow label="Selling Price" value={money(product.sellingPrice)} bold />
          <DetailRow label="Cost Price" value={money(product.costPrice)} />
          <DetailRow
            label="Profit per Unit"
            value={`${unitProfit < 0 ? "−" : ""}${money(Math.abs(unitProfit))}`}
            tone={unitProfit >= 0 ? "success" : "danger"}
          />
          <DetailRow label="Quantity in Stock" value={String(product.quantity)} bold />
          <DetailRow
            label="Stock Value (at cost)"
            value={money(product.costPrice * product.quantity)}
          />
          <DetailRow label="Added" value={formatDate(product.createdAt)} />
        </Card>

        <Link href="/sales/new" className="block">
          <Button full variant="secondary">
            <CartIcon className="size-5" /> Sell this product
          </Button>
        </Link>

        <Button
          full
          variant="danger-soft"
          onClick={() => setConfirmDelete(true)}
        >
          <TrashIcon className="size-5" /> Delete Product
        </Button>
      </main>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this product?"
      >
        <p className="text-[15px] text-ink-2 pb-5">
          <span className="font-semibold text-ink">{product.name}</span> will be
          removed from your inventory. Past sales are kept.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            full
            variant="danger"
            onClick={() => {
              deleteProduct(product.id);
              router.replace("/products");
            }}
          >
            Yes, delete it
          </Button>
          <Button full variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function DetailRow({
  label,
  value,
  bold = false,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-[15px] text-ink-2">{label}</span>
      <span
        className={`text-[15px] ${bold ? "font-bold" : "font-semibold"} ${
          tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
