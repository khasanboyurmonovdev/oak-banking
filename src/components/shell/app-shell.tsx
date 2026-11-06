import Link from "next/link";

import { OakMark } from "@/components/brand/oak-mark";
import { SEED_COMPANY } from "@/domain/seed";
import { ACCOUNT_KINDS } from "@/domain/types";

import { BottomNav, RailNav, SidebarNav } from "./primary-nav";

/** Fictional signed-in user for the demo. There is no authentication. */
const DEMO_USER = { name: "Avery Lindqvist", role: "Finance lead", initials: "AL" };

/** Every sandbox is seeded with one account of each kind. */
const ACCOUNT_COUNT = ACCOUNT_KINDS.length;

/**
 * Responsive application frame.
 * Desktop ≥1024px: sidebar · Tablet 768–1023px: icon rail · Mobile <768px: top brand bar + bottom tab bar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-medium focus:text-foreground focus:shadow-md"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" className="flex items-center gap-2.5 rounded-md">
            <OakMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Oak Banking</span>
          </Link>
        </div>
        <div className="mx-3 mb-2 rounded-lg border border-sidebar-border px-3 py-2.5">
          <p className="truncate font-medium text-foreground">{SEED_COMPANY.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{ACCOUNT_COUNT} accounts</p>
        </div>
        <SidebarNav />
        <div className="border-t border-sidebar-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-hover"
            >
              {DEMO_USER.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{DEMO_USER.name}</p>
              <p className="truncate text-xs text-muted-foreground">{DEMO_USER.role}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-subtle-foreground">Demo environment · simulated data</p>
        </div>
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r border-sidebar-border bg-sidebar md:flex lg:hidden">
        <div className="flex h-16 items-center">
          <Link href="/" className="rounded-md">
            <OakMark className="size-8" />
            <span className="sr-only">Oak Banking, Overview</span>
          </Link>
        </div>
        <RailNav />
        <p className="py-4 text-xs text-subtle-foreground">Demo</p>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 rounded-md">
          <OakMark className="size-7" />
          <span className="font-semibold tracking-tight text-foreground">Oak Banking</span>
        </Link>
        <p className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          Demo · simulated data
        </p>
      </header>

      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-16 lg:pl-(--sidebar-width)">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-(--content-max-width) px-4 py-6 focus:outline-none md:px-7 md:py-7 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
