import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6 animate-fade-up">
      <span className="size-16 rounded-3xl bg-primary-soft text-primary flex items-center justify-center [&_svg]:size-8">
        {icon}
      </span>
      <h3 className="text-lg font-bold text-ink mt-1">{title}</h3>
      <p className="text-[15px] text-ink-2 max-w-65 leading-snug">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
