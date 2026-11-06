import { formatMoney, type Cents } from "@/domain/money";
import { cn } from "@/lib/utils";

/**
 * A signed transaction amount: inflows "+$1,250.00", outflows "-$1,250.00".
 * The sign carries direction; the green tint on inflows is only a secondary cue.
 */
export function SignedAmount({ cents, className }: { cents: Cents; className?: string }) {
  return (
    <span
      className={cn("num font-medium whitespace-nowrap", cents > 0 ? "text-success" : "text-foreground", className)}
    >
      {formatMoney(cents, { signed: true })}
    </span>
  );
}
