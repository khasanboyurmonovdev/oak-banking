import {
  cashFlowSeries,
  categorySpend,
  consolidatedBalance,
  periodSummary,
  runwayEstimate,
  type RangeKey,
} from "@/domain";
import { now } from "../clock";
import type { Database } from "../db";
import { withBalance } from "./accounts";
import { loadSandbox } from "./sandbox";

/** Everything the Overview page needs for one range, computed by domain selectors. */
export function getOverview(db: Database, sessionId: string, range: RangeKey) {
  const at = now();
  const { accounts, transactions } = loadSandbox(db, sessionId);
  const consolidated = consolidatedBalance(accounts, transactions);
  return {
    asOf: at.toISOString(),
    range,
    accounts: accounts.map((account) => withBalance(account, transactions)),
    consolidated,
    period: periodSummary(transactions, range, at),
    cashFlow: cashFlowSeries(transactions, accounts, range, at),
    categorySpend: categorySpend(transactions, range, at),
    runway: runwayEstimate(consolidated.availableCents, transactions, at),
  };
}

export type Overview = ReturnType<typeof getOverview>;
