"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AcceptSheet } from "@/components/orders/accept-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  PhoneIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import {
  cancelAcceptedOrder,
  deliverOrder,
  dispatchOrder,
  rejectOrder,
  useOrders,
  useOrdersNeedingAttention,
} from "@/lib/orders";
import { resolveOrderLines, reservedFrom, toCartLines } from "@/lib/order-lines";
import { usePendingSales, useProducts, useSettings } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/storefront-types";

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "accepted", label: "Confirmed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

function stageIndex(status: OrderStatus): number {
  const index = TIMELINE.findIndex((stage) => stage.status === status);
  return index === -1 ? 0 : index;
}

function stageTime(order: Order, status: OrderStatus): string | null {
  switch (status) {
    case "pending":
      return order.placedAt;
    case "accepted":
      return order.acceptedAt;
    case "out_for_delivery":
      return order.dispatchedAt;
    case "delivered":
      return order.deliveredAt;
    default:
      return null;
  }
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const orders = useOrders();
  const products = useProducts();
  const pendingSales = usePendingSales();
  const needsAttention = useOrdersNeedingAttention();
  const settings = useSettings();
  const money = (amount: number) => formatMoney(amount, settings);

  const [showAccept, setShowAccept] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reject" | "cancel" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <>
        <PageHeader title="Order" back />
        <EmptyState
          icon={<TruckIcon />}
          title="Order not found"
          message="It may have been removed, or this device hasn't synced yet."
        />
      </>
    );
  }

  const flagged = needsAttention.includes(order.id);
  const hold = order.pendingSaleId
    ? pendingSales.find((p) => p.id === order.pendingSaleId)
    : undefined;

  // Once accepted, the hold has already taken these goods off the shelf, so add
  // them back when checking availability for the final handover.
  const extra = hold ? reservedFrom(hold.items) : undefined;
  const resolved = resolveOrderLines(hold?.items ?? order.items, products, extra);

  const closed =
    order.status === "delivered" ||
    order.status === "rejected" ||
    order.status === "cancelled";
  const current = stageIndex(order.status);

  async function run(action: () => Promise<void>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!order?.deliveryAddress) return;
    try {
      await navigator.clipboard.writeText(order.deliveryAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable — the address is still selectable on screen.
    }
  }

  return (
    <>
      <PageHeader title={order.ref} back />
      <main className="flex flex-col gap-5 px-5 pb-28">
        {flagged && (
          <div className="rounded-control bg-warning-soft text-warning px-4 py-3.5 flex gap-3">
            <AlertIcon className="size-5 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-snug">
              This order was confirmed on another device, so no goods were set
              aside here. Check your stock before handing over.
            </p>
          </div>
        )}

        {/* Status */}
        {order.status === "rejected" || order.status === "cancelled" ? (
          <Card className="px-4 py-3.5">
            <p className="font-semibold text-ink">
              {order.status === "rejected" ? "Declined" : "Cancelled"}
            </p>
            {order.declineReason && (
              <p className="text-[13px] text-ink-3 mt-0.5">{order.declineReason}</p>
            )}
          </Card>
        ) : (
          <Card className="px-4 py-4">
            <ol className="flex flex-col gap-3.5">
              {TIMELINE.map((stage, index) => {
                const reached = index <= current;
                const at = stageTime(order, stage.status);
                return (
                  <li key={stage.status} className="flex items-center gap-3">
                    <span
                      className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                        reached
                          ? "bg-primary text-on-primary"
                          : "bg-surface-2 text-ink-3"
                      }`}
                    >
                      {reached ? (
                        <CheckIcon className="size-4" strokeWidth={2.4} />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span
                      className={`text-[15px] flex-1 ${
                        reached ? "font-semibold text-ink" : "text-ink-3"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {at && (
                      <span className="text-[13px] text-ink-3">
                        {formatTime(at)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* Customer */}
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold text-ink px-0.5">Customer</h2>
          <Card className="divide-y divide-border">
            <div className="px-4 py-3.5">
              <p className="font-semibold text-ink text-[15px]">
                {order.customerName}
              </p>
              <p className="text-[13px] text-ink-3">
                Placed {formatDate(order.placedAt)} at {formatTime(order.placedAt)}
              </p>
            </div>
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2"
            >
              <PhoneIcon className="size-5 text-primary shrink-0" />
              <span className="text-[15px] text-ink flex-1">
                {order.customerPhone}
              </span>
              <span className="text-[13px] font-semibold text-primary">Call</span>
            </a>
            {order.deliveryAddress && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <TruckIcon className="size-5 text-ink-3 shrink-0 mt-0.5" />
                <p className="text-[15px] text-ink flex-1">
                  {order.deliveryAddress}
                </p>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy address"
                  className="flex items-center gap-1 text-[13px] font-semibold text-primary shrink-0"
                >
                  <CopyIcon className="size-4" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            {order.fulfilmentMethod === "pickup" && (
              <p className="px-4 py-3.5 text-[15px] text-ink">
                Collecting from your shop
              </p>
            )}
            {order.customerNote && (
              <p className="px-4 py-3.5 text-[15px] text-ink-2 italic">
                “{order.customerNote}”
              </p>
            )}
          </Card>
        </section>

        {/* Items */}
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold text-ink px-0.5">Items</h2>
          <Card className="divide-y divide-border">
            {resolved.map(({ item, product, issue, maxQuantity }) => (
              <div key={item.productId} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-ink text-[15px] flex-1 min-w-0 truncate">
                    {item.name}
                  </p>
                  <p className="text-[13px] text-ink-3 shrink-0">
                    {item.quantity} × {money(item.price)}
                  </p>
                  <p className="font-semibold text-ink shrink-0 tabular-nums">
                    {money(item.price * item.quantity)}
                  </p>
                </div>
                {!closed && !product && (
                  <p className="text-[13px] text-danger mt-1">
                    No longer in your inventory
                  </p>
                )}
                {!closed && product && issue === "short" && (
                  <p className="text-[13px] text-warning mt-1">
                    Only {maxQuantity} in stock
                  </p>
                )}
              </div>
            ))}
            <div className="px-4 py-3.5 flex flex-col gap-1">
              <div className="flex justify-between text-[13px] text-ink-3">
                <span>Goods</span>
                <span>{money(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-[13px] text-ink-3">
                  <span>Delivery</span>
                  <span>{money(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-[17px] font-bold text-ink pt-1">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
              <p className="text-[13px] text-ink-3">
                {order.paymentStatus === "paid"
                  ? "Paid"
                  : order.paymentMethod === "online"
                    ? "Awaiting online payment"
                    : "Pay on delivery"}
              </p>
            </div>
          </Card>
        </section>

        {order.saleRef && (
          <p className="text-[13px] text-ink-3 px-0.5">
            Recorded as sale {order.saleRef}
          </p>
        )}

        {error && (
          <p className="text-[13px] text-danger font-medium px-0.5" role="alert">
            {error}
          </p>
        )}
      </main>

      {/* Action bar */}
      {!closed && (
        <div className="fixed bottom-20 inset-x-0 z-30 bg-transparent backdrop-blur pb-safe">
          <div className="mx-auto max-w-md flex gap-3 px-5 py-3">
            {order.status === "pending" && (
              <>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setConfirmAction("reject")}
                >
                  Decline
                </Button>
                <Button className="flex-1" onClick={() => setShowAccept(true)}>
                  Confirm
                </Button>
              </>
            )}
            {order.status === "accepted" && (
              <>
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setConfirmAction("cancel")}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  loading={busy}
                  onClick={() => run(() => dispatchOrder(order))}
                >
                  {order.fulfilmentMethod === "pickup" ? "Ready" : "Send out"}
                </Button>
              </>
            )}
            {order.status === "out_for_delivery" && (
              <Button
                full
                loading={busy}
                onClick={() =>
                  run(
                    () => deliverOrder(order, toCartLines(resolved)),
                    () => router.replace("/orders"),
                  )
                }
              >
                Delivered &amp; paid
              </Button>
            )}
          </div>
        </div>
      )}

      <AcceptSheet
        order={order}
        open={showAccept}
        onClose={() => setShowAccept(false)}
        onAccepted={() => setShowAccept(false)}
      />

      <Sheet
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "reject" ? "Decline order?" : "Cancel order?"}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-ink-2">
            {confirmAction === "reject"
              ? `${order.customerName} will see that you couldn't take this order. No stock is affected.`
              : `${order.customerName} will see this order was cancelled, and the goods you set aside go back into stock.`}
          </p>
          <Button
            full
            variant="danger"
            loading={busy}
            onClick={() =>
              run(
                () =>
                  confirmAction === "reject"
                    ? rejectOrder(order)
                    : cancelAcceptedOrder(order),
                () => {
                  setConfirmAction(null);
                  router.replace("/orders");
                },
              )
            }
          >
            {confirmAction === "reject" ? "Decline order" : "Cancel order"}
          </Button>
          <Button full variant="ghost" onClick={() => setConfirmAction(null)}>
            Keep it
          </Button>
        </div>
      </Sheet>
    </>
  );
}
