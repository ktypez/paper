import type { Receipt, Category, UploadResponse, ApiError } from "@/types";

const BASE = "/api";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(BASE + url, options);
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return text as unknown as T;
  }
  if (!res.ok) {
    const msg = (data as unknown as ApiError)?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function getReceipts(params?: {
  category?: string;
  q?: string;
}): Promise<Receipt[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.q) search.set("q", params.q);
  const query = search.toString();
  return request<Receipt[]>(`/receipts${query ? "?" + query : ""}`);
}

export async function renameReceipt(
  id: string,
  filename: string
): Promise<Receipt> {
  return request<Receipt>(`/receipts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
}

export async function updateReceipt(
  id: string,
  data: { filename?: string; category?: string; owner?: string | null; notes?: string }
): Promise<Receipt> {
  return request<Receipt>(`/receipts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteReceipt(id: string): Promise<void> {
  await request(`/receipts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getFileUrl(id: string): string {
  return `${BASE}/file/${id}`;
}

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export async function createCategory(name: string): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function updateCategory(
  id: string,
  name: string
): Promise<{ id: string; name: string }> {
  return request<{ id: string; name: string }>(
    `/categories/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );
}

export async function deleteCategory(id: string): Promise<void> {
  await request(`/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function reorderCategories(
  orderedIds: string[]
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/categories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}

export async function uploadReceipt(
  file: File,
  category: string,
  notes?: string,
  owner?: string
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (owner) form.append("owner", owner);
  if (notes) form.append("notes", notes);
  return request<UploadResponse>("/upload", {
    method: "POST",
    body: form,
  });
}

export function uploadReceiptWithProgress(
  file: File,
  category: string,
  onProgress: (pct: number) => void,
  notes?: string,
  owner?: string
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    if (owner) form.append("owner", owner);
    if (notes) form.append("notes", notes);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + "/upload");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.send(form);
  });
}
