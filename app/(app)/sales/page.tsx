"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  CartIcon,
  ChevronRightIcon,
  PlusIcon,
  ReceiptIcon,
} from "@/components/ui/icons";
import { startOfToday } from "@/lib/calc";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useSales, useSettings } from "@/lib/store";
import type { Sale } from "@/lib/types";

/** Groups sales (already newest-first) into day buckets for scannable history. */
function groupByDay(sales: Sale[]): { label: string; sales: Sale[] }[] {
  const groups: { label: string; sales: Sale[] }[] = [];
  const today = startOfToday().toDateString();
  const yesterday = new Date(startOfToday());
  yesterday.setDate(yesterday.getDate() - 1);

  for (const sale of sales) {
    const day = new Date(sale.createdAt).toDateString();
    const label =
      day === today
        ? "Today"
        : day === yesterday.toDateString()
          ? "Yesterday"
          : formatDate(sale.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.sales.push(sale);
    else groups.push({ label, sales: [sale] });
  }
  return groups;
}

export default function SalesPage() {
  const sales = useSales();
  const settings = useSettings();
  const money = (amount: number) => formatMoney(amount, settings);

  return (
    <>
      <PageHeader
        title="Sales"
        action={
          <Link
            href="/sales/new"
            aria-label="New sale"
            className="size-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-card active:scale-95 transition-transform"
          >
            <PlusIcon className="size-5" strokeWidth={2.2} />
          </Link>
        }
      />
      <main className="flex flex-col gap-5 px-5">
        {sales.length === 0 ? (
          <EmptyState
            icon={<CartIcon />}
            title="No sales yet"
            message="Record your first sale and it will show up here with the profit you made."
            action={
              <Link href="/sales/new">
                <Button size="md">
                  <PlusIcon className="size-5" /> New Sale
                </Button>
              </Link>
            }
          />
        ) : (
          groupByDay(sales).map(({ label, sales: daySales }) => (
            <section key={label} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-[15px] font-bold text-ink">{label}</h2>
                <p className="text-[13px] font-semibold text-ink-2">
                  {money(daySales.reduce((sum, s) => sum + s.total, 0))}
                </p>
              </div>
              <Card className="divide-y divide-border">
                {daySales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 first:rounded-t-card last:rounded-b-card"
                  >
                    <span className="size-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <ReceiptIcon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-[15px]">
                        {sale.totalQuantity}{" "}
                        {sale.totalQuantity === 1 ? "item" : "items"}
                      </p>
                      <p className="text-[13px] text-ink-3">
                        {formatTime(sale.createdAt)} · {sale.ref}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">{money(sale.total)}</p>
                      <p className="text-[13px] text-success font-medium">
                        +{money(sale.profit)}
                      </p>
                    </div>
                    <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />
                  </Link>
                ))}
              </Card>
            </section>
          ))
        )}
      </main>
    </>
  );
}
