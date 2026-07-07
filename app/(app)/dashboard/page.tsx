"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProductImage } from "@/components/ui/product-image";
import {
  AlertIcon,
  BoxIcon,
  CartIcon,
  ChevronRightIcon,
  PlusIcon,
  ReceiptIcon,
  TrendUpIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  salesSince,
  startOfToday,
  startOfWeek,
  stockStatus,
  summarize,
} from "@/lib/calc";
import { formatMoney, formatRelative } from "@/lib/format";
import { useProducts, useProfile, useSales, useSettings } from "@/lib/store";

export default function DashboardPage() {
  const profile = useProfile();
  const products = useProducts();
  const sales = useSales();
  const settings = useSettings();

  const allTime = summarize(sales);
  const today = summarize(salesSince(sales, startOfToday()));
  const week = summarize(salesSince(sales, startOfWeek()));

  const lowStock = products.filter(
    (p) => stockStatus(p, settings) === "low-stock",
  );
  const outOfStock = products.filter(
    (p) => stockStatus(p, settings) === "out-of-stock",
  );

  const recentSales = sales.slice(0, 3);
  const recentProducts = products.slice(0, 3);
  const money = (amount: number) => formatMoney(amount, settings);

  return (
    <main className="flex flex-col gap-6 px-5 pt-safe animate-fade-in">
      <header className="pt-5 flex items-center justify-between">
        <div>
          <p className="text-[15px] text-ink-2">{greeting()},</p>
          <h1 className="text-[24px] font-bold capitalize tracking-tight text-ink leading-tight">
            {profile?.firstName ?? "there"}
            {settings.businessName ? ` · ${settings.businessName}` : ""}
          </h1>
        </div>
        <Link
          href="/sales/new"
          className="flex items-center gap-1.5 h-11 px-4 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-card active:scale-95 transition-transform"
        >
          <PlusIcon className="size-4.5" strokeWidth={2.4} />
          New Sale
        </Link>
      </header>

      {/* Business health at a glance */}
      <section aria-label="Business summary" className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Revenue"
          value={money(allTime.revenue)}
          icon={<TrendUpIcon className="size-5" />}
          gradient="linear-gradient(135deg, #1c4b36, #059669)"
        />
        <StatCard
          label="Total Profit"
          value={money(allTime.profit)}
          icon={<WalletIcon className="size-5" />}
          gradient="linear-gradient(135deg, #7c3aed, #db2777)"
        />
        <StatCard
          label="Sales Today"
          value={String(today.count)}
          sub={today.count > 0 ? money(today.revenue) : "No sales yet today"}
          icon={<CartIcon className="size-5" />}
          gradient="linear-gradient(135deg, #ea580c, #f59e0b)"
        />
        <StatCard
          label="Sales This Week"
          value={String(week.count)}
          sub={week.count > 0 ? money(week.revenue) : "No sales this week"}
          icon={<ReceiptIcon className="size-5" />}
          gradient="linear-gradient(135deg, #2563eb, #0891b2)"
        />
        <StatCard
          label="Products"
          value={String(products.length)}
          icon={<BoxIcon className="size-5" />}
          gradient="linear-gradient(135deg, #0d9488, #65a30d)"
        />
        <StatCard
          label="Needs Restock"
          value={String(lowStock.length + outOfStock.length)}
          sub={
            outOfStock.length > 0
              ? `${outOfStock.length} out of stock`
              : lowStock.length > 0
                ? `${lowStock.length} running low`
                : "All stocked up"
          }
          icon={<AlertIcon className="size-5" />}
          tone={
            outOfStock.length > 0
              ? "danger"
              : lowStock.length > 0
                ? "warning"
                : "primary"
          }
          gradient="linear-gradient(135deg, #e11d48, #9333ea)"
        />
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-3 gap-3">
        <QuickAction
          href="/sales/new"
          label="New Sale"
          icon={<CartIcon className="size-6" />}
          primary
        />
        <QuickAction
          href="/products/new"
          label="Add Product"
          icon={<PlusIcon className="size-6" />}
        />
        <QuickAction
          href="/products"
          label="Inventory"
          icon={<BoxIcon className="size-6" />}
        />
      </section>

      {/* Recent sales */}
      <section aria-label="Recent sales" className="flex flex-col gap-3">
        <SectionHeading
          title="Recent Sales"
          href="/sales"
          show={sales.length > 0}
        />
        {recentSales.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-[15px] text-ink-2">
              No sales recorded yet. Tap{" "}
              <span className="font-semibold text-primary">New Sale</span> to
              ring up your first customer.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {recentSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}`}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 first:rounded-t-card last:rounded-b-card"
              >
                <span className="size-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <ReceiptIcon className="size-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-[15px] truncate">
                    {sale.totalQuantity}{" "}
                    {sale.totalQuantity === 1 ? "item" : "items"}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {formatRelative(sale.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink">{money(sale.total)}</p>
                  <p className="text-[13px] text-success font-medium">
                    +{money(sale.profit)} profit
                  </p>
                </div>
                <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* Recently added products */}
      {recentProducts.length > 0 && (
        <section
          aria-label="Recently added products"
          className="flex flex-col gap-3 pb-4"
        >
          <SectionHeading title="Recent Products" href="/products" show />
          <Card className="divide-y divide-border">
            {recentProducts.map((product) => (
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
                    {product.quantity} in stock
                  </p>
                </div>
                <p className="font-semibold text-ink">
                  {money(product.sellingPrice)}
                </p>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </main>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeading({
  title,
  href,
  show,
}: {
  title: string;
  href: string;
  show: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      {show && (
        <Link
          href={href}
          className="text-sm font-semibold text-primary py-1 px-2 -mr-2"
        >
          See all
        </Link>
      )}
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-2 rounded-card py-4 shadow-card border transition-transform active:scale-95 ${
        primary
          ? "bg-primary text-on-primary border-transparent"
          : "bg-surface text-ink border-border"
      }`}
    >
      <span className={primary ? "" : "text-primary"}>{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </Link>
  );
}
