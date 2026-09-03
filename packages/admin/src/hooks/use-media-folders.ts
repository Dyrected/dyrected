import * as React from "react";
import type { MediaFolder, FolderBreadcrumbItem } from "../types/media-folders";

const STORAGE_KEY_PREFIX = "dyrected_media_folders_";

const DEFAULT_FOLDERS: MediaFolder[] = [
  {
    id: "marketing",
    name: "Marketing",
    slug: "marketing",
    parentId: null,
    path: "/marketing",
    color: "#3b82f6",
  },
  {
    id: "products",
    name: "Products",
    slug: "products",
    parentId: null,
    path: "/products",
    color: "#10b981",
  },
  {
    id: "campaigns",
    name: "Campaigns",
    slug: "campaigns",
    parentId: "marketing",
    path: "/marketing/campaigns",
    color: "#8b5cf6",
  },
];

export function useMediaFolders(collectionSlug: string = "media") {
  const storageKey = `${STORAGE_KEY_PREFIX}${collectionSlug}`;

  const [folders, setFolders] = React.useState<MediaFolder[]>(() => {
    if (typeof window === "undefined") return DEFAULT_FOLDERS;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return DEFAULT_FOLDERS;
  });

  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);

  // Sync to local storage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(folders));
      } catch (err) {
        console.warn("Failed to persist media folders:", err);
      }
    }
  }, [folders, storageKey]);

  const createFolder = React.useCallback(
    (name: string, parentId: string | null = null, color?: string): MediaFolder => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "folder";

      const parent = folders.find((f) => f.id === parentId);
      const parentPath = parent ? parent.path : "";
      const path = `${parentPath}/${slug}`;
      const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newFolder: MediaFolder = {
        id,
        name: name.trim(),
        slug,
        parentId,
        path,
        color: color || "#64748b",
      };

      setFolders((prev) => [...prev, newFolder]);
      return newFolder;
    },
    [folders]
  );

  const renameFolder = React.useCallback((id: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const slug = newName
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || "folder";
        return { ...f, name: newName.trim(), slug };
      })
    );
  }, []);

  const deleteFolder = React.useCallback(
    (id: string) => {
      // Find all recursive descendants
      const toDelete = new Set<string>([id]);
      let added = true;
      while (added) {
        added = false;
        for (const f of folders) {
          if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
            toDelete.add(f.id);
            added = true;
          }
        }
      }

      setFolders((prev) => prev.filter((f) => !toDelete.has(f.id)));
      if (activeFolderId && toDelete.has(activeFolderId)) {
        setActiveFolderId(null);
      }
    },
    [folders, activeFolderId]
  );

  const getBreadcrumbs = React.useCallback(
    (folderId: string | null): FolderBreadcrumbItem[] => {
      const crumbs: FolderBreadcrumbItem[] = [{ id: null, name: "All Media" }];
      if (!folderId) return crumbs;

      const pathItems: FolderBreadcrumbItem[] = [];
      let currId: string | null = folderId;

      while (currId) {
        const folder = folders.find((f) => f.id === currId);
        if (!folder) break;
        pathItems.unshift({ id: folder.id, name: folder.name });
        currId = folder.parentId;
      }

      return [...crumbs, ...pathItems];
    },
    [folders]
  );

  const getCurrentFolder = React.useCallback((): MediaFolder | null => {
    if (!activeFolderId) return null;
    return folders.find((f) => f.id === activeFolderId) || null;
  }, [activeFolderId, folders]);

  const getSubfolders = React.useCallback(
    (parentId: string | null = null): MediaFolder[] => {
      return folders.filter((f) => f.parentId === parentId);
    },
    [folders]
  );

  return {
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    getBreadcrumbs,
    getCurrentFolder,
    getSubfolders,
  };
}
