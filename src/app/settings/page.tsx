import type { Metadata } from "next";

import { SEED_COMPANY } from "@/domain/seed";
import { PageHeader } from "@/components/page-header";
import { ResetDemoData } from "@/components/settings/reset-demo-data";

export const metadata: Metadata = {
  title: "Settings",
};

const DISCLOSURES: readonly { title: string; body: string }[] = [
  {
    title: "Fictional company",
    body: `${SEED_COMPANY.name}, its people, accounts, account numbers, counterparties and transactions are invented for this demo.`,
  },
  {
    title: "Simulated transfers",
    body: "Moving money only updates demo records. Oak Banking is not connected to any bank or payment provider, and no real money moves.",
  },
  {
    title: "Your private sandbox",
    body: "Your data is a private copy tied to this browser by a session cookie. Other visitors can't see or change it. It expires after a period of inactivity (72 hours by default), and you then get a fresh copy.",
  },
  {
    title: "HTTP demo",
    body: "This demo is served over plain HTTP, without TLS. Don't enter anything you'd want to keep private.",
  },
];

export default function SettingsPage() {
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Settings" description="Demo data and disclosures" />

      <section aria-labelledby="reset-title" className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <h2 id="reset-title" className="text-base font-semibold text-foreground">
          Demo data
        </h2>
        <p className="mt-1 text-muted-foreground">
          Restore the original sample accounts and transactions. This removes the transfers and notes you added.
        </p>
        <div className="mt-4">
          <ResetDemoData />
        </div>
      </section>

      <section aria-labelledby="about-title" className="rounded-xl border border-border bg-surface">
        <div className="px-5 pt-5 pb-3 md:px-6">
          <h2 id="about-title" className="text-base font-semibold text-foreground">
            About this demo
          </h2>
          <p className="mt-1 text-muted-foreground">
            Oak Banking is a technical case study of a business-banking dashboard. All banking is simulated.
          </p>
        </div>
        <dl className="divide-y divide-border border-t border-border">
          {DISCLOSURES.map(({ title, body }) => (
            <div key={title} className="grid gap-1 px-5 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6 md:px-6">
              <dt className="font-medium text-foreground">{title}</dt>
              <dd className="text-muted-foreground">{body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
