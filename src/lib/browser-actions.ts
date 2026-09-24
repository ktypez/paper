import { authenticatedFileBlob, documentFileUrl } from "./api";
import type { DocumentRecord } from "./types";

async function documentFile(document: DocumentRecord, token: string) {
  const blob = await authenticatedFileBlob(documentFileUrl(document.id, "original"), token);
  return new File([blob], document.filename, {
    type: document.contentType,
    lastModified: new Date(document.uploadedAt).getTime(),
  });
}

export async function downloadDocument(document: DocumentRecord, token: string) {
  const file = await documentFile(document, token);
  const url = URL.createObjectURL(file);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.filename;
  link.hidden = true;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function shareDocument(document: DocumentRecord, token: string) {
  if (!navigator.share) throw new Error("อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์");
  const file = await documentFile(document, token);
  if (!navigator.canShare?.({ files: [file] })) {
    throw new Error("อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์ชนิดนี้");
  }
  await navigator.share({ files: [file], title: document.filename });
}

export async function clearLegacyBrowserData() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("paper-") && key !== "paper-theme") localStorage.removeItem(key);
  }
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("paper-") || name.startsWith("workbox-precache-v2-"))
        .map((name) => caches.delete(name)),
    );
  }
  if ("indexedDB" in window) {
    await Promise.all(
      ["rq-cache", "keyval-store"].map(
        (name) =>
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
  }
}
