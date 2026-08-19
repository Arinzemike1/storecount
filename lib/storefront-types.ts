/**
 * SHARED CONTRACT between StoreCount (merchant app) and the storefront app.
 *
 * Mirrored byte-identically in `storecount-storefront/lib/storefront-types.ts`.
 * Change both together — `npm run lint` runs scripts/check-contract.mjs, which
 * fails the build when this file drifts from the committed hash.
 *
 * Keep this file free of imports and runtime code so it can be copied verbatim.
 */

export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export type PaymentMethod = "cash_on_delivery" | "online";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type FulfilmentMethod = "delivery" | "pickup";

/** Statuses that still need the merchant's attention. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "out_for_delivery",
];

/** The public identity of a merchant's storefront. */
export interface StoreProfile {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /**
   * Public contact number. Deliberately separate from the merchant's login
   * phone — that one is a credential and must not be printed on a public page.
   */
  phone: string | null;
  address: string | null;
  currency: string;
  isOpen: boolean;
  isPublished: boolean;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  deliveryFee: number;
  deliveryNote: string | null;
  minOrderTotal: number;
}

/** A published product as the storefront sees it. Projected from user_data. */
export interface StorefrontProduct {
  productId: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  /**
   * Stale-tolerant hint. The merchant's device is authoritative for stock, and
   * the merchant accepts before stock moves, so over-ask above zero is allowed.
   */
  availableQuantity: number;
  imageUrl: string | null;
}

/** Snapshotted at order time. Mirrors SaleItem minus `cost`. */
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  ref: string;
  storeId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfilmentMethod: FulfilmentMethod;
  items: OrderItem[];
  totalQuantity: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  customerNote: string | null;
  /** Links to the merchant's local PendingSale once accepted. */
  pendingSaleId: string | null;
  /** Links to the merchant's local Sale once delivered. */
  saleId: string | null;
  saleRef: string | null;
  declineReason: string | null;
  placedAt: string;
  acceptedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}

export interface PlaceOrderRequest {
  slug: string;
  items: { productId: string; quantity: number }[];
  fulfilmentMethod: FulfilmentMethod;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  customerNote?: string;
}

export interface PlaceOrderResponse {
  ref: string;
  /** The only credential a guest holds for their own order. Never guessable. */
  trackingToken: string;
  total: number;
}

/**
 * The storefront routes every root path through `/[slug]`, so these can never
 * be allocated as store slugs. Add to this list BEFORE adding a top-level route.
 */
export const RESERVED_SLUGS = [
  "api",
  "admin",
  "www",
  "app",
  "order",
  "orders",
  "track",
  "cart",
  "checkout",
  "about",
  "help",
  "support",
  "login",
  "signup",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const;
