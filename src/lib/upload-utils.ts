export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 256 * 1024;
export const SUPPORTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function looksLikeImage(file: File) {
  return file.type.startsWith("image/") || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
}

export function validateUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const extensionOnlyType = !file.type && [".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(`.${extension ?? ""}`);
  if (
    !SUPPORTED_FILE_TYPES.includes(file.type as (typeof SUPPORTED_FILE_TYPES)[number]) &&
    !extensionOnlyType
  ) {
    return "รองรับเฉพาะ JPEG, PNG, WebP และ PDF";
  }
  if (file.size > MAX_FILE_SIZE) return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
  return null;
}

export async function createImageThumbnail(file: File) {
  if (!looksLikeImage(file)) return undefined;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const longestSide = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 320 / longestSide);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return undefined;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob | undefined>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? undefined), "image/webp", 0.76);
  });
}
