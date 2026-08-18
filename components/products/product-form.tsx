"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { CameraIcon, XIcon } from "@/components/ui/icons";
import { Toggle } from "@/components/ui/toggle";
import { profitPerUnit, round2 } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { fileToProductImage } from "@/lib/image";
import { useStorefront } from "@/lib/orders";
import { useProducts, useSettings } from "@/lib/store";
import type { Product } from "@/lib/types";
import type { ProductInput } from "@/lib/inventory";

interface ProductFormProps {
  initial?: Product;
  submitLabel: string;
  onSubmit: (input: ProductInput) => void;
}

export function ProductForm({ initial, submitLabel, onSubmit }: ProductFormProps) {
  const settings = useSettings();
  const products = useProducts();
  const storefront = useStorefront();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [costPrice, setCostPrice] = useState(
    initial ? String(initial.costPrice) : "",
  );
  const [sellingPrice, setSellingPrice] = useState(
    initial ? String(initial.sellingPrice) : "",
  );
  const [quantity, setQuantity] = useState(
    initial ? String(initial.quantity) : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const existingCategories = [
    ...new Set(
      products.map((p) => p.category?.trim()).filter((c): c is string => !!c),
    ),
  ];

  const cost = parseFloat(costPrice);
  const price = parseFloat(sellingPrice);
  const showProfit = !Number.isNaN(cost) && !Number.isNaN(price);
  const unitProfit = showProfit
    ? profitPerUnit({ costPrice: cost, sellingPrice: price })
    : 0;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      setImage(await fileToProductImage(file));
    } catch {
      // Keep the form usable even if the photo can't be read.
    }
  }

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter a product name";
    if (Number.isNaN(cost) || cost < 0) next.costPrice = "Enter what you pay per unit";
    if (Number.isNaN(price) || price < 0) next.sellingPrice = "Enter your selling price";
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) next.quantity = "Enter how many you have";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: name.trim(),
      image,
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      published: storefront ? published : undefined,
      costPrice: round2(cost),
      sellingPrice: round2(price),
      quantity: qty,
    });
  }

  return (
    <form
      className="flex flex-col gap-5 px-5 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Photo picker */}
      <div className="flex justify-center pt-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        {image ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Product photo"
              className="size-24 rounded-3xl object-cover shadow-card"
            />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setImage(undefined)}
              className="absolute -top-1.5 -right-1.5 size-7 rounded-full bg-ink text-white flex items-center justify-center shadow-float"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="size-24 rounded-3xl border-2 border-dashed border-border-strong text-ink-3 flex flex-col items-center justify-center gap-1 active:bg-surface-2 transition-colors"
          >
            <CameraIcon className="size-7" />
            <span className="text-[11px] font-medium">Add photo</span>
          </button>
        )}
      </div>

      <Field
        label="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g. Peak Milk 400g"
        autoFocus={!initial}
      />

      <div className="flex flex-col gap-1.5">
        <Field
          label="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Drinks"
          list="category-options"
        />
        <datalist id="category-options">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {existingCategories.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-1">
            {existingCategories.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 h-8 rounded-full text-[13px] font-medium border transition-colors ${
                  category === c
                    ? "bg-primary-soft text-primary border-primary/30"
                    : "bg-surface text-ink-2 border-border-strong"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Cost Price"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          error={errors.costPrice}
          placeholder="0"
          hint="What you pay"
        />
        <Field
          label="Selling Price"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          error={errors.sellingPrice}
          placeholder="0"
          hint="What customers pay"
        />
      </div>

      {showProfit && (
        <div
          className={`rounded-control px-4 py-3 text-[15px] font-medium animate-fade-in ${
            unitProfit >= 0
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {unitProfit >= 0 ? "Profit" : "Loss"} per unit:{" "}
          <span className="font-bold">
            {formatMoney(Math.abs(unitProfit), settings)}
          </span>
        </div>
      )}

      <Field
        label="Quantity in Stock"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
        placeholder="0"
      />

      {/* Storefront publishing */}
      <div className="rounded-control border border-border-strong bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">Sell online</p>
            <p className="text-[13px] text-ink-3">
              {storefront
                ? "Show this product in your online store"
                : "Set up your online store in Settings first"}
            </p>
          </div>
          {storefront ? (
            <Toggle
              label="Sell online"
              checked={published}
              onChange={setPublished}
            />
          ) : (
            <Link
              href="/settings"
              className="text-[13px] font-semibold text-primary shrink-0"
            >
              Set up
            </Link>
          )}
        </div>

        {storefront && published && (
          <div className="border-t border-border px-4 py-3.5 animate-fade-in">
            <label
              htmlFor="storefront-description"
              className="text-[13px] font-medium text-ink-2"
            >
              Storefront description (optional)
            </label>
            <textarea
              id="storefront-description"
              value={description}
              maxLength={280}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers what makes this worth buying"
              className="mt-1.5 w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-primary resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-ink-3">
              {description.length}/280
            </p>
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button full type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
