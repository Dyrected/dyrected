export interface MediaFolder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  path: string;
  color?: string;
  assetCount?: number;
  children?: MediaFolder[];
}

export interface FolderBreadcrumbItem {
  id: string | null;
  name: string;
}
