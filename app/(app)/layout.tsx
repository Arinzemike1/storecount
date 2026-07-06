"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useUnlocked } from "@/lib/auth";
import { useHydrated, useProfile } from "@/lib/store";

/** Immersive flows that hide the tab bar (e.g. ringing up a sale). */
const FULLSCREEN_ROUTES = ["/sales/new"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const profile = useProfile();
  const unlocked = useUnlocked();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) router.replace("/");
    else if (!unlocked) router.replace("/login");
  }, [hydrated, profile, unlocked, router]);

  if (!hydrated || !profile || !unlocked) return null;

  const fullscreen = FULLSCREEN_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-md">
      <div className={`flex-1 flex flex-col ${fullscreen ? "" : "pb-24"}`}>
        {children}
      </div>
      {!fullscreen && <BottomNav />}
    </div>
  );
}
