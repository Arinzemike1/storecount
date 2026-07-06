"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
}

/** Labeled input with optional prefix (e.g. currency symbol) and error text. */
export function Field({
  label,
  hint,
  error,
  prefix,
  className = "",
  ...props
}: FieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div
        className={`flex items-center bg-surface border rounded-control transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 ${
          error ? "border-danger" : "border-border-strong"
        }`}
      >
        {prefix && (
          <span className="pl-4 text-ink-3 text-[16px] font-medium">{prefix}</span>
        )}
        <input
          id={id}
          className={`h-13 w-full min-w-0 bg-transparent px-4 text-[16px] text-ink placeholder:text-ink-3 outline-none ${prefix ? "pl-1.5" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
