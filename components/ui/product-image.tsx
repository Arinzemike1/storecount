/* eslint-disable @next/next/no-img-element */
import type { Product } from "@/lib/types";

const sizes = {
  sm: "size-11 rounded-xl text-base",
  md: "size-14 rounded-2xl text-lg",
  lg: "size-20 rounded-3xl text-2xl",
};

/**
 * Product thumbnail: the stored data-URL image, or a colored initial tile.
 * Uses a plain <img> because images are local data URLs (next/image adds
 * nothing for those).
 */
export function ProductImage({
  product,
  size = "md",
}: {
  product: Pick<Product, "name" | "image">;
  size?: keyof typeof sizes;
}) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt=""
        className={`${sizes[size]} object-cover bg-surface-2 shrink-0`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${sizes[size]} bg-primary-soft text-primary font-bold flex items-center justify-center shrink-0 uppercase`}
    >
      {product.name.trim().charAt(0) || "?"}
    </span>
  );
}
