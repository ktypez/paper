import { FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { documentFileUrl } from "@/lib/api";
import { formatBytes, formatDate, formatMonth, isImage } from "@/lib/format";
import type { DocumentRecord } from "@/lib/types";

function DocumentThumbnail({ document }: { document: DocumentRecord }) {
  const [failure, setFailure] = useState<{ id: string; variant: "preview" | "original" }>();
  const currentFailure = failure?.id === document.id ? failure : undefined;
  const variant = document.hasPreview && currentFailure?.variant !== "preview" ? "preview" : "original";

  if (!isImage(document.contentType) || currentFailure?.variant === "original") {
    return (
      <div className="grid size-14 shrink-0 place-items-center rounded-[10px] border border-line bg-raised text-muted">
        <FileText aria-hidden="true" size={24} strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-[10px] border border-line bg-raised">
      <img
        src={documentFileUrl(document.id, variant)}
        alt=""
        className="size-full object-cover"
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        onError={() => setFailure({ id: document.id, variant })}
      />
    </div>
  );
}

type Row =
  | { kind: "month"; id: string; label: string }
  | { kind: "document"; id: string; document: DocumentRecord };

function buildRows(documents: DocumentRecord[]) {
  const rows: Row[] = [];
  let month = "";
  for (const document of documents) {
    const label = formatMonth(document.uploadedAt);
    if (label !== month) {
      month = label;
      rows.push({ kind: "month", id: `month-${month}`, label });
    }
    rows.push({ kind: "document", id: document.id, document });
  }
  return rows;
}

export function DocumentList({
  documents,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: {
  documents: DocumentRecord[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => buildRows(documents), [documents]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage || !onLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div className="overflow-hidden rounded-sheet border border-line bg-surface">
      <div role="list" aria-label="เอกสาร">
        {rows.map((row) =>
          row.kind === "month" ? (
            <div
              key={row.id}
              role="listitem"
              className="border-b border-line bg-raised/60 px-4 py-2 text-xs font-medium text-muted"
            >
              {row.label}
            </div>
          ) : (
            <div
              key={row.id}
              role="listitem"
              className="border-b border-line [contain-intrinsic-size:80px] [content-visibility:auto] last:border-b-0"
            >
              <Link
                to={`/d/${encodeURIComponent(row.document.id)}`}
                className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:min-h-[76px] sm:px-4"
                aria-label={`${row.document.filename}, ${row.document.category}, วันที่ ${formatDate(row.document.uploadedAt)}`}
              >
                <DocumentThumbnail document={row.document} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink sm:text-[15px]">
                    {row.document.filename}
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted">
                    <span className="truncate">{row.document.category}</span>
                    {row.document.owner ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{row.document.owner}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="text-right text-xs leading-5 text-muted">
                  <p>{formatDate(row.document.uploadedAt)}</p>
                  <p className="tabular-nums">{formatBytes(row.document.size)}</p>
                </div>
              </Link>
            </div>
          ),
        )}
      </div>

      {hasNextPage ? (
        <div ref={sentinel} className="flex min-h-16 items-center justify-center border-t border-line px-4">
          <Button variant="ghost" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "กำลังโหลดเพิ่ม…" : "โหลดเพิ่ม"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
