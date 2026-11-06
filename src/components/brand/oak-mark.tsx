import { cn } from "@/lib/utils";

/** Oak Banking monogram: an "O" ring with a single sprouting leaf. Mirrors src/app/icon.svg. */
export function OakMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <circle cx="16" cy="17.5" r="7.5" fill="none" stroke="var(--text-inverse)" strokeWidth="3" />
      <path d="M16 10C16 6.5 18.5 4.5 22.5 4.5C22.5 8 20 10 16 10Z" fill="var(--mint)" />
    </svg>
  );
}
