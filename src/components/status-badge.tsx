import { CircleCheck, CircleX, Clock3, type LucideIcon } from "lucide-react";

import type { TransactionStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

const STATUS: Record<TransactionStatus, { label: string; icon: LucideIcon; className: string }> = {
  completed: { label: "Completed", icon: CircleCheck, className: "bg-success-background text-success" },
  pending: { label: "Pending", icon: Clock3, className: "bg-warning-background text-warning" },
  failed: { label: "Failed", icon: CircleX, className: "bg-danger-background text-danger" },
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  completed: STATUS.completed.label,
  pending: STATUS.pending.label,
  failed: STATUS.failed.label,
};

/** Status with an icon and a text label, so colour is never the only signal. */
export function StatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}
