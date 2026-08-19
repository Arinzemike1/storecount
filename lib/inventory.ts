"use client";

import { round2 } from "./calc";
import { createId, createSaleRef } from "./id";
import { queueSync } from "./sync";
import { pendingSalesStore, productsStore, salesStore } from "./store";
import type { PendingSale, Product, Sale, SaleItem } from "./types";

export interface ProductInput {
  name: string;
  image?: string;
  category?: string;
  description?: string;
  published?: boolean;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
}

export function addProduct(input: ProductInput): Product {
  const now = new Date().toISOString();
  const product: Product = {
    id: createId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  productsStore.update((products) => [product, ...products]);
  queueSync();
  return product;
}

export function updateProduct(
  id: string,
  changes: Partial<ProductInput>,
): void {
  productsStore.update((products) =>
    products.map((product) =>
      product.id === id
        ? { ...product, ...changes, updatedAt: new Date().toISOString() }
        : product,
    ),
  );
  queueSync();
}

export function deleteProduct(id: string): void {
  productsStore.update((products) =>
    products.filter((product) => product.id !== id),
  );
  queueSync();
}

export interface CartLine {
  product: Product;
  quantity: number;
  /**
   * Honour the price the customer was shown rather than the current
   * sellingPrice. Set when settling a storefront order, where the merchant may
   * have changed the price between the order being placed and accepted.
   */
  unitPrice?: number;
  /** Likewise for the name the customer ordered under. */
  displayName?: string;
}

/** The price to charge for a line — the agreed price if there is one. */
function linePrice(line: CartLine): number {
  return line.unitPrice ?? line.product.sellingPrice;
}

export function cartTotals(lines: CartLine[]): {
  total: number;
  totalQuantity: number;
  profit: number;
} {
  let total = 0;
  let totalQuantity = 0;
  let profit = 0;
  for (const line of lines) {
    const price = linePrice(line);
    total += price * line.quantity;
    // Cost stays live — that is the merchant's own current number.
    profit += (price - line.product.costPrice) * line.quantity;
    totalQuantity += line.quantity;
  }
  return { total: round2(total), totalQuantity, profit: round2(profit) };
}

/**
 * Completes a sale: records the transaction with price/cost snapshots and
 * reduces stock for every purchased product.
 */
export function checkout(lines: CartLine[], orderId?: string): Sale {
  const items = toSaleItems(lines);
  const { total, totalQuantity, profit } = cartTotals(lines);
  const sale: Sale = {
    id: createId(),
    ref: createSaleRef(),
    items,
    total,
    totalQuantity,
    profit,
    orderId,
    createdAt: new Date().toISOString(),
  };

  const sold = new Map(items.map((item) => [item.productId, item.quantity]));
  productsStore.update((products) =>
    products.map((product) => {
      const quantitySold = sold.get(product.id);
      if (!quantitySold) return product;
      return {
        ...product,
        quantity: Math.max(0, product.quantity - quantitySold),
        updatedAt: sale.createdAt,
      };
    }),
  );
  salesStore.update((sales) => [sale, ...sales]);
  queueSync();
  return sale;
}

function toSaleItems(lines: CartLine[]): SaleItem[] {
  return lines.map((line) => ({
    productId: line.product.id,
    name: line.displayName ?? line.product.name,
    price: linePrice(line),
    cost: line.product.costPrice,
    quantity: line.quantity,
  }));
}

/**
 * Adjusts on-shelf stock by a per-product delta (positive = take off the shelf,
 * negative = return to the shelf), flooring at zero. Used to move goods in and
 * out of reservation as pending sales are created, edited, or discarded.
 *
 * Returns the delta that was *actually* applied. It differs from the requested
 * delta when flooring at zero kicks in — reserving 5 units of a product with 3
 * on the shelf only moves 3. Callers must record the applied amount, otherwise
 * releasing the reservation later returns stock that never left.
 */
function adjustStock(delta: Map<string, number>): Map<string, number> {
  const applied = new Map<string, number>();
  if (delta.size === 0) return applied;
  const now = new Date().toISOString();
  productsStore.update((products) =>
    products.map((product) => {
      const remove = delta.get(product.id);
      if (!remove) return product;
      const next = Math.max(0, product.quantity - remove);
      applied.set(product.id, product.quantity - next);
      return { ...product, quantity: next, updatedAt: now };
    }),
  );
  return applied;
}

function stockDelta(
  items: { productId: string; quantity: number }[],
  sign: 1 | -1,
): Map<string, number> {
  const delta = new Map<string, number>();
  for (const item of items) {
    delta.set(
      item.productId,
      (delta.get(item.productId) ?? 0) + sign * item.quantity,
    );
  }
  return delta;
}

/**
 * Saves (or updates) a sale the customer will pay for later. The held goods
 * leave the shelf immediately — stock is reserved on create and reconciled to
 * the new quantities on update. Pass an existing `id` to update a resumed hold.
 */
export function savePendingSale(
  lines: CartLine[],
  customerName?: string,
  id?: string,
  orderId?: string,
): PendingSale {
  const requested = toSaleItems(lines);
  const now = new Date().toISOString();
  const name = customerName?.trim() || undefined;

  const existing = id
    ? pendingSalesStore.get().find((p) => p.id === id)
    : undefined;

  // Reserve the new quantities and, when updating a hold, return whatever was
  // previously reserved — the net delta moves stock on or off the shelf.
  const delta = stockDelta(requested, 1);
  const held = new Map<string, number>();
  if (existing) {
    for (const item of existing.items) {
      held.set(item.productId, (held.get(item.productId) ?? 0) + item.quantity);
    }
    for (const [productId, change] of stockDelta(existing.items, -1)) {
      delta.set(productId, (delta.get(productId) ?? 0) + change);
    }
  }
  const applied = adjustStock(delta);

  // Record what actually left the shelf, not what was asked for. Storefront
  // orders can exceed live stock (available_quantity is a stale hint), and a
  // hold claiming more than it reserved would conjure stock when released.
  const items = requested
    .map((item) => ({
      ...item,
      quantity:
        (held.get(item.productId) ?? 0) + (applied.get(item.productId) ?? 0),
    }))
    .filter((item) => item.quantity > 0);

  let total = 0;
  let totalQuantity = 0;
  for (const item of items) {
    total += item.price * item.quantity;
    totalQuantity += item.quantity;
  }

  const pending: PendingSale = {
    id: existing?.id ?? id ?? createId(),
    ref: existing?.ref ?? createSaleRef(),
    items,
    total: round2(total),
    totalQuantity,
    customerName: name,
    orderId: existing?.orderId ?? orderId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  pendingSalesStore.update((all) =>
    existing
      ? all.map((p) => (p.id === pending.id ? pending : p))
      : [pending, ...all],
  );
  queueSync();
  return pending;
}

/** Discards a pending sale, returning its reserved goods to the shelf. */
export function discardPendingSale(id: string): void {
  const pending = pendingSalesStore.get().find((p) => p.id === id);
  if (pending) adjustStock(stockDelta(pending.items, -1));
  pendingSalesStore.update((all) => all.filter((p) => p.id !== id));
  queueSync();
}

/**
 * Finalizes a resumed hold into a completed sale. Returns the reserved goods to
 * the shelf first, then `checkout` deducts the final cart — so any items added
 * or removed while the customer was away reconcile correctly.
 */
export function checkoutPendingSale(id: string, lines: CartLine[]): Sale {
  const pending = pendingSalesStore.get().find((p) => p.id === id);
  if (pending) adjustStock(stockDelta(pending.items, -1));
  const sale = checkout(lines, pending?.orderId);
  pendingSalesStore.update((all) => all.filter((p) => p.id !== id));
  queueSync();
  return sale;
}
