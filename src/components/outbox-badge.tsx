import { useCallback, useEffect, useState } from "react";
import { listQueuedUploads } from "@/lib/api-v2";
import { Badge } from "@/components/ui/badge";

export function OutboxBadge() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const items = await listQueuedUploads();
      setCount(items.length);
    } catch {
      /* offline store unreadable — keep last count */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);

    const onOnline = () => void refresh();
    const onMessage = (e: Event) => {
      const data = (e as MessageEvent).data as { type?: string } | undefined;
      if (data?.type === "paper-outbox-drained") void refresh();
    };

    window.addEventListener("online", onOnline);
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", onOnline);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
    };
  }, [refresh]);

  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="sm:max-w-md">
      รอส่ง {count}
    </Badge>
  );
}
