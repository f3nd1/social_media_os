"use client";

// Shared numbered pagination used by the AI Generation Log and the Changelog so
// the two screens page identically. Shows Previous/Next plus numbered page
// buttons: every page when there are 10 or fewer, otherwise the first and last
// page with a window around the current page and an ellipsis across each gap.

import { Button } from "@/components/ui/button";

// Build the list of page slots to render. With 10 or fewer pages, show them all.
// With more, always show page 1 and the last page, a window of two either side
// of the current page, and an "ellipsis" marker wherever a gap is skipped.
export function pageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 10) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  if (start > 2) {
    items.push("ellipsis");
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < total - 1) {
    items.push("ellipsis");
  }
  items.push(total);

  return items;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 pt-2">
      <Button
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        size="sm"
        type="button"
        variant="outline"
      >
        Previous
      </Button>

      {pageItems(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span
            aria-hidden="true"
            className="px-1.5 text-sm text-muted-foreground"
            key={`ellipsis-${index}`}
          >
            &hellip;
          </span>
        ) : (
          <Button
            aria-current={item === page ? "page" : undefined}
            key={item}
            onClick={() => onPageChange(item)}
            size="sm"
            type="button"
            variant={item === page ? "default" : "outline"}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        size="sm"
        type="button"
        variant="outline"
      >
        Next
      </Button>
    </div>
  );
}
