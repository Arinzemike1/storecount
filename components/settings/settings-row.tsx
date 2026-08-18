"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3 px-1">
        {title}
      </h2>
      <Card className="divide-y divide-border">{children}</Card>
    </section>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onClick,
  disabled = false,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Replaces the chevron — for inline controls like a toggle. */
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <span className="size-9 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 font-semibold text-ink text-[15px]">{label}</span>
      {value && (
        <span className="text-[14px] text-ink-3 truncate max-w-36">{value}</span>
      )}
      {trailing ?? (!disabled && <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />)}
    </>
  );

  // A row carrying its own interactive control must not also be a button —
  // nesting them would break both keyboard and screen-reader semantics.
  if (trailing && !onClick) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-3.5 first:rounded-t-card last:rounded-b-card">
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2 disabled:active:bg-transparent first:rounded-t-card last:rounded-b-card"
    >
      {content}
    </button>
  );
}
