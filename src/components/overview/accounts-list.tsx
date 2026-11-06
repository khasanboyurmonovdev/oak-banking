import { ChevronRight, CircleCheck, CircleMinus } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/domain/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/format";
import type { AccountWithBalance } from "@/server/services/accounts";

/** Each account links to its transactions. */
export function AccountsList({ accounts }: { accounts: readonly AccountWithBalance[] }) {
  return (
    <section aria-labelledby="accounts-title" className="rounded-xl border border-border bg-surface">
      <div className="px-5 pt-5 pb-3 md:px-6">
        <h2 id="accounts-title" className="text-base font-semibold text-foreground">
          Accounts
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Ledger balances, USD</p>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {accounts.map((account) => {
          const active = account.status === "active";
          const StatusIcon = active ? CircleCheck : CircleMinus;
          return (
            <li key={account.id}>
              <Link
                href={`/transactions?account=${account.id}`}
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-secondary focus-visible:-outline-offset-2 md:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{account.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{ACCOUNT_TYPE_LABELS[account.kind]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{account.maskedNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className={active ? "inline-flex items-center gap-1 text-success" : "inline-flex items-center gap-1"}>
                      <StatusIcon aria-hidden="true" className="size-3" />
                      {active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="num font-medium text-foreground">{formatMoney(account.balance.ledgerCents)}</p>
                  {account.balance.holdsCents > 0 ? (
                    <p className="num mt-0.5 text-xs text-muted-foreground">
                      {formatMoney(account.balance.availableCents)} available
                    </p>
                  ) : null}
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
