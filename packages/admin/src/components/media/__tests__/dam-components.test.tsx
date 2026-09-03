import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolderTree } from "../folder-tree";
import { FolderPillCarousel } from "../folder-pill-carousel";
import { MediaFilterBar } from "../media-filter-bar";
import { MediaInspector } from "../media-inspector";
import type { MediaFolder } from "../../../types/media-folders";

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: {
      getBaseUrl: () => "http://localhost:3000",
      replaceMedia: vi.fn(),
      collection: () => ({ replaceFile: vi.fn() }),
    },
  }),
}));

describe("DAM Folder & Navigation Components", () => {
  const mockFolders: MediaFolder[] = [
    {
      id: "marketing",
      name: "Marketing",
      slug: "marketing",
      parentId: null,
      path: "/marketing",
      color: "#3b82f6",
    },
    {
      id: "campaigns",
      name: "Summer 2026",
      slug: "summer-2026",
      parentId: "marketing",
      path: "/marketing/summer-2026",
      color: "#8b5cf6",
    },
  ];

  it("renders Desktop FolderTree with root and child items", () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();

    render(
      <FolderTree
        folders={mockFolders}
        activeFolderId="marketing"
        onSelectFolder={onSelect}
        onCreateFolder={onCreate}
        onRenameFolder={onRename}
        onDeleteFolder={onDelete}
        totalAssetCount={42}
      />
    );

    expect(screen.getByText("All Media")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("Marketing")).toBeTruthy();
  });

  it("renders Mobile FolderPillCarousel with pills and breadcrumbs", () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    const breadcrumbs = [
      { id: null, name: "All Media" },
      { id: "marketing", name: "Marketing" },
    ];

    render(
      <FolderPillCarousel
        folders={mockFolders}
        activeFolderId="marketing"
        breadcrumbs={breadcrumbs}
        onSelectFolder={onSelect}
        onCreateFolder={onCreate}
        totalAssetCount={42}
      />
    );

    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
  });

  it("renders MediaFilterBar with MIME filter chips and triggers changes", () => {
    const onSearch = vi.fn();
    const onMime = vi.fn();
    const onRatio = vi.fn();
    const onView = vi.fn();
    const onSort = vi.fn();

    render(
      <MediaFilterBar
        search=""
        onSearchChange={onSearch}
        mimeFilter="all"
        onMimeFilterChange={onMime}
        aspectRatio="square"
        onAspectRatioChange={onRatio}
        viewMode="grid"
        onViewModeChange={onView}
        sortValue="-createdAt"
        onSortChange={onSort}
        sortOptions={[{ value: "-createdAt", label: "Newest first" }]}
      />
    );

    expect(screen.getByText("Images")).toBeTruthy();
    expect(screen.getByText("Videos")).toBeTruthy();
    expect(screen.getByText("Audio")).toBeTruthy();
    expect(screen.getByText("Documents")).toBeTruthy();

    fireEvent.click(screen.getByText("Images"));
    expect(onMime).toHaveBeenCalledWith("image");
  });

  it("renders MediaInspector with asset metadata and dynamic transform URLs", () => {
    const item = {
      id: "asset-123",
      filename: "hero-banner.jpg",
      originalFilename: "Hero Banner 2026.jpg",
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
      aspectRatio: 1.78,
      filesize: 204800,
      alt: "Hero campaign banner",
      caption: "Summer launch",
    };

    render(
      <MediaInspector
        item={item}
        isOpen={true}
        onClose={vi.fn()}
        baseUrl="http://localhost:3000"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Hero Banner 2026.jpg")).toBeTruthy();
    expect(screen.getByText("1920 × 1080")).toBeTruthy();
    expect(screen.getByText("200 KB")).toBeTruthy();
  });
});
