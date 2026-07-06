"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { addProduct } from "@/lib/inventory";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <>
      <PageHeader title="Add Product" back />
      <ProductForm
        submitLabel="Save Product"
        onSubmit={(input) => {
          addProduct(input);
          router.replace("/products");
        }}
      />
    </>
  );
}
