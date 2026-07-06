"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useSales, useSettings } from "@/lib/store";

export default function ReceiptPage() {
  return (
    <Suspense>
      <Receipt />
    </Suspense>
  );
}

function Receipt() {
  const { id } = useParams<{ id: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const sales = useSales();
  const settings = useSettings();

  const sale = sales.find((s) => s.id === id);
  if (!sale) {
    return (
      <>
        <PageHeader title="Receipt" back />
        <p className="text-center text-[15px] text-ink-2 py-12 px-6">
          This receipt no longer exists.
        </p>
      </>
    );
  }

  const money = (amount: number) => formatMoney(amount, settings);

  return (
    <>
      <PageHeader title={isNew ? "Sale Complete" : "Receipt"} back={!isNew} />
      <main className="flex flex-col gap-5 px-5 pb-6 animate-fade-up">
        {isNew && (
          <div className="flex flex-col items-center text-center gap-2 pt-2">
            <span className="size-16 rounded-full bg-success-soft text-success flex items-center justify-center animate-pop">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7" className="animate-draw-check" />
              </svg>
            </span>
            <p className="text-[15px] text-ink-2">
              Sale recorded — you made{" "}
              <span className="font-bold text-success">{money(sale.profit)}</span>{" "}
              profit.
            </p>
          </div>
        )}

        {/* Receipt card */}
        <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 text-center border-b border-dashed border-border-strong">
            {settings.businessName && (
              <p className="text-[17px] font-bold text-ink">
                {settings.businessName}
              </p>
            )}
            <p className="text-[13px] text-ink-3 mt-0.5 font-mono">{sale.ref}</p>
            <p className="text-[13px] text-ink-2 mt-1">
              {formatDate(sale.createdAt)} · {formatTime(sale.createdAt)}
            </p>
          </div>

          <div className="divide-y divide-border px-5">
            {sale.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-[15px] truncate">
                    {item.name}
                  </p>
                  <p className="text-[13px] text-ink-3 tabular-nums">
                    {item.quantity} × {money(item.price)}
                  </p>
                </div>
                <p className="font-semibold text-ink tabular-nums">
                  {money(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-dashed border-border-strong flex flex-col gap-1.5">
            <div className="flex justify-between text-[14px] text-ink-2">
              <span>Items</span>
              <span className="tabular-nums">{sale.totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-semibold text-ink">Total</span>
              <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                {money(sale.total)}
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-2">Profit</span>
              <span className="font-semibold text-success tabular-nums">
                +{money(sale.profit)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isNew && (
            <Link href="/sales/new" className="block">
              <Button full variant="secondary">
                Start Another Sale
              </Button>
            </Link>
          )}
          <Link href="/dashboard" className="block">
            <Button full variant={isNew ? "primary" : "secondary"}>
              Done
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
