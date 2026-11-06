import { CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A failed load, with the server's message and a Retry action. */
export function ErrorState({
  title = "Couldn't load this data",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <CircleAlert aria-hidden="true" className="size-5 text-danger" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {message ? <p className="mt-1 text-muted-foreground">{message}</p> : null}
      </div>
      <Button variant="outline" size="lg" onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
