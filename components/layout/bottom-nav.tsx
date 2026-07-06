"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxIcon,
  CartIcon,
  ChartIcon,
  GearIcon,
  HomeIcon,
} from "@/components/ui/icons";

const tabs = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/products", label: "Products", icon: BoxIcon },
  { href: "/sales", label: "Sales", icon: CartIcon },
  { href: "/reports", label: "Reports", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border pb-safe"
    >
      <div className="mx-auto max-w-md grid grid-cols-5">
        {tabs.map(({ href, label, icon: TabIcon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-ink-3 active:text-ink-2"
              }`}
            >
              <TabIcon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
