import { cn } from "@/lib/utils";

/**
 * Oak Banking monogram: a closed, centred "O" ring holding a single leaf on
 * the diagonal. Symmetric, so it can't read as a numeral. Mirrors src/app/icon.svg.
 */
export function OakMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--text-inverse)" strokeWidth="2.75" />
      <path d="M12.25 19.75C12.25 15.25 15.25 12.25 19.75 12.25C19.75 16.75 16.75 19.75 12.25 19.75Z" fill="var(--mint)" />
      <path d="M12.75 19.25L17.5 14.5" stroke="var(--brand)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
