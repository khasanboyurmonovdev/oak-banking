"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, isNavItemActive } from "./nav-items";

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

/** Mobile (<768px): bottom tab bar. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className="grid grid-cols-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:-outline-offset-4",
                  active
                    ? "text-brand before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
