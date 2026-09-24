import { Archive, FilePlus2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/document-list";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { useDocuments } from "@/lib/query";

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-sheet border border-line bg-surface" aria-label="กำลังโหลดเอกสารล่าสุด">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-20 items-center gap-3 border-b border-line px-3 last:border-0 sm:px-4">
          <Skeleton className="size-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function RecentPage() {
  const query = useDocuments({}, 12);
  const documents = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="เอกสารล่าสุด"
        description={typeof total === "number" ? `มีทั้งหมด ${total} ฉบับในคลัง` : "เอกสารที่เพิ่มเข้ามาล่าสุด"}
        action={
          <Button asChild variant="secondary">
            <Link to="/library">
              <Archive aria-hidden="true" size={17} strokeWidth={1.8} />
              ดูทั้งหมด
            </Link>
          </Button>
        }
      />

      {query.isPending ? <ListSkeleton /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && documents.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="ยังไม่มีเอกสาร"
          description="เพิ่มรูปภาพหรือ PDF แรกเพื่อเริ่มสร้างคลังเอกสารของคุณ"
          action={
            <Button asChild variant="primary">
              <Link to="/capture">เพิ่มเอกสาร</Link>
            </Button>
          }
        />
      ) : null}
      {documents.length > 0 ? (
        <DocumentList
          documents={documents}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      ) : null}
    </div>
  );
}
