// TanStack Query setup: infinite receipt lists, single-item fetch,
// categories with counts, optimistic mutations, IndexedDB persistence.
import { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import type { Category, ListParams } from "./api-v2";
import {
  Receipt,
  deleteReceipt,
  getReceipt,
  listCategories,
  listReceipts,
  updateReceipt,
} from "./api-v2";
export type { Category, ListParams };

function createIDBPersister() {
  return {
    persistClient: async (client: unknown) => {
      try {
        await set("rq-cache", client);
      } catch {
        /* quota — skip */
      }
    },
    restoreClient: async () => {
      try {
        return await get("rq-cache");
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del("rq-cache");
      } catch {
        /* ignore */
      }
    },
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 3600_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

let persisted = false;
export function QueryProvider({ children }: { children: ReactNode }) {
  if (!persisted) {
    persisted = true;
    const [, restore] = persistQueryClient({
      queryClient,
      persister: createIDBPersister(),
      maxAge: 7 * 24 * 3600_000,
      buster: "v2",
    });
    restore.catch(() => undefined);
  }
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export interface ReceiptFilter {
  category?: string | null;
  owner?: string | null;
  q?: string | null;
}

export function receiptsKey(f: ReceiptFilter) {
  return ["receipts", f.category ?? "", f.owner ?? "", f.q ?? ""];
}

export function useReceiptsInfinite(filter: ReceiptFilter, limit = 30) {
  return useInfiniteQuery({
    queryKey: receiptsKey(filter),
    queryFn: ({ pageParam }) =>
      listReceipts({
        cursor: pageParam ?? null,
        limit,
        category: filter.category,
        owner: filter.owner,
        q: filter.q,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ["receipt", id],
    queryFn: () => getReceipt(id!),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 30_000,
  });
}

export function useUpdateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Receipt> }) => updateReceipt(id, patch),
    onSuccess: (row) => {
      qc.setQueryData(["receipt", row.id], row);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: ["receipt", id] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

/** After an upload completes: refresh lists + categories. */
export function useAfterUpload() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["receipts"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
}
