"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMoveMoney } from "@/components/move-money/move-money-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, isNavItemActive, type NavItem } from "./nav-items";

/** Desktop (≥1024px): labelled vertical list. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex-1 px-3 py-2">
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center gap-3 rounded-md px-3 font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand"
                    : "text-sidebar-foreground hover:bg-surface-secondary hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-4", active && "text-brand")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablet (768–1023px): icon-only rail; labels are exposed via sr-only text and tooltips. */
export function RailNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex-1 py-2">
      <ul className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-sidebar-accent text-brand"
                        : "text-sidebar-foreground hover:bg-surface-secondary hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    <span className="sr-only">{label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BottomNavLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-16 flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium transition-colors focus-visible:-outline-offset-4",
        active
          ? "text-brand before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:bg-brand"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Same box as the Move money circle, so every label sits on one line. */}
      <span className="flex size-7 items-center justify-center">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/** Mobile (<768px): bottom tab bar with the Move money action in the middle. */
export function BottomNav() {
  const pathname = usePathname();
  const openMoveMoney = useMoveMoney();
  const half = Math.ceil(NAV_ITEMS.length / 2);
  const item = (navItem: NavItem) => (
    <li key={navItem.href} className="min-w-0">
      <BottomNavLink {...navItem} active={isNavItemActive(pathname, navItem.href)} />
    </li>
  );

  return (
    <nav aria-label="Primary">
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.slice(0, half).map(item)}
        <li className="min-w-0">
          <button
            type="button"
            onClick={() => openMoveMoney()}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium text-foreground focus-visible:-outline-offset-4"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-primary-foreground">
              <ArrowLeftRight aria-hidden="true" className="size-4" />
            </span>
            <span className="max-w-full truncate">Move money</span>
          </button>
        </li>
        {NAV_ITEMS.slice(half).map(item)}
      </ul>
    </nav>
  );
}
