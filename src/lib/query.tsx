import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "./api";
import {
  createCategory,
  deleteCategory,
  deleteDocument,
  getDocument,
  getSummary,
  listCategories,
  listDocuments,
  reorderCategories,
  updateCategory,
  updateDocument,
  uploadDocument,
} from "./api";
import type { CategoryRecord, DocumentFilters, UploadInput } from "./types";

const AuthTokenContext = createContext<() => Promise<string>>(() => {
  throw new Error("AuthTokenProvider is missing");
});

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
}

function AuthTokenProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const readToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
    return token;
  }, [getToken]);

  return <AuthTokenContext.Provider value={readToken}>{children}</AuthTokenContext.Provider>;
}

function useAuthToken() {
  return useContext(AuthTokenContext);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 45_000,
            gcTime: 15 * 60_000,
            retry: shouldRetry,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  useEffect(() => {
    if (isSignedIn === false) client.clear();
  }, [client, isSignedIn]);

  return (
    <QueryClientProvider client={client}>
      <AuthTokenProvider>{children}</AuthTokenProvider>
    </QueryClientProvider>
  );
}

export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (filters: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
};

export function useDocuments(filters: DocumentFilters = {}, limit = 30, enabled = true) {
  const readToken = useAuthToken();
  return useInfiniteQuery({
    queryKey: documentKeys.list(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      listDocuments(await readToken(), { cursor: pageParam, limit, filters, signal }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useDocument(id: string | undefined) {
  const readToken = useAuthToken();
  return useQuery({
    queryKey: documentKeys.detail(id ?? "missing"),
    queryFn: async ({ signal }) => getDocument(await readToken(), id!, signal),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  const readToken = useAuthToken();
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async ({ signal }) => listCategories(await readToken(), signal),
  });
}

export function useSummary() {
  const readToken = useAuthToken();
  return useQuery({
    queryKey: ["summary"],
    queryFn: async ({ signal }) => getSummary(await readToken(), signal),
  });
}

function useInvalidateDocumentData() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: documentKeys.all }),
      client.invalidateQueries({ queryKey: categoryKeys.all }),
      client.invalidateQueries({ queryKey: ["summary"] }),
    ]);
  };
}

export function useUpdateDocument() {
  const readToken = useAuthToken();
  const client = useQueryClient();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Parameters<typeof updateDocument>[2] }) => {
      const token = await readToken();
      return updateDocument(token, id, patch);
    },
    onSuccess: (document) => {
      client.setQueryData(documentKeys.detail(document.id), document);
      void invalidate();
    },
  });
}

export function useDeleteDocument() {
  const readToken = useAuthToken();
  const client = useQueryClient();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async (id: string) => deleteDocument(await readToken(), id),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: documentKeys.detail(id), exact: true });
      void invalidate();
    },
  });
}

export function useUploadDocument() {
  const readToken = useAuthToken();
  const client = useQueryClient();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async (input: Omit<UploadInput, "token">) => {
      const token = await readToken();
      return uploadDocument({ ...input, token });
    },
    onSuccess: (document) => {
      client.setQueryData(documentKeys.detail(document.id), document);
      void invalidate();
    },
  });
}

export function useCreateCategory() {
  const readToken = useAuthToken();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async (name: string) => createCategory(await readToken(), name),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useUpdateCategory() {
  const readToken = useAuthToken();
  const client = useQueryClient();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      updateCategory(await readToken(), id, name),
    onSuccess: (category) => {
      client.setQueryData<CategoryRecord[]>(categoryKeys.all, (current) =>
        current?.map((item) => (item.id === category.id ? category : item)),
      );
      void invalidate();
    },
  });
}

export function useDeleteCategory() {
  const readToken = useAuthToken();
  const invalidate = useInvalidateDocumentData();
  return useMutation({
    mutationFn: async (id: string) => deleteCategory(await readToken(), id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useReorderCategories() {
  const readToken = useAuthToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => reorderCategories(await readToken(), ids),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: categoryKeys.all });
      const previous = client.getQueryData<CategoryRecord[]>(categoryKeys.all);
      client.setQueryData<CategoryRecord[]>(categoryKeys.all, (current) =>
        current?.map((category) => ({ ...category, sortOrder: ids.indexOf(category.id) })),
      );
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) client.setQueryData(categoryKeys.all, context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
