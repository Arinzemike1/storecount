"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "lg" | "md" | "sm";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-card active:bg-primary-deep disabled:bg-border-strong disabled:text-ink-3 disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-border-strong active:bg-surface-2 disabled:text-ink-3",
  ghost: "bg-transparent text-primary active:bg-primary-soft disabled:text-ink-3",
  danger:
    "bg-danger text-white active:opacity-90 disabled:bg-border-strong disabled:text-ink-3",
  "danger-soft": "bg-danger-soft text-danger active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  lg: "h-14 px-6 text-[17px] rounded-control",
  md: "h-12 px-5 text-[15px] rounded-control",
  sm: "h-10 px-4 text-sm rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "lg",
  full = false,
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] select-none ${variantClasses[variant]} ${sizeClasses[size]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {children}
    </button>
  );
}
