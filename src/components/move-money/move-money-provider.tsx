"use client";

import { ArrowLeftRight } from "lucide-react";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useState } from "react";

import { Button } from "@/components/ui/button";

const loadMoveMoneyDialog = () => import("./move-money-dialog");

/** The dialog (form, validation, Radix Dialog) is fetched on first open, not with every page. */
const MoveMoneyDialog = dynamic(() => loadMoveMoneyDialog().then((mod) => mod.MoveMoneyDialog), { ssr: false });

/** Warm the dialog chunk on hover/focus so the first open still feels instant. */
export function prefetchMoveMoney(): void {
  void loadMoveMoneyDialog();
}

type OpenMoveMoney = (options?: { fromAccountId?: string }) => void;

const MoveMoneyContext = createContext<OpenMoveMoney | null>(null);

/** One Move money dialog for the whole app; any button can open it, optionally with a source account. */
export function MoveMoneyProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Mounted on first open and kept mounted afterwards, so the close animation still plays.
  const [requested, setRequested] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined);
  const openDialog = useCallback<OpenMoveMoney>((options) => {
    setFromAccountId(options?.fromAccountId);
    setRequested(true);
    setOpen(true);
  }, []);

  return (
    <MoveMoneyContext value={openDialog}>
      {children}
      {requested ? <MoveMoneyDialog open={open} onOpenChange={setOpen} initialFromId={fromAccountId} /> : null}
    </MoveMoneyContext>
  );
}

export function useMoveMoney(): OpenMoveMoney {
  const open = useContext(MoveMoneyContext);
  if (!open) throw new Error("useMoveMoney must be used inside <MoveMoneyProvider>");
  return open;
}

/** The page-header entry point (PageHeader hides it on mobile, where the bottom bar has the action). */
export function MoveMoneyButton({ className }: { className?: string }) {
  const openDialog = useMoveMoney();
  return (
    <Button
      size="lg"
      className={className}
      onPointerEnter={prefetchMoveMoney}
      onFocus={prefetchMoveMoney}
      onClick={() => openDialog()}
    >
      <ArrowLeftRight aria-hidden="true" />
      Move money
    </Button>
  );
}
