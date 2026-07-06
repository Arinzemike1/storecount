"use client";

import { round2 } from "./calc";
import { createId, createSaleRef } from "./id";
import { productsStore, salesStore } from "./store";
import type { Product, Sale, SaleItem } from "./types";

export interface ProductInput {
  name: string;
  image?: string;
  category?: string;
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
  return product;
}

export function updateProduct(id: string, changes: Partial<ProductInput>): void {
  productsStore.update((products) =>
    products.map((product) =>
      product.id === id
        ? { ...product, ...changes, updatedAt: new Date().toISOString() }
        : product,
    ),
  );
}

export function deleteProduct(id: string): void {
  productsStore.update((products) =>
    products.filter((product) => product.id !== id),
  );
}

export interface CartLine {
  product: Product;
  quantity: number;
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
    total += line.product.sellingPrice * line.quantity;
    profit += (line.product.sellingPrice - line.product.costPrice) * line.quantity;
    totalQuantity += line.quantity;
  }
  return { total: round2(total), totalQuantity, profit: round2(profit) };
}

/**
 * Completes a sale: records the transaction with price/cost snapshots and
 * reduces stock for every purchased product.
 */
export function checkout(lines: CartLine[]): Sale {
  const items: SaleItem[] = lines.map((line) => ({
    productId: line.product.id,
    name: line.product.name,
    price: line.product.sellingPrice,
    cost: line.product.costPrice,
    quantity: line.quantity,
  }));
  const { total, totalQuantity, profit } = cartTotals(lines);
  const sale: Sale = {
    id: createId(),
    ref: createSaleRef(),
    items,
    total,
    totalQuantity,
    profit,
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
  return sale;
}
