import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Trash2, LayoutGrid, TableIcon, AlertCircle, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TouchArea } from "@/components/ui/touch-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReceipts } from "@/hooks/use-receipts";
import { useCategories } from "@/hooks/use-categories";
import { useMediaQuery } from "@/lib/use-media-query";
import { ArchiveStack } from "@/components/archive-stack";

import { getFileUrl } from "@/lib/api";
import { stripExtension } from "@/lib/utils";
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      toast.success("Document deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
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
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">All Documents</CardTitle>
          <Button asChild>
            <Link to="/upload">
              <Plus className="mr-1 h-4 w-4" /> Upload
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by filename or notes..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={handleOwnerChange}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              Loading...
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <ArchiveStack />
              <div className="space-y-1">
                <h3 className="font-display text-lg text-foreground">
                  {receipts.length === 0
                    ? "ยังไม่มีเอกสาร"
                    : "ไม่พบเอกสารที่ตรงกับเงื่อนไข"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {receipts.length === 0
                    ? "อัปโหลดเอกสารแรกของคุณ โดยเริ่มจากปุ่ม Upload ด้านบน"
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
                  <FilterX className="mr-1 h-4 w-4" /> Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-end gap-1">
                {isDesktop && (
                  <>
                    <Button
                      variant={view === "table" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setView("table")}
                    >
                      <TableIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={view === "card" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setView("card")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

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
                        <TableHead>File</TableHead>
                        <TableHead className="min-w-[200px]">Filename</TableHead>
                        <TableHead className="min-w-[140px]">Category</TableHead>
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
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TouchArea>
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              to={`/receipts/${r.id}`}
                              className="hover:underline"
                            >
                              {stripExtension(r.filename)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary">{r.category}</Badge>
                              {r.owner && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  {r.owner}
                                </Badge>
                              )}
                            </div>
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
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                >
                  {paged.map((r) => (
                    <div
                      key={r.id}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <Link to={`/receipts/${r.id}`}>
                        <div className="flex aspect-[4/3] items-center justify-center bg-background">
                          {r.content_type.startsWith("image/") ? (
                            <img
                              src={getFileUrl(r.id)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                      <div className="p-2">
                        <Link
                          to={`/receipts/${r.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {stripExtension(r.filename)}
                        </Link>
                        <div className="mt-1 flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {r.category}
                          </Badge>
                          {r.owner && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              {r.owner}
                            </Badge>
                          )}
                          <Dialog
                            open={deleteId === r.id}
                            onOpenChange={(open) =>
                              setDeleteId(open ? r.id : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto text-destructive/60 opacity-0 hover:text-destructive group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete document</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete{" "}
                                  <strong>{r.filename}</strong>? This action
                                  cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDelete}
                                  disabled={deleting}
                                >
                                  {deleting ? "Deleting..." : "Delete"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
              </AnimatePresence>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}-
                  {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="default"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
