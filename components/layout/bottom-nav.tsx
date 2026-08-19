"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  // BoxIcon,
  CartIcon,
  ChartIcon,
  GearIcon,
  HomeIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { usePendingOrderCount } from "@/lib/orders";

const tabs = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  // { href: "/products", label: "Products", icon: BoxIcon },
  { href: "/sales", label: "Sales", icon: CartIcon },
  { href: "/orders", label: "Orders", icon: TruckIcon },
  { href: "/reports", label: "Reports", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const pendingOrders = usePendingOrderCount();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border pb-safe"
    >
      <div className="mx-auto max-w-md grid grid-cols-5">
        {tabs.map(({ href, label, icon: TabIcon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          // Between polls this dot is the only ambient signal a merchant gets
          // that an order is waiting, so it must be hard to miss.
          const badge = href === "/orders" && pendingOrders > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-ink-3 active:text-ink-2"
              }`}
            >
              <span className="relative">
                <TabIcon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
                {badge && (
                  <span
                    aria-label={`${pendingOrders} new orders`}
                    className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-danger ring-2 ring-surface"
                  />
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
