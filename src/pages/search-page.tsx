import { Search, SearchX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/document-list";
import { Input } from "@/components/ui/field";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocuments } from "@/lib/query";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [input, setInput] = useState(urlQuery);
  const queryText = useDebouncedValue(input.trim(), 300);
  const documentsQuery = useDocuments({ query: queryText }, 30, queryText.length > 0);
  const documents = documentsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = documentsQuery.data?.pages[0]?.total;

  useEffect(() => setInput(urlQuery), [urlQuery]);

  function updateQuery(value: string) {
    setInput(value);
    const next = new URLSearchParams();
    if (value.trim()) next.set("q", value.trim());
    setParams(next, { replace: true });
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="ค้นหาเอกสาร" description="ค้นหาจากชื่อไฟล์ หมวดหมู่ โฟลเดอร์ หรือบันทึกข้อมูล" />

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          size={20}
          strokeWidth={1.8}
        />
        <Input
          value={input}
          onChange={(event) => updateQuery(event.target.value)}
          className="min-h-12 pl-11 pr-12"
          type="search"
          placeholder="พิมพ์ชื่อไฟล์หรือคำในบันทึก…"
          aria-label="ค้นหาเอกสาร"
          name="q"
          spellCheck={false}
        />
        {input ? (
          <button
            className="absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
            onClick={() => updateQuery("")}
            aria-label="ล้างคำค้น"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      {!queryText ? (
        <EmptyState
          icon={Search}
          title="ค้นหาจากในคลัง"
          description="พิมพ์ชื่อไฟล์หรือคำในบันทึกข้อมูลเพื่อเริ่มค้นหา"
        />
      ) : null}
      {queryText && documentsQuery.isPending ? (
        <div className="grid gap-2" aria-label="กำลังค้นหา">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : null}
      {queryText && documentsQuery.isError ? (
        <ErrorState error={documentsQuery.error} onRetry={() => void documentsQuery.refetch()} />
      ) : null}
      {queryText && documentsQuery.isSuccess && documents.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="ไม่พบเอกสาร"
          description={`ไม่พบผลลัพธ์สำหรับ “${queryText}” ลองใช้คำที่สั้นลงหรือตรวจสอบการสะกด`}
          action={<Button onClick={() => updateQuery("")}>ล้างคำค้น</Button>}
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
