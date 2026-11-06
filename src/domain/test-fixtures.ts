// Builders for hand-written test data. Test-only: not exported from index.ts.
import type { Account, ExternalTransaction, TransferLeg } from "./types";

export function makeAccount(overrides: Partial<Account> & Pick<Account, "id">): Account {
  return {
    name: overrides.id,
    kind: "operating",
    currency: "USD",
    openingBalanceCents: 0,
    openedAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    maskedNumber: "•••• 0000",
    ...overrides,
  };
}

let sequence = 0;

export function makeTx(
  overrides: Partial<ExternalTransaction> & Pick<ExternalTransaction, "accountId" | "amountCents">,
): ExternalTransaction {
  sequence += 1;
  return {
    id: `tx_${String(sequence).padStart(4, "0")}`,
    counterparty: "Test Counterparty",
    description: "Test transaction",
    category: overrides.amountCents > 0 ? "customer_payment" : "software",
    method: "ach",
    status: "completed",
    occurredAt: "2026-06-15T12:00:00.000Z",
    reference: `OAK-T${String(sequence).padStart(5, "0")}`,
    ...overrides,
  };
}

export function makeTransfer(
  fromAccountId: string,
  toAccountId: string,
  amountCents: number,
  occurredAt = "2026-06-15T12:00:00.000Z",
): [TransferLeg, TransferLeg] {
  sequence += 1;
  const transferId = `trf_test_${sequence}`;
  const shared = {
    method: "transfer",
    category: "internal_transfer",
    status: "completed",
    occurredAt,
    reference: `OAK-X${sequence}`,
    transferId,
    counterparty: "Own account",
    description: "Test transfer",
  } as const;
  return [
    { ...shared, id: `${transferId}_out`, accountId: fromAccountId, amountCents: -amountCents },
    { ...shared, id: `${transferId}_in`, accountId: toAccountId, amountCents },
  ];
}
