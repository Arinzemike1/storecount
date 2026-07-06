"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  action?: ReactNode;
}

/** Sticky screen header with optional back button and trailing action. */
export function PageHeader({ title, back = false, action }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur pt-safe">
      <div className="mx-auto max-w-md flex items-center gap-3 px-5 h-14">
        {back && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="-ml-2 size-10 rounded-full flex items-center justify-center text-ink active:bg-surface-2 transition-colors"
          >
            <ArrowLeftIcon className="size-6" />
          </button>
        )}
        <h1 className="text-[22px] font-bold tracking-tight text-ink flex-1 truncate">
          {title}
        </h1>
        {action}
      </div>
    </header>
  );
}
