const thaiDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const thaiDateTime = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthLabel = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
});

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "วันที่ไม่ถูกต้อง" : thaiDate.format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "วันที่ไม่ถูกต้อง" : thaiDateTime.format(date);
}

export function formatMonth(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ไม่ทราบเดือน" : monthLabel.format(date);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "ขนาดไฟล์ไม่ถูกต้อง";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function isPdf(contentType: string) {
  return contentType === "application/pdf";
}

export function isImage(contentType: string) {
  return contentType.startsWith("image/");
}
