import { RequestError } from "./http.js";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 256 * 1024;
export const MAX_UPLOAD_BODY_SIZE = MAX_FILE_SIZE + MAX_THUMBNAIL_SIZE + 128 * 1024;
export const MIN_THAI_SEARCH_LENGTH = 2;
export const PENDING_UPLOAD_PREFIX = "__paper_pending__:";
export const PENDING_UPLOAD_TTL_MS = 15 * 60 * 1000;

export function isPendingUpload(row) {
  return typeof row?.filename === "string" && row.filename.startsWith(PENDING_UPLOAD_PREFIX);
}

export function pendingUploadPattern() {
  return `${PENDING_UPLOAD_PREFIX.replace(/[\\%_]/g, "\\$&")}%`;
}
export const SUPPORTED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const SUPPORTED_THUMBNAIL_TYPES = new Set(["image/jpeg", "image/webp"]);

export function safeFileContentType(value) {
  return SUPPORTED_FILE_TYPES.has(value) ? value : "application/octet-stream";
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== "string") throw new RequestError(400, "invalid_text", `${label}ไม่ถูกต้อง`);
  const cleaned = cleanText(value);
  if (!cleaned) throw new RequestError(400, "required", `กรอก${label}`);
  if (cleaned.length > maxLength) {
    throw new RequestError(400, "text_too_long", `${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  }
  return cleaned;
}

export function optionalText(value, maxLength) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new RequestError(400, "invalid_text", "ข้อมูลไม่ถูกต้อง");
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  if (cleaned.length > maxLength) {
    throw new RequestError(400, "text_too_long", `ข้อมูลยาวเกิน ${maxLength} ตัวอักษร`);
  }
  return cleaned;
}

function cleanText(value) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export function parseLimit(value, fallback = 30, maximum = 50) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), maximum);
}

export function encodeCursor(uploadedAt, id) {
  return btoa(`${uploadedAt}|${id}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(cursor) {
  try {
    if (typeof cursor !== "string" || cursor.length > 512) throw new Error("cursor too long");
    let value = cursor.replace(/-/g, "+").replace(/_/g, "/");
    while (value.length % 4) value += "=";
    const [uploadedAt, id] = atob(value).split("|");
    if (!uploadedAt || !id) throw new Error("missing cursor fields");
    return { uploadedAt, id };
  } catch {
    throw new RequestError(400, "invalid_cursor", "cursor ไม่ถูกต้อง");
  }
}

export function buildFtsQuery(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .map((term) => `"${term.replace(/"/g, '""').slice(0, 80)}"*`)
    .join(" ");
}

export function hasThai(text) {
  return /[\u0e00-\u0e7f]/u.test(text);
}

export function buildLikePattern(value) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function detectFileType(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  return null;
}

export function parseRange(value) {
  const match = /^bytes=(\d*)-(\d*)$/.exec((value ?? "").trim());
  if (!match) throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
  const start = match[1];
  const end = match[2];
  if (!start && !end) throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
  if (!start) {
    const suffix = Number.parseInt(end, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
    }
    return { suffix };
  }
  const offset = Number.parseInt(start, 10);
  if (!Number.isFinite(offset)) throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
  if (!end) return { offset };
  const length = Number.parseInt(end, 10) - offset + 1;
  if (!Number.isFinite(length) || length <= 0) {
    throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
  }
  return { offset, length };
}

export function inlineDisposition(filename) {
  const encoded = encodeURIComponent(filename).replace(
    /['()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename*=UTF-8''${encoded}`;
}
