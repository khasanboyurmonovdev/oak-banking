import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A native `<select>` styled like the outline trigger buttons (height, border,
 * radius, chevron, focus ring). Native keeps keyboard, screen-reader and
 * mobile picker behaviour for free. `className` sizes the wrapper.
 */
export function NativeSelect({ className, ...props }: Omit<React.ComponentProps<"select">, "multiple">) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface pr-8 pl-2.5 text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
