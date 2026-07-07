"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUnlocked } from "@/lib/auth";
import { useHydrated, useProfile } from "@/lib/store";
import { CartIcon, ChartIcon, Logo, WalletIcon } from "@/components/ui/icons";

const highlights = [
  {
    icon: CartIcon,
    title: "Sell in seconds",
    text: "Tap products, and the bill totals itself.",
  },
  {
    icon: WalletIcon,
    title: "Know your profit",
    text: "See what you actually earn on every sale.",
  },
  {
    icon: ChartIcon,
    title: "Stay stocked",
    text: "Get warned before products run out.",
  },
];

export default function WelcomePage() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const unlocked = useUnlocked();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !profile) return;
    router.replace(unlocked ? "/dashboard" : "/login");
  }, [hydrated, profile, unlocked, router]);

  if (!hydrated || profile) return null;

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-md px-6 pt-safe pb-safe">
      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-3 pt-14 pb-8 animate-fade-up">
        <Logo size={52} />
        <h1 className="text-[32px] font-bold tracking-tight text-ink mt-1">
          Store Count
        </h1>
        <p className="text-[17px] text-ink-2 max-w-72 leading-snug">
          Count stock, track sales, and know your <em>profit</em> — all in one
          place.
        </p>
      </div>

      {/* Feature list */}
      <div className="border-t border-border">
        {highlights.map(({ icon: HighlightIcon, title, text }, i) => (
          <div
            key={title}
            className={`flex items-center gap-4 py-4${
              i < highlights.length - 1 ? " border-b border-border" : ""
            }`}
          >
            <span className="text-primary shrink-0">
              <HighlightIcon className="size-7" />
            </span>
            <div>
              <p className="font-semibold text-ink text-[15px]">{title}</p>
              <p className="text-[14px] text-ink-2 mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 pb-10">
        <Link
          href="/onboarding"
          className="flex items-center justify-center h-14 w-full rounded-control bg-primary text-on-primary text-[17px] font-semibold active:scale-[0.98] active:bg-primary-deep transition-all"
        >
          Get started
        </Link>
        <p className="text-center text-[14px] text-ink-2 mt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-ink font-semibold underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
