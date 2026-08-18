"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertIcon,
  ChevronRightIcon,
  ClockIcon,
  ReceiptIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { startOfToday } from "@/lib/calc";
import { formatDate, formatMoney, formatRelative, formatTime } from "@/lib/format";
import { useOrders, useOrdersNeedingAttention, useStorefront } from "@/lib/orders";
import { useSettings } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/storefront-types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Needs confirming",
  accepted: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Declined",
  cancelled: "Cancelled",
};

function groupByDay(orders: Order[]): { label: string; orders: Order[] }[] {
  const groups: { label: string; orders: Order[] }[] = [];
  const today = startOfToday().toDateString();
  const yesterday = new Date(startOfToday());
  yesterday.setDate(yesterday.getDate() - 1);

  for (const order of orders) {
    const day = new Date(order.placedAt).toDateString();
    const label =
      day === today
        ? "Today"
        : day === yesterday.toDateString()
          ? "Yesterday"
          : formatDate(order.placedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.orders.push(order);
    else groups.push({ label, orders: [order] });
  }
  return groups;
}

function OrderRow({ order, money }: { order: Order; money: (n: number) => string }) {
  const accent =
    order.status === "pending"
      ? "bg-warning-soft text-warning"
      : order.status === "delivered"
        ? "bg-success-soft text-success"
        : order.status === "rejected" || order.status === "cancelled"
          ? "bg-surface-2 text-ink-3"
          : "bg-primary-soft text-primary";

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 first:rounded-t-card last:rounded-b-card"
    >
      <span
        className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}
      >
        {order.status === "pending" ? (
          <ClockIcon className="size-5" />
        ) : order.status === "delivered" ? (
          <ReceiptIcon className="size-5" />
        ) : (
          <TruckIcon className="size-5" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-[15px] truncate">
          {order.customerName}
        </p>
        <p className="text-[13px] text-ink-3 truncate">
          {order.totalQuantity} {order.totalQuantity === 1 ? "item" : "items"} ·{" "}
          {order.status === "pending"
            ? formatRelative(order.placedAt)
            : formatTime(order.placedAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-ink">{money(order.total)}</p>
        <p
          className={`text-[13px] font-medium ${
            order.status === "pending" ? "text-warning" : "text-ink-3"
          }`}
        >
          {STATUS_LABEL[order.status]}
        </p>
      </div>
      <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />
    </Link>
  );
}

export default function OrdersPage() {
  const orders = useOrders();
  const storefront = useStorefront();
  const needsAttention = useOrdersNeedingAttention();
  const settings = useSettings();
  const money = (amount: number) => formatMoney(amount, settings);

  const pending = orders.filter((o) => o.status === "pending");
  const active = orders.filter(
    (o) => o.status === "accepted" || o.status === "out_for_delivery",
  );
  const done = orders.filter(
    (o) =>
      o.status === "delivered" ||
      o.status === "rejected" ||
      o.status === "cancelled",
  );

  return (
    <>
      <PageHeader title="Orders" />
      <main className="flex flex-col gap-5 px-5">
        {needsAttention.length > 0 && (
          <div className="rounded-control bg-warning-soft text-warning px-4 py-3.5 flex gap-3">
            <AlertIcon className="size-5 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-snug">
              <span className="font-semibold">
                {needsAttention.length} confirmed{" "}
                {needsAttention.length === 1 ? "order has" : "orders have"} no
                matching hold on this device.
              </span>{" "}
              They were likely confirmed on another phone. Review them before
              handing over goods — stock may not have been set aside here.
            </p>
          </div>
        )}

        {!storefront ? (
          <EmptyState
            icon={<TruckIcon />}
            title="No online store yet"
            message="Set up your online store and share the link with customers so they can order from you directly."
            action={
              <Link href="/settings">
                <Button size="md">Set up online store</Button>
              </Link>
            }
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<TruckIcon />}
            title="No orders yet"
            message="Share your store link with customers on WhatsApp and their orders will show up here."
            action={
              <Link href="/settings">
                <Button size="md">Share store link</Button>
              </Link>
            }
          />
        ) : (
          <>
            {pending.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[15px] font-bold text-ink flex items-center gap-1.5">
                    <ClockIcon className="size-4 text-warning" />
                    New requests
                  </h2>
                  <p className="text-[13px] font-semibold text-ink-2">
                    {money(pending.reduce((sum, o) => sum + o.total, 0))}
                  </p>
                </div>
                <Card className="divide-y divide-border">
                  {pending.map((order) => (
                    <OrderRow key={order.id} order={order} money={money} />
                  ))}
                </Card>
              </section>
            )}

            {active.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-[15px] font-bold text-ink px-0.5">
                  In progress
                </h2>
                <Card className="divide-y divide-border">
                  {active.map((order) => (
                    <OrderRow key={order.id} order={order} money={money} />
                  ))}
                </Card>
              </section>
            )}

            {groupByDay(done).map(({ label, orders: dayOrders }) => (
              <section key={label} className="flex flex-col gap-2.5">
                <h2 className="text-[15px] font-bold text-ink px-0.5">{label}</h2>
                <Card className="divide-y divide-border">
                  {dayOrders.map((order) => (
                    <OrderRow key={order.id} order={order} money={money} />
                  ))}
                </Card>
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
