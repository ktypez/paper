import { Link } from "react-router";

export function Logo() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center rounded-[6px] px-1 text-ink transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      aria-label="Paper, หน้าล่าสุด"
      translate="no"
    >
      <span className="text-lg font-semibold tracking-[-0.04em]">Paper</span>
    </Link>
  );
}
