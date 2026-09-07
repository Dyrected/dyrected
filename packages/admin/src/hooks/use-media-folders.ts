import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDyrected } from "../providers/dyrected-context";
import type { MediaFolder, FolderBreadcrumbItem } from "../types/media-folders";

export function useMediaFolders(collectionSlug: string = "media") {
  const { client } = useDyrected();
  const queryClient = useQueryClient();
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);

  const queryKey = React.useMemo(() => ["media-folders", collectionSlug], [collectionSlug]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!client) return { docs: [] };
      const res = await client.listFolders(collectionSlug);
      return res;
    },
    enabled: !!client,
  });

  const folders: MediaFolder[] = React.useMemo(() => {
    return ((data?.docs as unknown) as MediaFolder[]) || [];
  }, [data]);

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; parentId?: string | null; color?: string | null }) => {
      if (!client) throw new Error("Client not available");
      return client.createFolder(collectionSlug, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: { name?: string; parentId?: string | null; color?: string | null } }) => {
      if (!client) throw new Error("Client not available");
      return client.updateFolder(collectionSlug, id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) throw new Error("Client not available");
      return client.deleteFolder(collectionSlug, id);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      if (activeFolderId === deletedId) {
        setActiveFolderId(null);
      }
    },
  });

  const createFolder = React.useCallback(
    async (name: string, parentId: string | null = null, color?: string): Promise<MediaFolder> => {
      const res = await createMutation.mutateAsync({ name, parentId, color });
      return (res as unknown) as MediaFolder;
    },
    [createMutation]
  );

  const renameFolder = React.useCallback(
    async (id: string, newName: string) => {
      return updateMutation.mutateAsync({ id, data: { name: newName } });
    },
    [updateMutation]
  );

  const deleteFolder = React.useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
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

  return {
    folders,
    isLoading,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    getBreadcrumbs,
  };
}
