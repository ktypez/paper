import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, LayoutGrid, TableIcon, AlertCircle, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TouchArea } from "@/components/ui/touch-area";
import { ReceiptRow } from "@/components/receipt-row";
import { Card, CardContent } from "@/components/ui/card";
import { useReceipts } from "@/hooks/use-receipts";
import { useCategories } from "@/hooks/use-categories";
import { useMediaQuery } from "@/lib/use-media-query";
import { PaperPlane } from "@/components/paper-plane";

import { getFileUrl } from "@/lib/api";
import { stripExtension, formatDateShort, formatSize, cn } from "@/lib/utils";
import { categoryDot } from "@/lib/category-colors";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export function Receipts() {
  const { receipts, loading, error, remove, reload } = useReceipts();
  const { categories } = useCategories();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "card">("card");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-switch to card view on mobile/tablet
  const effectiveView = isDesktop ? view : "card";

  const owners = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.owner) set.add(r.owner);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [receipts]);

  const filtered = useMemo(() => {
    let items = receipts;
    if (categoryFilter && categoryFilter !== "all") {
      items = items.filter((r) => r.category === categoryFilter);
    }
    if (ownerFilter && ownerFilter !== "all") {
      items = items.filter((r) => r.owner === ownerFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.filename.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.owner && r.owner.toLowerCase().includes(q))
      );
    }
    return items;
  }, [receipts, categoryFilter, ownerFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Keep the current page in bounds when a delete or filter shrinks the list.
  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      toast.success("ลบเอกสารแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleOwnerChange = (value: string) => {
    setOwnerFilter(value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={reload}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-3">
          {/* Compact filter bar */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเอกสาร..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <Button asChild className="h-11 shrink-0">
              <Link to="/upload">
                <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">อัปโหลด</span>
                <span className="sm:hidden">อัปโหลด</span>
              </Link>
            </Button>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-11 w-full sm:w-40">
                <SelectValue placeholder="หมวดหมู่ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={handleOwnerChange}>
              <SelectTrigger className="h-11 w-full sm:w-40">
                <SelectValue placeholder="เจ้าของทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">เจ้าของทั้งหมด</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              {isDesktop && (
                <>
                  <Button
                    variant={view === "table" ? "default" : "ghost"}
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setView("table")}
                    aria-label="มุมมองตาราง"
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === "card" ? "default" : "ghost"}
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setView("card")}
                    aria-label="มุมมองรายการ"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-sm" />
                </div>
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <PaperPlane />
              <div className="space-y-1">
                <h3 className="font-display text-base text-foreground">
                  {receipts.length === 0
                    ? "ยังไม่มีเอกสาร"
                    : "ไม่พบเอกสารที่ตรงกับเงื่อนไข"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {receipts.length === 0
                    ? "อัปโหลดเอกสารแรกของคุณ โดยเริ่มจากปุ่มอัปโหลดด้านบน"
                    : "ลองปรับคำค้นหรือตัวกรอง แล้วลองอีกครั้ง"}
                </p>
              </div>
              {receipts.length > 0 && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setOwnerFilter("all");
                    setPage(1);
                  }}
                >
                  <FilterX className="mr-1 h-4 w-4" /> ล้างตัวกรอง
                </Button>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                {effectiveView === "table" ? (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-x-auto rounded-md border"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">File</TableHead>
                          <TableHead className="min-w-[200px] text-xs">Filename</TableHead>
                          <TableHead className="min-w-[140px] text-xs">Category</TableHead>
                          <TableHead className="min-w-[110px] text-xs">Date</TableHead>
                          <TableHead className="text-xs">Size</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paged.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Link to={`/receipts/${r.id}`}>
                                <TouchArea className="overflow-hidden rounded-md border border-border bg-background hover:ring-2 hover:ring-ring">
                                  {r.content_type.startsWith("image/") ? (
                                    <img
                                      src={getFileUrl(r.id)}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </TouchArea>
                              </Link>
                            </TableCell>
                            <TableCell className="font-medium">
                              <Link to={`/receipts/${r.id}`} className="hover:underline">
                                {stripExtension(r.filename)}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={cn("h-2 w-2 rounded-full", categoryDot(r.category))} />
                                <Badge variant="secondary" className="text-[11px] font-medium">
                                  {r.category}
                                </Badge>
                                {r.owner && (
                                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                    {r.owner}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatDateShort(r.uploaded_at)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatSize(r.size)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </motion.div>
                ) : (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div>
                      {paged.map((r) => (
                        <ReceiptRow key={r.id} r={r} onDelete={setDeleteId} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="default"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบเอกสาร</DialogTitle>
            <DialogDescription>
              ต้องการลบเอกสารนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
