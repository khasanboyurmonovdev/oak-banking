import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return <PageHeader title="Transactions" description="Activity across all accounts." />;
}
