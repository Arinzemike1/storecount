"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/format";
import { acceptOrder } from "@/lib/orders";
import { resolveOrderLines, toCartLines } from "@/lib/order-lines";
import { useProducts, useSettings } from "@/lib/store";
import type { Order } from "@/lib/storefront-types";

interface AcceptSheetProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

/**
 * Confirming an order is where reality and the storefront's stale stock hint
 * get reconciled. Quantities are read-only — the merchant confirms what the
 * customer actually asked for — but every mismatch is shown rather than
 * silently resolved, and anything that genuinely cannot be supplied must be
 * removed explicitly.
 */
export function AcceptSheet({ order, open, onClose, onAccepted }: AcceptSheetProps) {
  const products = useProducts();
  const settings = useSettings();
  const money = (amount: number) => formatMoney(amount, settings);

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Honour the ordered quantity rather than clamping it to live stock. If stock
  // is genuinely short, adjustStock records what actually left the shelf, so
  // the numbers stay honest either way.
  const resolved = resolveOrderLines(order.items, products).map((line) => ({
    ...line,
    quantity: line.item.quantity,
  }));

  const kept = resolved.filter((line) => !removed.has(line.item.productId));
  const usable = kept.filter((line) => line.product);
  const subtotal = usable.reduce(
    (sum, line) => sum + line.item.price * line.item.quantity,
    0,
  );

  function remove(productId: string) {
    setRemoved((current) => new Set(current).add(productId));
  }

  async function confirm() {
    if (usable.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await acceptOrder(order, toCartLines(usable));
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm order");
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Confirm order">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-3">
          Confirming sets these goods aside for {order.customerName}.
        </p>

        {kept.map(({ item, product, issue, maxQuantity }) => {
          const unavailable = !product || maxQuantity === 0;

          const tone = unavailable
            ? "border-danger/30 bg-danger-soft"
            : issue === "short"
              ? "border-warning/30 bg-warning-soft"
              : "border-border-strong bg-surface";

          return (
            <div
              key={item.productId}
              className={`rounded-control border px-4 py-3 ${tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink text-[15px] truncate">
                    {item.name}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {item.quantity} × {money(item.price)}
                  </p>
                </div>

                {unavailable ? (
                  <Button
                    size="sm"
                    variant="danger-soft"
                    onClick={() => remove(item.productId)}
                  >
                    Remove
                  </Button>
                ) : (
                  <p className="font-bold text-ink tabular-nums shrink-0">
                    {money(item.price * item.quantity)}
                  </p>
                )}
              </div>

              {!product && (
                <p className="mt-2 text-[13px] font-medium text-danger">
                  No longer in your inventory.
                </p>
              )}
              {product && maxQuantity === 0 && (
                <p className="mt-2 text-[13px] font-medium text-danger">
                  You have none of this left.
                </p>
              )}
              {product && issue === "short" && maxQuantity > 0 && (
                <p className="mt-2 text-[13px] font-medium text-warning">
                  Only {maxQuantity} in stock — they ordered {item.quantity}.
                </p>
              )}
              {product && issue === "price" && (
                <p className="mt-2 text-[13px] text-ink-3">
                  They were charged {money(item.price)} · your price is now{" "}
                  {money(product.sellingPrice)}. You&apos;ll honour{" "}
                  {money(item.price)}.
                </p>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[15px] text-ink-2">Goods</span>
          <span className="text-[17px] font-bold text-ink">{money(subtotal)}</span>
        </div>
        {order.deliveryFee > 0 && (
          <div className="flex items-center justify-between -mt-1">
            <span className="text-[13px] text-ink-3">Delivery</span>
            <span className="text-[13px] text-ink-2">
              {money(order.deliveryFee)}
            </span>
          </div>
        )}

        {error && (
          <p className="text-[13px] text-danger font-medium" role="alert">
            {error}
          </p>
        )}

        {usable.length === 0 && (
          <p className="text-[13px] text-danger font-medium">
            Nothing left to supply — decline this order instead.
          </p>
        )}

        <Button full loading={busy} disabled={usable.length === 0} onClick={confirm}>
          Confirm
        </Button>
      </div>
    </Sheet>
  );
}
