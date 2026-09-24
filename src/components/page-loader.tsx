export function PageLoader() {
  return (
    <div className="grid min-h-[55dvh] place-items-center" role="status" aria-label="กำลังเปิด Paper">
      <div className="text-center">
        <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full w-1/2 animate-[loading-slide_900ms_ease-in-out_infinite] bg-accent-solid" />
        </div>
        <p className="mt-3 text-sm text-muted">กำลังเปิด Paper…</p>
      </div>
    </div>
  );
}
