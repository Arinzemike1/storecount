import type { ReactNode } from "react";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Accent for the icon chip: brand green by default. */
  tone?: "primary" | "accent" | "warning" | "danger";
  sub?: string;
  /** CSS gradient string that renders as a colorful border, e.g. "linear-gradient(135deg, #7c3aed, #db2777)" */
  gradient?: string;
}

const tones = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  sub,
  gradient,
}: StatCardProps) {
  const content = (
    <>
      {icon && (
        <span
          className={`size-9 rounded-xl flex items-center justify-center ${tones[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[13px] text-ink-2 leading-tight">{label}</p>
        <p className="text-xl font-bold text-ink truncate tracking-tight mt-0.5">
          {value}
        </p>
        {sub && <p className="text-xs text-ink-3 mt-0.5">{sub}</p>}
      </div>
    </>
  );

  if (gradient) {
    return (
      <div
        className="rounded-card shadow-card"
        style={{ background: gradient, padding: "1px" }}
      >
        <div className="bg-surface rounded-[18px] p-4 flex flex-col gap-3 min-w-0 h-full">
          {content}
        </div>
      </div>
    );
  }

  return <Card className="p-4 flex flex-col gap-3 min-w-0">{content}</Card>;
}
