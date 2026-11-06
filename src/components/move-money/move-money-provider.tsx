"use client";

import { ArrowLeftRight } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MoveMoneyDialog } from "./move-money-dialog";

type OpenMoveMoney = (options?: { fromAccountId?: string }) => void;

const MoveMoneyContext = createContext<OpenMoveMoney | null>(null);

/** One Move money dialog for the whole app; any button can open it, optionally with a source account. */
export function MoveMoneyProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined);
  const openDialog = useCallback<OpenMoveMoney>((options) => {
    setFromAccountId(options?.fromAccountId);
    setOpen(true);
  }, []);

  return (
    <MoveMoneyContext value={openDialog}>
      {children}
      <MoveMoneyDialog open={open} onOpenChange={setOpen} initialFromId={fromAccountId} />
    </MoveMoneyContext>
  );
}

export function useMoveMoney(): OpenMoveMoney {
  const open = useContext(MoveMoneyContext);
  if (!open) throw new Error("useMoveMoney must be used inside <MoveMoneyProvider>");
  return open;
}

/** The page-header entry point (tablet and desktop; mobile uses the bottom bar action). */
export function MoveMoneyButton({ className }: { className?: string }) {
  const openDialog = useMoveMoney();
  return (
    <Button size="lg" className={cn("hidden md:inline-flex", className)} onClick={() => openDialog()}>
      <ArrowLeftRight aria-hidden="true" />
      Move money
    </Button>
  );
}
