import type { Metadata } from "next";
import { Suspense } from "react";

import { TransactionsSkeleton, TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsView />
    </Suspense>
  );
}
