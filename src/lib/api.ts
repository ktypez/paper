import type {
  ArchiveSummary,
  CategoryRecord,
  DocumentFilters,
  DocumentListResponse,
  DocumentPatch,
  DocumentRecord,
  UploadInput,
} from "./types";

const API_ROOT = "/api";
const REQUEST_TIMEOUT_MS = 15_000;
const FILE_REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 120_000;

type ErrorPayload = {
  error?: string | { code?: string; message?: string };
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 0, code = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function timeoutSignal(parent: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      window.clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    },
  };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function errorFromPayload(payload: ErrorPayload, status: number) {
  if (typeof payload.error === "string") return new ApiError(payload.error, status, "request_failed");
  return new ApiError(
    payload.error?.message ?? payload.message ?? "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ",
    status,
    payload.error?.code ?? payload.code ?? "request_failed",
  );
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
  return errorFromPayload(payload, response.status);
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const timeout = timeoutSignal(init.signal, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers,
      signal: timeout.signal,
      credentials: "same-origin",
    });
    if (!response.ok) throw await readError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    timeout.cleanup();
  }
}

function documentParams(filters: DocumentFilters, cursor?: string, limit?: number) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  if (filters.category) params.set("category", filters.category);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.query) params.set("q", filters.query);
  return params;
}

export function listDocuments(
  token: string,
  options: { cursor?: string; limit?: number; filters?: DocumentFilters; signal?: AbortSignal },
) {
  const params = documentParams(options.filters ?? {}, options.cursor, options.limit);
  return request<DocumentListResponse>(`/documents?${params}`, token, { signal: options.signal });
}

export function getDocument(token: string, id: string, signal?: AbortSignal) {
  return request<DocumentRecord>(`/documents/${encodeURIComponent(id)}`, token, { signal });
}

export function updateDocument(token: string, id: string, patch: DocumentPatch) {
  return request<DocumentRecord>(`/documents/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteDocument(token: string, id: string) {
  return request<void>(`/documents/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export function listCategories(token: string, signal?: AbortSignal) {
  return request<CategoryRecord[]>("/categories", token, { signal });
}

export function createCategory(token: string, name: string) {
  return request<CategoryRecord>("/categories", token, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateCategory(token: string, id: string, name: string) {
  return request<CategoryRecord>(`/categories/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(token: string, id: string) {
  return request<void>(`/categories/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export function reorderCategories(token: string, ids: string[]) {
  return request<void>("/categories/order", token, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function getSummary(token: string, signal?: AbortSignal) {
  return request<ArchiveSummary>("/summary", token, { signal });
}

export function documentFileUrl(id: string, variant: "preview" | "original") {
  return `${API_ROOT}/documents/${encodeURIComponent(id)}/file?variant=${variant}`;
}

export function uploadDocument(input: UploadInput) {
  if (input.signal?.aborted) {
    return Promise.reject(new DOMException("ยกเลิกการอัปโหลด", "AbortError"));
  }
  return new Promise<DocumentRecord>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();

    form.append("file", input.file, input.file.name);
    if (input.thumbnail) form.append("thumb", input.thumbnail, "preview.webp");
    form.append("client_id", input.metadata.uploadId);
    form.append("filename", input.metadata.filename);
    form.append("category", input.metadata.category);
    if (input.metadata.owner) form.append("owner", input.metadata.owner);
    if (input.metadata.notes) form.append("notes", input.metadata.notes);

    request.open("POST", `${API_ROOT}/documents`);
    request.setRequestHeader("Authorization", `Bearer ${input.token}`);
    request.withCredentials = true;
    request.responseType = "json";
    request.timeout = UPLOAD_TIMEOUT_MS;

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        input.onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    });

    request.addEventListener("load", () => {
      const payload = request.response as ErrorPayload | DocumentRecord | null;
      if (request.status >= 200 && request.status < 300 && payload) {
        input.onProgress?.(100);
        resolve(payload as DocumentRecord);
        return;
      }
      reject(errorFromPayload((payload ?? {}) as ErrorPayload, request.status));
    });
    request.addEventListener("error", () => reject(new ApiError("อัปโหลดไม่สำเร็จ กรุณาตรวจสอบเครือข่าย")));
    request.addEventListener("timeout", () => reject(new ApiError("อัปโหลดใช้เวลานานเกินไป กรุณาลองอีกครั้ง")));
    request.addEventListener("abort", () => reject(new DOMException("ยกเลิกการอัปโหลด", "AbortError")));

    const abortUpload = () => {
      request.abort();
      reject(new DOMException("ยกเลิกการอัปโหลด", "AbortError"));
    };
    input.signal?.addEventListener("abort", abortUpload, { once: true });
    if (input.signal?.aborted) {
      abortUpload();
      return;
    }
    request.send(form);
  });
}

export async function authenticatedFileBlob(url: string, token: string, signal?: AbortSignal) {
  const timeout = timeoutSignal(signal, FILE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: authHeaders(token),
      credentials: "same-origin",
      signal: timeout.signal,
    });
    if (!response.ok) throw new ApiError("เปิดไฟล์ไม่สำเร็จ", response.status);
    return await response.blob();
  } finally {
    timeout.cleanup();
  }
}
