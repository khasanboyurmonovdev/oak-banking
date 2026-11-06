"use client";

import { SEED_COMPANY } from "@/domain/seed";
import { EmptyState, ErrorState } from "@/components/data-state";
import { MoveMoneyButton } from "@/components/move-money/move-money-provider";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { AccountWithBalance } from "@/server/services/accounts";

import { AccountCard } from "./account-card";

const DESCRIPTION = `${SEED_COMPANY.name} · Balances in USD`;

export function AccountsView() {
  const accounts = useApi<AccountWithBalance[]>("/api/accounts");

  let content: React.ReactNode;
  if (accounts.data && accounts.data.length > 0) {
    content = (
      <div className="grid gap-6 xl:grid-cols-3">
        {accounts.data.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    );
  } else if (accounts.data) {
    content = (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState title="No accounts yet" description="Reset the demo data in Settings to restore the sample accounts." />
      </div>
    );
  } else if (accounts.error) {
    content = (
      <div className="rounded-xl border border-border bg-surface">
        <ErrorState title="Couldn't load your accounts" message={accounts.error.message} onRetry={accounts.reload} />
      </div>
    );
  } else {
    content = (
      <div className="grid gap-6 xl:grid-cols-3" aria-busy="true" aria-label="Loading accounts">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[34rem] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Accounts" description={DESCRIPTION} actions={<MoveMoneyButton />} />
      {content}
    </div>
  );
}
