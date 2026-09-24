import type { LucideIcon } from "lucide-react";
import { AlertCircle, ExternalLink, Inbox, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "./button";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-[16px] border border-line bg-surface text-muted">
          <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
        </div>
        <h2 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  error,
  onRetry,
}: {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  const accessDenied = error instanceof ApiError && (error.status === 401 || error.status === 403);
  const resolvedTitle = title ?? (accessDenied ? "ยังไม่มีสิทธิ์ใช้งาน Paper" : "โหลดข้อมูลไม่สำเร็จ");
  const resolvedDescription =
    description ??
    (accessDenied
      ? "บัญชีที่เข้าสู่ระบบยังไม่มีสิทธิ์ใช้งานแอปนี้"
      : error instanceof Error
        ? error.message
        : "เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาตรวจสอบเครือข่ายแล้วลองอีกครั้ง");

  return (
    <div className="grid min-h-64 place-items-center px-5 py-12 text-center" role="alert">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-[16px] bg-accent-quiet text-accent">
          <AlertCircle aria-hidden="true" size={22} strokeWidth={1.8} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-ink">{resolvedTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{resolvedDescription}</p>
        {accessDenied ? (
          <Button asChild className="mt-5">
            <a href="https://me.mcky.space" target="_blank" rel="noreferrer">
              จัดการสิทธิ์
              <ExternalLink aria-hidden="true" size={17} strokeWidth={1.8} />
            </a>
          </Button>
        ) : onRetry ? (
          <Button className="mt-5" onClick={onRetry}>
            <RotateCcw aria-hidden="true" size={17} strokeWidth={1.8} />
            ลองอีกครั้ง
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-ink/[0.08] ${className}`} aria-hidden="true" />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="break-words text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-[56ch] text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
