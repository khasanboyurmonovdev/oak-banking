"use client";

import { CircleAlert, Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { formatMoney } from "@/domain/money";
import { ErrorState } from "@/components/data-state";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { useApi, useRefreshAll } from "@/hooks/use-api";
import { ApiClientError, apiPost } from "@/lib/api-client";
import {
  formErrorsFromApi,
  newIdempotencyKey,
  validateTransferForm,
  type TransferBody,
  type TransferField,
  type TransferFormErrors,
  type TransferFormValues,
} from "@/lib/transfer-form";
import { MAX_TRANSFER_DESCRIPTION_LENGTH } from "@/server/http/schemas";
import type { AccountWithBalance } from "@/server/services/accounts";
import type { TransferResult } from "@/server/services/transfers";

const FIELD_ORDER: readonly TransferField[] = ["fromAccountId", "toAccountId", "amount", "note"];

type Reviewed = { body: TransferBody; amountCents: number; from: AccountWithBalance; to: AccountWithBalance };

function submitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) return "Something went wrong. Please try again.";
  if (error.code === "network_error") {
    return `${error.message} If it was sent, retrying won't book it twice.`;
  }
  if (error.code === "idempotency_conflict") {
    return "An earlier attempt of this transfer may have gone through. Check Transactions before trying again.";
  }
  return error.message;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs text-danger">
      <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function initialValues(accounts: readonly AccountWithBalance[], initialFromId: string | undefined): TransferFormValues {
  const active = accounts.filter((account) => account.status === "active");
  const from = active.find((account) => account.id === initialFromId) ?? active[0];
  const to = active.find((account) => account.id !== from?.id);
  return { fromAccountId: from?.id ?? "", toAccountId: to?.id ?? "", amount: "", note: "" };
}

