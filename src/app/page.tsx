import { Suspense } from "react";

import { OverviewSkeleton, OverviewView } from "@/components/overview/overview-view";

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewView />
    </Suspense>
  );
}
