"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useRefreshAll } from "@/hooks/use-api";
import { ApiClientError, apiPost } from "@/lib/api-client";

type ResetResult = { accounts: number; transactions: number };

/** Wipes and reseeds this browser's sandbox after a confirmation step. */
export function ResetDemoData() {
  const toast = useToast();
  const refreshAll = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = async () => {
    setResetting(true);
    setError(null);
    try {
      const result = await apiPost<ResetResult>("/api/demo/reset", {});
      refreshAll();
      setOpen(false);
      toast({
        title: "Demo data reset",
        description: `Restored ${result.accounts} accounts and ${result.transactions} transactions.`,
      });
    } catch (caught) {
      const message = caught instanceof ApiClientError ? caught.message : "Something went wrong. Please try again.";
      setError(message);
      toast({ title: "Couldn't reset the demo data", description: message, tone: "error" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (resetting) return;
        setOpen(next);
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg">
          <RotateCcw aria-hidden="true" />
          Reset demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-semibold">Reset demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            Your transfers and notes are removed, and the accounts and transactions go back to the original sample data.
            Only your own sandbox is affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="flex gap-2 rounded-lg bg-danger-background p-3 text-[13px] text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" disabled={resetting}>
            Cancel
          </AlertDialogCancel>
          {/* A plain button, not AlertDialogAction, so the dialog stays open until the reset finishes. */}
          <Button variant="destructive" size="lg" disabled={resetting} onClick={reset}>
            {resetting ? "Resetting…" : "Reset demo data"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
