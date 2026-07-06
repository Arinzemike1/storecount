"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StockBadge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { RevenueChart } from "@/components/reports/revenue-chart";
import {
  ChartIcon,
  TrendUpIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  dailyRevenue,
  mostProfitable,
  salesSince,
  startOfMonth,
  startOfToday,
  startOfWeek,
  stockStatus,
  summarize,
  topSelling,
  type ProductPerformance,
} from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { useProducts, useSales, useSettings } from "@/lib/store";

type Period = "today" | "week" | "month";

const periods: { id: Period; label: string; since: () => Date }[] = [
  { id: "today", label: "Today", since: startOfToday },
  { id: "week", label: "This Week", since: startOfWeek },
  { id: "month", label: "This Month", since: startOfMonth },
];

export default function ReportsPage() {
  const sales = useSales();
  const products = useProducts();
  const settings = useSettings();
  const [period, setPeriod] = useState<Period>("today");

  const money = (amount: number) => formatMoney(amount, settings);
  const selected = periods.find((p) => p.id === period)!;
  const periodSales = salesSince(sales, selected.since());
  const summary = summarize(periodSales);

  const monthSales = salesSince(sales, startOfMonth());
  const bestSellers = topSelling(monthSales, 5);
  const bestEarners = mostProfitable(monthSales, 5);
  const restock = products
    .filter((p) => stockStatus(p, settings) !== "in-stock")
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  if (sales.length === 0 && products.length === 0) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState
          icon={<ChartIcon />}
          title="No data yet"
          message="Add products and record sales — your business insights will appear here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Reports" />
      <main className="flex flex-col gap-5 px-5">
        {/* Period selector */}
        <div
          role="tablist"
          aria-label="Report period"
          className="grid grid-cols-3 bg-surface border border-border rounded-control p-1"
        >
          {periods.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={period === id}
              onClick={() => setPeriod(id)}
              className={`h-10 rounded-[10px] text-[14px] font-semibold transition-colors ${
                period === id ? "bg-ink text-white" : "text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section aria-label="Period summary" className="grid grid-cols-2 gap-3">
          <StatCard
            label={`Revenue ${selected.label}`}
            value={money(summary.revenue)}
            icon={<TrendUpIcon className="size-5" />}
          />
          <StatCard
            label={`Profit ${selected.label}`}
            value={money(summary.profit)}
            icon={<WalletIcon className="size-5" />}
            tone="accent"
            sub={`${summary.count} ${summary.count === 1 ? "sale" : "sales"}`}
          />
        </section>

        {/* Last 7 days */}
        <Card className="p-4">
          <h2 className="text-[15px] font-bold text-ink mb-3">Last 7 Days Revenue</h2>
          <RevenueChart data={dailyRevenue(sales, 7)} settings={settings} />
        </Card>

        <Leaderboard
          title="Top Selling This Month"
          rows={bestSellers}
          value={(row) => `${row.unitsSold} sold`}
          sub={(row) => money(row.revenue)}
        />

        <Leaderboard
          title="Most Profitable This Month"
          rows={bestEarners}
          value={(row) => `+${money(row.profit)}`}
          valueClass="text-success"
          sub={(row) => `${row.unitsSold} sold`}
        />

        {/* Restock list */}
        {restock.length > 0 && (
          <section className="flex flex-col gap-2.5 pb-4">
            <h2 className="text-[17px] font-bold text-ink">Needs Restocking</h2>
            <Card className="divide-y divide-border">
              {restock.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-surface-2 first:rounded-t-card last:rounded-b-card"
                >
                  <ProductImage product={product} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-[15px] truncate">
                      {product.name}
                    </p>
                    <p className="text-[13px] text-ink-3">
                      {product.quantity} left
                    </p>
                  </div>
                  <StockBadge status={stockStatus(product, settings)} />
                </Link>
              ))}
            </Card>
          </section>
        )}
      </main>
    </>
  );
}

function Leaderboard({
  title,
  rows,
  value,
  sub,
  valueClass = "text-ink",
}: {
  title: string;
  rows: ProductPerformance[];
  value: (row: ProductPerformance) => string;
  sub: (row: ProductPerformance) => string;
  valueClass?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      <Card className="divide-y divide-border">
        {rows.map((row, index) => (
          <div key={row.productId} className="flex items-center gap-3 px-4 py-3">
            <span className="size-8 rounded-lg bg-surface-2 text-ink-2 text-[13px] font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <p className="flex-1 min-w-0 font-semibold text-ink text-[15px] truncate">
              {row.name}
            </p>
            <div className="text-right">
              <p className={`font-bold text-[15px] tabular-nums ${valueClass}`}>
                {value(row)}
              </p>
              <p className="text-[13px] text-ink-3 tabular-nums">{sub(row)}</p>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
