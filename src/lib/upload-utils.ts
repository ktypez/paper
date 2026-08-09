// Shared file-validation and image-compression helpers for upload flows.

export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
const COMPRESS_MAX = 2048;
const COMPRESS_QUALITY = 0.8;

export function validateFile(f: File): string | null {
  if (!ALLOWED_TYPES.includes(f.type)) {
    return "Invalid file type. Allowed: JPEG, PNG, WebP, PDF";
  }
  if (f.size > MAX_FILE_SIZE) {
    return "File too large. Maximum 10 MB";
  }
  return null;
}

export async function compressImage(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  let { width, height } = img;
  if (width > COMPRESS_MAX || height > COMPRESS_MAX) {
    const ratio = Math.min(COMPRESS_MAX / width, COMPRESS_MAX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  img.close();
  const blob = await new Promise<Blob>((r) =>
    canvas.toBlob((b) => r(b!), "image/webp", COMPRESS_QUALITY)
  );
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
    type: "image/webp",
  });
}
