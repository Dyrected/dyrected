export interface TrashConflict {
  field: string
  value: unknown
  existingDocId?: string
}

export interface TrashEntrySnapshot {
  id: string
  collection: string
  docId: string
  deletedAt: number | string
  purgeAt: number | string | null
  deletedBy?: string
  title?: string
  snapshot: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface RestoreConflictError {
  code: string
  conflicts: TrashConflict[]
  message?: string
}
