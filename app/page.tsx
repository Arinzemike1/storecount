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
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-10 animate-fade-up">
        <Logo size={80} />
        <h1 className="text-4xl font-bold tracking-tight text-ink mt-2">
          StoreCount
        </h1>
        <p className="text-[17px] text-ink-2 max-w-70 leading-snug">
          Your shop&apos;s counter, stock book, and profit tracker — in your
          pocket.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-8">
        {highlights.map(({ icon: HighlightIcon, title, text }) => (
          <div
            key={title}
            className="flex items-center gap-4 bg-surface rounded-card border border-border shadow-card px-4 py-3.5"
          >
            <span className="size-11 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <HighlightIcon className="size-6" />
            </span>
            <div className="text-left">
              <p className="font-semibold text-ink text-[15px]">{title}</p>
              <p className="text-sm text-ink-2">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pb-10">
        <Link
          href="/onboarding"
          className="flex items-center justify-center h-14 w-full rounded-control bg-primary text-on-primary text-[17px] font-semibold shadow-card active:scale-[0.98] active:bg-primary-deep transition-all"
        >
          Get Started
        </Link>
        <p className="text-center text-[14px] text-ink-2 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold">
            Restore &amp; sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
