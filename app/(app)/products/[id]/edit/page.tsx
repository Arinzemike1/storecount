"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { updateProduct } from "@/lib/inventory";
import { useProducts } from "@/lib/store";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const products = useProducts();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <>
        <PageHeader title="Edit Product" back />
        <p className="text-center text-[15px] text-ink-2 py-12 px-6">
          This product no longer exists.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Product" back />
      <ProductForm
        initial={product}
        submitLabel="Save Changes"
        onSubmit={(input) => {
          updateProduct(product.id, input);
          router.back();
        }}
      />
    </>
  );
}
