// v2 API client: cursor pagination, server-side filter/search, single-item
// fetch, uploads with client-generated thumbnails + progress, offline queue.
import { get, set, del, keys } from "idb-keyval";

export interface Receipt {
  id: string;
  filename: string;
  category: string;
  owner: string | null;
  content_type: string;
  size: number;
  uploaded_at: string;
  notes: string | null;
  thumb_key: string | null;
}

export interface ReceiptPage {
  items: Receipt[];
  nextCursor: string | null;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  sort_order: number;
  count: number;
}

export interface ListParams {
  cursor?: string | null;
  limit?: number;
  category?: string | null;
  owner?: string | null;
  q?: string | null;
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listReceipts(p: ListParams = {}): Promise<ReceiptPage> {
  const q = new URLSearchParams();
  if (p.cursor) q.set("cursor", p.cursor);
  if (p.limit) q.set("limit", String(p.limit));
  if (p.category) q.set("category", p.category);
  if (p.owner) q.set("owner", p.owner);
  if (p.q) q.set("q", p.q);
  const s = q.toString();
  return req(`/api/v2/receipts${s ? `?${s}` : ""}`);
}

export function getReceipt(id: string): Promise<Receipt> {
  return req(`/api/v2/receipts/${id}`);
}

export function updateReceipt(
  id: string,
  patch: Partial<Pick<Receipt, "filename" | "category" | "owner" | "notes">>
): Promise<Receipt> {
  return req(`/api/v2/receipts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteReceipt(id: string): Promise<void> {
  return req(`/api/v2/receipts/${id}`, { method: "DELETE" }).then(() => undefined);
}

export function listCategories(): Promise<Category[]> {
  return req("/api/v2/categories");
}

export function thumbUrl(r: Pick<Receipt, "id">): string {
  return `/api/v2/files/${r.id}?variant=thumb`;
}

export function origUrl(r: Pick<Receipt, "id">): string {
  return `/api/v2/files/${r.id}?variant=orig`;
}

export function isImage(r: Pick<Receipt, "content_type">): boolean {
  return r.content_type.startsWith("image/");
}

// --- Thumbnails (client-generated at upload; ~10-30KB each) ---

const THUMB_MAX = 320;
const THUMB_QUALITY = 0.72;

export async function makeThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, THUMB_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/webp", quality: THUMB_QUALITY });
  }
  return new Promise<Blob>((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("เข้ารหัสรูปไม่สำเร็จ"))),
      "image/webp",
      THUMB_QUALITY
    )
  );
}

// --- Upload with progress ---

export interface UploadMeta {
  category: string;
  owner?: string | null;
  notes?: string | null;
}

export function uploadReceipt(
  file: File,
  meta: UploadMeta,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<Receipt> {
  return (async () => {
    let thumb: Blob | null = null;
    if (file.type.startsWith("image/")) {
      try {
        thumb = await makeThumbnail(file);
      } catch {
        thumb = null;
      }
    }
    const form = new FormData();
    form.append("file", file, file.name);
    if (thumb) form.append("thumb", thumb, "thumb.webp");
    form.append("category", meta.category);
    if (meta.owner) form.append("owner", meta.owner);
    if (meta.notes) form.append("notes", meta.notes);

    return new Promise<Receipt>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      signal?.addEventListener("abort", () => xhr.abort());
      xhr.open("POST", "/api/v2/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new Error(body?.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("อัปโหลดล้มเหลว"));
      xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
      xhr.send(form);
    });
  })();
}

// --- Offline outbox (IndexedDB): queue uploads while offline ---

export interface QueuedUpload {
  key: string;
  file: File;
  thumb: Blob | null;
  meta: UploadMeta;
  createdAt: number;
  tries: number;
}

const outboxKey = (k: string) => `outbox:${k}`;

export async function enqueueUpload(file: File, meta: UploadMeta): Promise<string> {
  let thumb: Blob | null = null;
  if (file.type.startsWith("image/")) {
    try {
      thumb = await makeThumbnail(file);
    } catch {
      thumb = null;
    }
  }
  const key = crypto.randomUUID();
  await set(outboxKey(key), {
    key,
    file,
    thumb,
    meta,
    createdAt: Date.now(),
    tries: 0,
  } satisfies QueuedUpload);
  // Nudge the service worker's Background Sync (best-effort).
  try {
    const reg = await navigator.serviceWorker.ready;
    await (reg as unknown as { sync: { register: (t: string) => Promise<void> } }).sync.register(
      "paper-uploads"
    );
  } catch {
    /* sync not supported — online handler drains instead */
  }
  return key;
}

export async function listQueuedUploads(): Promise<QueuedUpload[]> {
  const all = await keys();
  const items: QueuedUpload[] = [];
  for (const k of all) {
    if (typeof k === "string" && k.startsWith("outbox:")) {
      const v = await get<QueuedUpload>(k);
      if (v) items.push(v);
    }
  }
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function dequeueUpload(key: string): Promise<void> {
  await del(outboxKey(key));
}

/** Upload one queued item directly (thumb already generated at enqueue). */
export function uploadQueuedItem(item: QueuedUpload, onProgress?: (pct: number) => void): Promise<Receipt> {
  const form = new FormData();
  form.append("file", item.file, item.file.name);
  if (item.thumb) form.append("thumb", item.thumb, "thumb.webp");
  form.append("category", item.meta.category);
  if (item.meta.owner) form.append("owner", item.meta.owner);
  if (item.meta.notes) form.append("notes", item.meta.notes);
  return new Promise<Receipt>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v2/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body?.error || `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("อัปโหลดล้มเหลว"));
    xhr.send(form);
  });
}
