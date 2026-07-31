/** Core domain models. Keep these serializable — they are persisted as JSON. */

export interface Product {
  id: string;
  name: string;
  /** Optional small image stored as a data URL (resized before saving). */
  image?: string;
  category?: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface SaleItem {
  productId: string;
  /** Snapshots taken at checkout so history stays correct if the product changes. */
  name: string;
  price: number;
  cost: number;
  quantity: number;
}

export interface Sale {
  id: string;
  /** Short human-friendly transaction reference shown on receipts. */
  ref: string;
  items: SaleItem[];
  totalQuantity: number;
  total: number;
  profit: number;
  createdAt: string;
}

/**
 * A sale held for a customer who promised to pay later. Unlike a Sale it does
 * NOT reduce stock — it is a saved draft that can be resumed, edited, then
 * either completed (becomes a Sale) or discarded.
 */
export interface PendingSale {
  id: string;
  ref: string;
  items: SaleItem[];
  totalQuantity: number;
  total: number;
  /** Optional label for who owes — a name, phone, or nickname. */
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PinCredential {
  salt: string;
  hash: string;
  iterations: number;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pin: PinCredential;
  /** Set after a successful phone + PIN login; unlocks PIN-only sign-in. */
  deviceRemembered: boolean;
  createdAt: string;
}

export interface AppSettings {
  businessName: string;
  /** ISO 4217 currency code used for all money formatting. */
  currency: string;
  /** Quantity at or below which a product counts as low stock. */
  lowStockThreshold: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: "",
  currency: "NGN",
  lowStockThreshold: 5,
};
