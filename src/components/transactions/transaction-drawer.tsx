"use client";

import { ArrowLeftRight, SearchX } from "lucide-react";
import { useId, useState } from "react";

import { categoryLabel } from "@/domain/categories";
import { formatMoney } from "@/domain/money";
import { isTransferLeg, MAX_NOTE_LENGTH, type Transaction } from "@/domain/types";
import { ErrorState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useApi } from "@/hooks/use-api";
import { ApiClientError, apiPatch } from "@/lib/api-client";
import { formatDateTime, METHOD_LABELS } from "@/lib/format";

function settlement(tx: Transaction): string {
  if (tx.status === "completed") return formatDateTime(tx.occurredAt);
  if (tx.status === "failed") return "Did not settle. No effect on balances.";
  return tx.amountCents < 0
    ? "Not yet settled. Held against available cash."
    : "Not yet settled. Not available until it does.";
}

function NoteEditor({ tx, onSaved }: { tx: Transaction; onSaved: (tx: Transaction) => void }) {
  const id = useId();
  const toast = useToast();
  const saved = tx.note ?? "";
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = value.trim() !== saved;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<Transaction>(`/api/transactions/${encodeURIComponent(tx.id)}`, { note: value });
      setValue(updated.note ?? "");
      onSaved(updated);
      toast({ title: updated.note ? "Note saved" : "Note removed" });
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? (caught.fieldErrors?.note?.[0] ?? caught.message)
          : "Something went wrong. Please try again.";
      setError(message);
      toast({ title: "Couldn't save the note", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-2">
      <label htmlFor={`${id}-note`} className="text-[13px] font-medium text-foreground">
        Note
      </label>
      <Textarea
        id={`${id}-note`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        placeholder="Add context for your team, e.g. what this payment covers"
        aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        className="bg-surface"
      />
      <div className="flex items-center justify-between gap-3">
        <p id={`${id}-count`} className="num text-xs text-muted-foreground">
          {value.length}/{MAX_NOTE_LENGTH} characters
        </p>
        <Button type="submit" size="lg" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function Row({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[13px] break-all text-foreground" : "text-foreground"}>{children}</dd>
    </div>
  );
}

function Details({
  tx,
  accountName,
  onSaved,
}: {
  tx: Transaction;
  accountName: (id: string) => string;
  onSaved: (tx: Transaction) => void;
}) {
  const inflow = tx.amountCents > 0;
  const transfer = isTransferLeg(tx);
  return (
    <>
      <SheetHeader className="gap-3 border-b border-border p-5 pr-12">
        <SheetDescription className="text-[13px]">
          {inflow ? "Money in" : "Money out"} · {accountName(tx.accountId)}
        </SheetDescription>
        <SheetTitle className="text-lg font-semibold">{tx.counterparty}</SheetTitle>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`num text-3xl font-semibold tracking-tight ${inflow ? "text-success" : "text-foreground"}`}>
            {formatMoney(tx.amountCents, { signed: true })}
          </p>
          <StatusBadge status={tx.status} />
        </div>
      </SheetHeader>

      <div className="grid gap-6 overflow-y-auto p-5">
        {transfer ? (
          <p className="flex gap-2 rounded-lg bg-surface-secondary p-3 text-[13px] text-muted-foreground">
            <ArrowLeftRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Internal transfer between your own accounts. Excluded from income, spending and totals.
          </p>
        ) : null}

        <dl className="divide-y divide-border text-[13px]">
          <Row label="Description">{tx.description}</Row>
          <Row label={tx.status === "completed" ? "Created" : "Initiated"}>{formatDateTime(tx.occurredAt)}</Row>
          <Row label="Settled">{settlement(tx)}</Row>
          <Row label="Account">{accountName(tx.accountId)}</Row>
          <Row label="Type">{METHOD_LABELS[tx.method]}</Row>
          <Row label="Category">{categoryLabel(tx.category)}</Row>
          <Row label="Reference" mono>
            {tx.reference}
          </Row>
          {transfer ? (
            <Row label="Transfer ID" mono>
              {tx.transferId}
            </Row>
          ) : null}
          <Row label="Transaction ID" mono>
            {tx.id}
          </Row>
        </dl>

        <NoteEditor key={`${tx.id}:${tx.note ?? ""}`} tx={tx} onSaved={onSaved} />

        <p className="text-xs text-subtle-foreground">Simulated transaction · demo data, no real money moved.</p>
      </div>
    </>
  );
}

/** Focuses the visible list link for `id` (table or card), if it's on this page. */
function focusRow(id: string): boolean {
  const links = document.querySelectorAll<HTMLElement>(`[data-tx-link="${CSS.escape(id)}"]`);
  const visible = [...links].find((link) => link.offsetParent !== null);
  visible?.focus();
  return Boolean(visible);
}

/** Deep-linkable via `?tx=<id>`; fetches the transaction itself so it works for any id, on any page. */
export function TransactionDrawer({
  txId,
  accountName,
  onClose,
  onNoteSaved,
}: {
  txId: string | null;
  accountName: (id: string) => string;
  onClose: () => void;
  onNoteSaved: () => void;
}) {
  // Keep rendering the last transaction while the sheet animates closed.
  const [shownId, setShownId] = useState(txId);
  if (txId && txId !== shownId) setShownId(txId);

  const detail = useApi<Transaction>(shownId ? `/api/transactions/${encodeURIComponent(shownId)}` : null, {
    keepPrevious: true,
  });
  const tx = detail.data?.id === shownId ? detail.data : undefined;

  let body: React.ReactNode;
  if (tx) {
    body = (
      <Details
        tx={tx}
        accountName={accountName}
        onSaved={() => {
          detail.reload();
          onNoteSaved();
        }}
      />
    );
  } else if (detail.error?.status === 404) {
    body = (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <SearchX aria-hidden="true" className="size-6 text-subtle-foreground" />
        <SheetTitle className="text-base font-semibold">Transaction not found</SheetTitle>
        <SheetDescription>
          It may have been removed when the demo data was reset, or the link is incomplete.
        </SheetDescription>
        <Button variant="outline" size="lg" onClick={onClose}>
          Back to transactions
        </Button>
      </div>
    );
  } else if (detail.error) {
    body = (
      <>
        <SheetTitle className="sr-only">Transaction details</SheetTitle>
        <SheetDescription className="sr-only">The transaction could not be loaded.</SheetDescription>
        <ErrorState title="Couldn't load this transaction" message={detail.error.message} onRetry={detail.reload} className="py-16" />
      </>
    );
  } else {
    body = (
      <div className="grid gap-4 p-5" aria-busy="true">
        <SheetTitle className="sr-only">Loading transaction</SheetTitle>
        <SheetDescription className="sr-only">Loading details.</SheetDescription>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-4 h-64" />
      </div>
    );
  }

  return (
    <Sheet open={txId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (shownId && focusRow(shownId)) event.preventDefault();
        }}
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}