function TransferFlow({
  accounts,
  initialFromId,
  onBusyChange,
  onDone,
}: {
  accounts: readonly AccountWithBalance[];
  initialFromId: string | undefined;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const refreshAll = useRefreshAll();
  const [values, setValues] = useState(() => initialValues(accounts, initialFromId));
  const [errors, setErrors] = useState<TransferFormErrors>({});
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // One key per dialog open: reused when a failed attempt is retried, replaced after a success.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  // Moving between the form and the review step moves focus to the new step.
  const [focusTarget, setFocusTarget] = useState<"review" | "amount" | null>(null);

  useEffect(() => {
    if (focusTarget === "review") reviewHeadingRef.current?.focus();
    if (focusTarget === "amount") amountRef.current?.focus();
  }, [focusTarget]);

  const fieldId = (field: TransferField) => `${id}-${field}`;
  const describedBy = (field: TransferField, ...extra: string[]) =>
    [...extra, errors[field] ? `${fieldId(field)}-error` : null].filter(Boolean).join(" ") || undefined;

  const from = accounts.find((account) => account.id === values.fromAccountId);

  const setField = (field: TransferField, value: string) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Picking the current destination as the source moves the destination to another account.
      if (field === "fromAccountId" && value === current.toAccountId) {
        next.toAccountId = accounts.find((account) => account.status === "active" && account.id !== value)?.id ?? "";
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateTransferForm(values, accounts);
    const source = accounts.find((account) => account.id === values.fromAccountId);
    const destination = accounts.find((account) => account.id === values.toAccountId);
    if (!result.ok || !source || !destination) {
      const nextErrors = result.ok ? {} : result.errors;
      setErrors(nextErrors);
      const first = FIELD_ORDER.find((field) => nextErrors[field]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setSubmitError(null);
    setReviewed({ body: result.body, amountCents: result.amountCents, from: source, to: destination });
    setFocusTarget("review");
  };

  const confirm = async () => {
    if (!reviewed || submitting) return;
    setSubmitting(true);
    onBusyChange(true);
    setSubmitError(null);
    try {
      const result = await apiPost<TransferResult>("/api/transfers", reviewed.body, { "Idempotency-Key": idempotencyKey });
      setIdempotencyKey(newIdempotencyKey());
      refreshAll();
      toast({
        title: "Transfer complete",
        description: `${formatMoney(reviewed.amountCents)} moved from ${reviewed.from.name} to ${reviewed.to.name}. Simulated, no real money moved.`,
        action: { label: "View transaction", href: `/transactions?tx=${encodeURIComponent(result.legs[0].id)}` },
      });
      setSubmitting(false);
      onBusyChange(false);
      onDone();
    } catch (error) {
      setSubmitError(submitErrorMessage(error));
      if (error instanceof ApiClientError) {
        setErrors(formErrorsFromApi(error.fieldErrors));
        // Balances changed elsewhere (another tab, a reset): show the current ones.
        if (error.code === "insufficient_funds" || error.code === "idempotency_conflict") refreshAll();
      }
      setSubmitting(false);
      onBusyChange(false);
    }
  };

  if (reviewed) {
    const availableAfter = reviewed.from.balance.availableCents - reviewed.amountCents;
    return (
      <>
        <div className="grid gap-4 p-5">
          <h3 ref={reviewHeadingRef} tabIndex={-1} className="sr-only">
            Review transfer
          </h3>
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-[13px] text-muted-foreground">Amount</p>
            <p className="num mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {formatMoney(reviewed.amountCents)}
            </p>
          </div>
          <dl className="divide-y divide-border text-[13px]">
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">From</dt>
              <dd className="text-foreground">
                {reviewed.from.name} <span className="font-mono text-muted-foreground">{reviewed.from.maskedNumber}</span>
              </dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">To</dt>
              <dd className="text-foreground">
                {reviewed.to.name} <span className="font-mono text-muted-foreground">{reviewed.to.maskedNumber}</span>
              </dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">Note</dt>
              <dd className="break-words text-foreground">{reviewed.body.description ?? "None"}</dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">Available after</dt>
              <dd className="num text-foreground">
                {formatMoney(availableAfter)} in {reviewed.from.name}
              </dd>
            </div>
          </dl>
          <p className="flex gap-2 rounded-lg bg-info-background p-3 text-[13px] text-info">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Simulated transfer – no real money moves.
          </p>
          {submitError ? (
            <p role="alert" className="flex gap-2 rounded-lg bg-danger-background p-3 text-[13px] text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {submitError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            disabled={submitting}
            onClick={() => {
              setReviewed(null);
              setFocusTarget("amount");
            }}
          >
            Back
          </Button>
          <Button size="lg" disabled={submitting} onClick={confirm}>
            {submitting ? "Moving money…" : submitError ? "Try again" : "Confirm transfer"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={review} noValidate>
      <div className="grid gap-4 p-5">
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("fromAccountId")} className="text-[13px] font-medium text-foreground">
            From
          </label>
          <NativeSelect
            id={fieldId("fromAccountId")}
            value={values.fromAccountId}
            onChange={(event) => setField("fromAccountId", event.target.value)}
            aria-invalid={errors.fromAccountId ? true : undefined}
            aria-describedby={describedBy("fromAccountId", `${id}-available`)}
          >
            <option value="" disabled>
              Choose an account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id} disabled={account.status !== "active"}>
                {account.name} {account.maskedNumber}
              </option>
            ))}
          </NativeSelect>
          <p id={`${id}-available`} className="text-xs text-muted-foreground">
            {from ? (
              <>
                Available: <span className="num font-medium text-foreground">{formatMoney(from.balance.availableCents)}</span>
                {from.balance.holdsCents > 0 ? ` after ${formatMoney(from.balance.holdsCents)} in pending holds` : null}
              </>
            ) : (
              "Choose an account to see its available balance."
            )}
          </p>
          <FieldError id={`${fieldId("fromAccountId")}-error`} message={errors.fromAccountId} />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={fieldId("toAccountId")} className="text-[13px] font-medium text-foreground">
            To
          </label>
          <NativeSelect
            id={fieldId("toAccountId")}
            value={values.toAccountId}
            onChange={(event) => setField("toAccountId", event.target.value)}
            aria-invalid={errors.toAccountId ? true : undefined}
            aria-describedby={describedBy("toAccountId")}
          >
            <option value="" disabled>
              Choose an account
            </option>
            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
                disabled={account.status !== "active" || account.id === values.fromAccountId}
              >
                {account.name} {account.maskedNumber}
              </option>
            ))}
          </NativeSelect>
          <FieldError id={`${fieldId("toAccountId")}-error`} message={errors.toAccountId} />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={fieldId("amount")} className="text-[13px] font-medium text-foreground">
            Amount (USD)
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
            >
              $
            </span>
            <Input
              ref={amountRef}
              id={fieldId("amount")}
              value={values.amount}
              onChange={(event) => setField("amount", event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              maxLength={20}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={describedBy("amount")}
              className="num h-9 bg-surface pl-6"
            />
          </div>
          <FieldError id={`${fieldId("amount")}-error`} message={errors.amount} />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={fieldId("note")} className="text-[13px] font-medium text-foreground">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id={fieldId("note")}
            value={values.note}
            onChange={(event) => setField("note", event.target.value)}
            maxLength={MAX_TRANSFER_DESCRIPTION_LENGTH}
            autoComplete="off"
            placeholder="e.g. Payroll funding for the 15th"
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describedBy("note", `${id}-note-hint`)}
            className="h-9 bg-surface"
          />
          <p id={`${id}-note-hint`} className="text-xs text-muted-foreground">
            Used as the description on both sides of the transfer.
          </p>
          <FieldError id={`${fieldId("note")}-error`} message={errors.note} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" size="lg">
          Review transfer
        </Button>
      </div>
    </form>
  );
}

/** Mounted only while the dialog is open, so every open starts fresh (new form, new idempotency key). */
function MoveMoneyBody({
  initialFromId,
  onBusyChange,
  onDone,
}: {
  initialFromId: string | undefined;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const accounts = useApi<AccountWithBalance[]>("/api/accounts");

  let content: React.ReactNode;
  if (accounts.data) {
    content = (
      <TransferFlow accounts={accounts.data} initialFromId={initialFromId} onBusyChange={onBusyChange} onDone={onDone} />
    );
  } else if (accounts.error) {
    content = <ErrorState title="Couldn't load your accounts" message={accounts.error.message} onRetry={accounts.reload} />;
  } else {
    content = (
      <div className="grid gap-4 p-5" aria-busy="true" aria-label="Loading accounts">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border p-5 pr-12">
        <DialogTitle className="text-base font-semibold">Move money</DialogTitle>
        <DialogDescription className="mt-1 text-[13px]">
          Transfer between your own Oak accounts. Demo only: simulated, no real money moves.
        </DialogDescription>
      </div>
      {content}
    </>
  );
}

export function MoveMoneyDialog({
  open,
  onOpenChange,
  initialFromId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFromId: string | undefined;
}) {
  // While a transfer is in flight the dialog can't be dismissed, so its outcome is always shown.
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <MoveMoneyBody initialFromId={initialFromId} onBusyChange={setBusy} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
