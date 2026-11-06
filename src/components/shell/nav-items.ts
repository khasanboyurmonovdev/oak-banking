import { LayoutGrid, ReceiptText, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Only pages that exist are listed (docs/DECISIONS.md D6).
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
