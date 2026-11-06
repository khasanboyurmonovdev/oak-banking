import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const count = new Intl.NumberFormat("en-US");

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min(total, (page - 1) * pageSize + 1);
  const last = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-muted-foreground">
      <p className="num">
        {count.format(first)}–{count.format(last)} of {count.format(total)}
      </p>
      <div className="flex items-center gap-2">
        <span className="num hidden sm:inline">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="icon-lg" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden="true" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button variant="outline" size="icon-lg" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight aria-hidden="true" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </nav>
  );
}
