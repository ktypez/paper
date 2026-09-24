import { FilterX, FolderOpen, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/document-list";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { NativeSelect } from "@/components/ui/field";
import { useCategories, useDocuments, useSummary } from "@/lib/query";

function LibrarySkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const owner = params.get("owner") ?? "";
  const categories = useCategories();
  const summary = useSummary();
  const documentsQuery = useDocuments({ category, owner });
  const documents = documentsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = documentsQuery.data?.pages[0]?.total;
  const hasFilters = Boolean(category || owner);

  function setFilter(name: "category" | "owner", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="คลังเอกสาร"
        description="เลือกดูเอกสารทั้งหมดตามหมวดหมู่หรือโฟลเดอร์"
        action={
          <Button asChild variant="primary">
            <Link to="/capture">
              <Plus aria-hidden="true" size={17} strokeWidth={2} />
              เพิ่มเอกสาร
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 rounded-sheet border border-line bg-surface p-4 sm:grid-cols-2" aria-label="ตัวกรองเอกสาร">
        <div className="grid gap-1.5">
          <label htmlFor="library-category" className="text-xs font-medium text-muted">
            หมวดหมู่
          </label>
          <NativeSelect
            id="library-category"
            name="category"
            value={category}
            onChange={(event) => setFilter("category", event.target.value)}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.data?.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} ({item.documentCount})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="library-owner" className="text-xs font-medium text-muted">
            โฟลเดอร์หรือเจ้าของ
          </label>
          <NativeSelect
            id="library-owner"
            name="owner"
            value={owner}
            onChange={(event) => setFilter("owner", event.target.value)}
          >
            <option value="">ทุกโฟลเดอร์</option>
            {summary.data?.owners.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="small"
            className="justify-start sm:col-span-2"
            onClick={() => setParams({}, { replace: true })}
          >
            <FilterX aria-hidden="true" size={17} strokeWidth={1.8} />
            ล้างตัวกรอง
          </Button>
        ) : null}
      </section>

      {documentsQuery.isPending ? <LibrarySkeleton /> : null}
      {documentsQuery.isError ? (
        <ErrorState error={documentsQuery.error} onRetry={() => void documentsQuery.refetch()} />
      ) : null}
      {documentsQuery.isSuccess && documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={hasFilters ? "ไม่พบเอกสารที่ตรงกับตัวกรอง" : "คลังเอกสารยังว่าง"}
          description={
            hasFilters
              ? "ลองเลือกหมวดหมู่หรือโฟลเดอร์อื่น หรือล้างตัวกรอง"
              : "เพิ่มเอกสารแรกเพื่อเริ่มใช้งานคลัง"
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                ล้างตัวกรอง
              </Button>
            ) : (
              <Button asChild variant="primary">
                <Link to="/capture">เพิ่มเอกสาร</Link>
              </Button>
            )
          }
        />
      ) : null}
      {documents.length > 0 ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            พบ {total ?? documents.length} ฉบับ
          </p>
          <DocumentList
            documents={documents}
            hasNextPage={documentsQuery.hasNextPage}
            isFetchingNextPage={documentsQuery.isFetchingNextPage}
            onLoadMore={() => void documentsQuery.fetchNextPage()}
          />
        </div>
      ) : null}
    </div>
  );
}
