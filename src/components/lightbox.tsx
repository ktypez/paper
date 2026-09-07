// Fullscreen image viewer (lightbox): dark backdrop, contained image,
// closes on backdrop/image tap, X button, or Escape.
import { useEffect } from "react";
import { X } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="ดูภาพเต็มจอ"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors active:bg-white/30"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt ?? ""}
        draggable={false}
        onClick={onClose}
        className="zoom-in max-h-[88dvh] max-w-full select-none object-contain"
      />
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/50">
        แตะเพื่อปิด
      </p>
    </div>
  );
}
