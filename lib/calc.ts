import type { AppSettings, Product, Sale, StockStatus } from "./types";

/** Round to 2 decimal places to keep money math stable. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function profitPerUnit(product: Pick<Product, "costPrice" | "sellingPrice">): number {
  return round2(product.sellingPrice - product.costPrice);
}

export function stockStatus(
  product: Pick<Product, "quantity">,
  settings: Pick<AppSettings, "lowStockThreshold">,
): StockStatus {
  if (product.quantity <= 0) return "out-of-stock";
  if (product.quantity <= settings.lowStockThreshold) return "low-stock";
  return "in-stock";
}

/* ------------------------------- Date ranges ------------------------------ */

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday-based start of the current week. */
export function startOfWeek(now = new Date()): Date {
  const d = startOfToday(now);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfMonth(now = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(1);
  return d;
}

export function salesSince(sales: Sale[], since: Date): Sale[] {
  const cutoff = since.getTime();
  return sales.filter((sale) => new Date(sale.createdAt).getTime() >= cutoff);
}

export interface PeriodSummary {
  revenue: number;
  profit: number;
  count: number;
}

export function summarize(sales: Sale[]): PeriodSummary {
  let revenue = 0;
  let profit = 0;
  for (const sale of sales) {
    revenue += sale.total;
    profit += sale.profit;
  }
  return { revenue: round2(revenue), profit: round2(profit), count: sales.length };
}

/* ------------------------------ Leaderboards ------------------------------ */

export interface ProductPerformance {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export function productPerformance(sales: Sale[]): ProductPerformance[] {
  const byProduct = new Map<string, ProductPerformance>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const entry = byProduct.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        unitsSold: 0,
        revenue: 0,
        profit: 0,
      };
      entry.unitsSold += item.quantity;
      entry.revenue = round2(entry.revenue + item.price * item.quantity);
      entry.profit = round2(entry.profit + (item.price - item.cost) * item.quantity);
      entry.name = item.name;
      byProduct.set(item.productId, entry);
    }
  }
  return [...byProduct.values()];
}

export function topSelling(sales: Sale[], limit = 5): ProductPerformance[] {
  return productPerformance(sales)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, limit);
}

export function mostProfitable(sales: Sale[], limit = 5): ProductPerformance[] {
  return productPerformance(sales)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit);
}

/** Revenue per day for the last `days` days, oldest first. Powers the reports chart. */
export function dailyRevenue(
  sales: Sale[],
  days: number,
  now = new Date(),
): { date: Date; revenue: number }[] {
  const buckets = new Map<string, { date: Date; revenue: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfToday(now);
    date.setDate(date.getDate() - i);
    buckets.set(date.toDateString(), { date, revenue: 0 });
  }
  for (const sale of sales) {
    const key = new Date(sale.createdAt).toDateString();
    const bucket = buckets.get(key);
    if (bucket) bucket.revenue = round2(bucket.revenue + sale.total);
  }
  return [...buckets.values()];
}
