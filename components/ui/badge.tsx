import type { StockStatus } from "@/lib/types";

const stockStyles: Record<StockStatus, { label: string; className: string }> = {
  "in-stock": { label: "In Stock", className: "bg-success-soft text-success" },
  "low-stock": { label: "Low Stock", className: "bg-warning-soft text-warning" },
  "out-of-stock": { label: "Out of Stock", className: "bg-danger-soft text-danger" },
};

export function StockBadge({ status }: { status: StockStatus }) {
  const { label, className } = stockStyles[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
