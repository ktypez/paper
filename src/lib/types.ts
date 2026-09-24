export type DocumentRecord = {
  id: string;
  filename: string;
  category: string;
  owner: string | null;
  notes: string | null;
  contentType: string;
  size: number;
  uploadedAt: string;
  hasPreview: boolean;
};

export type DocumentListResponse = {
  items: DocumentRecord[];
  nextCursor: string | null;
  total: number;
};

export type CategoryRecord = {
  id: string;
  name: string;
  createdAt: string;
  sortOrder: number;
  documentCount: number;
};

export type ArchiveSummary = {
  documentCount: number;
  categoryCount: number;
  uncategorizedCount: number;
  owners: string[];
};

export type DocumentFilters = {
  category?: string;
  owner?: string;
  query?: string;
};

export type DocumentPatch = {
  filename?: string;
  category?: string;
  owner?: string | null;
  notes?: string | null;
};

export type UploadMetadata = {
  uploadId: string;
  filename: string;
  category: string;
  owner?: string;
  notes?: string;
};

export type UploadInput = {
  file: File;
  thumbnail?: Blob;
  metadata: UploadMetadata;
  token: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};
