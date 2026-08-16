import { Link } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
import { MoreHorizontal, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TouchArea } from "@/components/ui/touch-area";
import { getFileUrl } from "@/lib/api";
import { formatDateShort, formatSize, stripExtension, cn } from "@/lib/utils";
import { categoryDot, categoryText } from "@/lib/category-colors";
import type { Receipt } from "@/types";

interface ReceiptRowProps {
  r: Receipt;
  onDelete: (id: string) => void;
  className?: string;
}

export function ReceiptRow({ r, onDelete, className }: ReceiptRowProps) {
  const isImage = r.content_type.startsWith("image/");
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "group flex items-center gap-3 border-b border-border py-2.5 last:border-0",
        className
      )}
    >
      <TouchArea className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-background">
        {isImage ? (
          <img
            src={getFileUrl(r.id)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TouchArea>

      <Link to={`/receipts/${r.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {stripExtension(r.filename)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateShort(r.uploaded_at)} &middot; {formatSize(r.size)}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", categoryDot(r.category))}
            title={r.category}
          />
          <Badge variant="outline" className={cn("border-border bg-transparent text-[10px] font-semibold", categoryText(r.category))}>
            {r.category}
          </Badge>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TouchArea asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="เอกสารตัวเลือก"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TouchArea>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDelete(r.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
