/** Core domain models. Keep these serializable — they are persisted as JSON. */

export interface Product {
  id: string;
  name: string;
  /** Optional small image stored as a data URL (resized before saving). */
  image?: string;
  category?: string;
  /** Longer copy shown only on the public storefront. */
  description?: string;
  /** Opt-in: listed on the public storefront. Absent or false = not listed. */
  published?: boolean;
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
  /** Set when this sale settled an online storefront order. */
  orderId?: string;
  createdAt: string;
}

/**
 * A sale held for a customer who will pay later. The held goods leave the shelf
 * immediately — stock is reserved on create and released on discard or
 * checkout. Resumable and editable until it is either completed (becomes a
 * Sale) or discarded.
 *
 * Also used to represent an accepted online order awaiting delivery.
 */
export interface PendingSale {
  id: string;
  ref: string;
  items: SaleItem[];
  totalQuantity: number;
  total: number;
  /** Optional label for who owes — a name, phone, or nickname. */
  customerName?: string;
  /** Set when this hold is an accepted storefront order. */
  orderId?: string;
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
