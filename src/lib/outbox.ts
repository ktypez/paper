import { useCallback, useEffect, useRef, useState } from "react";
import {
  dequeueUpload,
  listQueuedUploads,
  uploadQueuedItem,
} from "@/lib/api-v2";
import { useAfterUpload } from "@/lib/query";

export function useOutboxDrain() {
  const afterUpload = useAfterUpload();
  const [pending, setPending] = useState(0);
  const [draining, setDraining] = useState(false);
  const runningRef = useRef(false);
  const afterRef = useRef(afterUpload);
  afterRef.current = afterUpload;

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    if (!navigator.onLine) {
      try {
        const items = await listQueuedUploads();
        setPending(items.length);
      } catch {
        /* ignore */
      }
      return;
    }
    runningRef.current = true;
    setDraining(true);
    try {
      const items = await listQueuedUploads();
      setPending(items.length);
      for (const item of items) {
        try {
          await uploadQueuedItem(item);
          await dequeueUpload(item.key);
          afterRef.current();
        } catch {
          break;
        }
      }
      const rest = await listQueuedUploads();
      setPending(rest.length);
    } catch {
      /* ignore */
    } finally {
      runningRef.current = false;
      setDraining(false);
    }
  }, []);

  useEffect(() => {
    drain();
    const onOnline = () => drain();
    window.addEventListener("online", onOnline);

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string } | null;
      if (data && data.type === "paper-outbox-drained") drain();
    };
    let swHandler = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onMessage);
      swHandler = true;
    }

    const timer = window.setInterval(async () => {
      try {
        const items = await listQueuedUploads();
        setPending(items.length);
      } catch {
        /* ignore */
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      if (swHandler) navigator.serviceWorker.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [drain]);

  return { pending, draining };
}
