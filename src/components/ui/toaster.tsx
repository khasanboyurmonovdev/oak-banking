"use client";

import { CircleAlert, CircleCheck, XIcon } from "lucide-react";
import Link from "next/link";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, useCallback, useContext, useState } from "react";

import { cn } from "@/lib/utils";

type ToastInput = {
  title: string;
  description?: string;
  tone?: "success" | "error";
  /** An optional link, e.g. to the record the action created. */
  action?: { label: string; href: string };
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

let nextToastId = 0;

/** Action feedback. Built on Radix Toast: announced to screen readers, F8 focuses the region. */
export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((toast: ToastInput) => {
    nextToastId += 1;
    setToasts((current) => [...current.slice(-2), { ...toast, id: nextToastId }]);
  }, []);
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));

  return (
    <ToastContext.Provider value={show}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map(({ id, title, description, tone = "success", action }) => {
          const Icon = tone === "error" ? CircleAlert : CircleCheck;
          return (
            <ToastPrimitive.Root
              key={id}
              type={tone === "error" ? "foreground" : "background"}
              onOpenChange={(open) => {
                if (!open) dismiss(id);
              }}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 pr-2 shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
            >
              <Icon
                aria-hidden="true"
                className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-danger" : "text-success")}
              />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="font-medium text-foreground">{title}</ToastPrimitive.Title>
                {description ? (
                  <ToastPrimitive.Description className="mt-0.5 text-muted-foreground">
                    {description}
                  </ToastPrimitive.Description>
                ) : null}
                {action ? (
                  <ToastPrimitive.Action altText={action.label} asChild>
                    <Link
                      href={action.href}
                      className="mt-1.5 inline-block rounded-sm text-[13px] font-medium text-brand underline-offset-4 hover:underline"
                    >
                      {action.label}
                    </Link>
                  </ToastPrimitive.Action>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss notification"
                className="rounded-sm p-1 text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none md:bottom-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <Toaster>");
  return show;
}
