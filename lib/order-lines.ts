"use client";

import type { CartLine } from "./inventory";
import type { OrderItem } from "./storefront-types";
import type { Product } from "./types";

/**
 * What can go wrong between a customer ordering and the merchant confirming.
 * The storefront shows a stale stock hint on purpose, so all three are normal
 * rather than exceptional — the Accept sheet surfaces each one explicitly.
 */
export type LineIssue = "missing" | "short" | "price" | null;

export interface ResolvedLine {
  item: OrderItem;
  product: Product | undefined;
  /** Quantity the merchant will actually fulfil. */
  quantity: number;
  /** Ceiling for the stepper: what is genuinely on the shelf. */
  maxQuantity: number;
  issue: LineIssue;
}

/**
 * Matches an order's items against live inventory.
 *
 * `extraStock` adds back quantities already reserved by a hold, so settling an
 * accepted order does not appear short against stock it has itself removed.
 */
export function resolveOrderLines(
  items: OrderItem[],
  products: Product[],
  extraStock?: Map<string, number>,
): ResolvedLine[] {
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      return {
        item,
        product: undefined,
        quantity: 0,
        maxQuantity: 0,
        issue: "missing" as const,
      };
    }

    const available = product.quantity + (extraStock?.get(product.id) ?? 0);
    const quantity = Math.min(item.quantity, available);

    const issue: LineIssue =
      quantity < item.quantity
        ? "short"
        : product.sellingPrice !== item.price
          ? "price"
          : null;

    return { item, product, quantity, maxQuantity: available, issue };
  });
}

/**
 * Turns resolved lines into cart lines for checkout.
 *
 * Carries the ORDER's price and name as overrides so the customer is charged
 * what they were shown, even if the merchant has since changed the product.
 */
export function toCartLines(lines: ResolvedLine[]): CartLine[] {
  const usable = lines.filter(
    (line): line is ResolvedLine & { product: Product } =>
      Boolean(line.product) && line.quantity > 0,
  );
  return usable.map((line) => ({
    product: line.product,
    quantity: line.quantity,
    unitPrice: line.item.price,
    displayName: line.item.name,
  }));
}

/** Quantities a hold has already taken off the shelf, keyed by product. */
export function reservedFrom(items: OrderItem[]): Map<string, number> {
  const reserved = new Map<string, number>();
  for (const item of items) {
    reserved.set(
      item.productId,
      (reserved.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return reserved;
}
