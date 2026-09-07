# Dyrected — Media Library & Digital Asset Manager (DAM) Specification

> **Status:** Approved Proposed Specification  
> **Target Package:** `@dyrected/admin`, `@dyrected/core`, `@dyrected/storage-cloudinary`, `@dyrected/storage-s3`, `@dyrected/storage-local`, `@dyrected/sdk`  
> **Authors:** Dyrected Core Team & AI Architecture  
> **Date:** September 2026

---

## 1. Executive Summary & Core Principles

This specification outlines the architecture and UI/UX implementation for a full-featured **Media Library / Digital Asset Manager (DAM)** within Dyrected.

### Core Architectural Pillars
1. **Universal Media Collections ("Any Collection Can Be a Media Collection"):**  
   In Dyrected, media is not confined to a single hardcoded table. Any collection defined with `upload: true` (or `upload: { allowedMimeTypes, maxFileSize, ... }`) inherits full DAM capabilities, custom domain fields (e.g., `sku`, `licenseExpiry`, `vendorId`, `tags`), and operational views.
2. **Frontend & UX (Strapi Pattern + Option C Hybrid Folders):**  
   Desktop collapsible tree sidebar with drag-and-drop folder organization + mobile-first horizontal pill-chips carousel with interactive breadcrumbs, slide-out/bottom metadata inspection drawer, batch operations (move, delete, tag), and a universal `<MediaLibraryDialog />` field picker.
3. **Backend & Media Pipeline (Directus Pattern):**  
   Unified asset delivery endpoint (`GET /api/:collectionSlug/:id`), non-destructive original master storage, automatic EXIF/duration/blurhash ingestion, transformation presets/keys, and an on-demand Sharp caching pipeline for non-CDN adapters.
4. **Dynamic Transformations (Cloudinary & Sharp):**  
   On-the-fly URL-based transformations (`w_`, `h_`, `c_fill`, `g_auto:focal`, `f_auto`, `q_auto`) eliminating rigid, pre-rendered thumbnail duplication on disk.
5. **Operational View Reuse:**  
   Native reuse of Dyrected's existing **`CardsLayout`** (visual gallery), **`TableLayout`** (dense management), and **`SpreadsheetLayout`** (bulk metadata editing) across *any* media-enabled collection.
6. **Preservation of Existing Dyrected Strengths:**  
   Preserve and integrate all proven foundations already in the codebase: external media embed handling (YouTube/Vimeo), Blurhash rendering, storage diagnostic guards, collision-safe sanitization, component slots, and JEXL access control.
7. **Strict Zero-Downtime Backwards Compatibility:**  
   All new fields (`folderId`, `focalPoint`, `blurhash`, `metadata`) are non-breaking and optional. Legacy `imageSizes` configurations seamlessly translate to dynamic transformation presets.

---

## 2. Preserved & Elevated Core Strengths (From Current Dyrected Implementation)

The following existing capabilities are codified as essential requirements in this specification:

### 2.1 Remote & Embeddable Media Handling (`lib/external-media.ts`)
* **Retained Capabilities:** Automatic URL pattern matching for YouTube (`video/youtube`), Vimeo (`video/vimeo`), direct external image URLs, and external video streams.
* **DAM Integration:** External assets are stored without downloading heavy bytes, rendering custom video play badges in `CardsLayout` and responsive iframe embeds inside `AssetDetailDrawer`.

### 2.2 Instant Blurhash Placeholders (`react-blurhash`)
* **Retained Capabilities:** Low-overhead placeholder rendering for smooth, zero-layout-shift image loading.
* **DAM Integration:** The ingestion pipeline computes a compact `blurhash` string on upload, displayed across `CardsLayout` grid cards and modal pickers prior to image download.

### 2.3 Storage Diagnostics & Setup Guidance (`StorageNotConfiguredNotice`)
* **Retained Capabilities:** Intercepts missing/invalid Cloudinary or S3 environment variables (`isStorageNotConfiguredError`) and displays clear setup guidance.
* **DAM Integration:** Displayed inside the media operational workspace and `<MediaLibraryDialog />` whenever storage credentials require configuration.

### 2.4 Collision-Safe Sanitization & Normalization (`@dyrected/storage-cloudinary`)
* **Retained Capabilities:** Strips diacritics/accents, converts to lowercase kebab-case, and appends a collision-safe timestamp and hash suffix (`hero-banner-1718000000-a1b2c3`).
* **DAM Integration:** Applied consistently across all storage adapters (Cloudinary, S3, B2, Local).

### 2.5 Extensibility Component Slots (`AdminComponentSlot`)
* **Retained Capabilities:** Slot injection system (`CollectionListSlotProps`, `admin-component-slot`) allowing plugins to inject custom UI.
* **DAM Integration:** Explicit slot regions are provided:
  * `MediaToolbarSlot`: For custom export scripts or AI auto-tagging buttons.
  * `MediaInspectorSlot`: For third-party asset analysis or background-removal tools.

### 2.6 Dynamic Access Control Evaluation (`jexl` / `evaluateAccess`)
* **Retained Capabilities:** Declarative evaluation of `access.read`, `access.create`, `access.update`, and `access.delete` against the current user context.
* **DAM Integration:** Restricts folder creation, file uploads, file replacement, and deletion per collection based on user roles.

---

## 3. Universal Media Collections Architecture

### 3.1 Collection Configuration Contract

Any collection can declare `upload: true` or provide an extended `UploadConfig`:

```typescript
// dyrected.config.ts
export default defineConfig({
  collections: [
    // 1. General Site Media
    {
      slug: 'media',
      upload: true, // Default global media library
      admin: { icon: 'FolderOpen', useAsTitle: 'filename' },
    },

    // 2. Specialized Media Collection with Custom Fields
    {
      slug: 'product-assets',
      upload: {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4'],
        maxFileSize: 25 * 1024 * 1024, // 25MB
      },
      admin: {
        icon: 'Sparkles',
        defaultView: 'cards', // Opens in visual cards gallery by default
      },
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'isPrimary', type: 'boolean', defaultValue: false },
        { name: 'colorVariant', type: 'text' },
        { name: 'photographerCredit', type: 'text' },
      ],
    },

    // 3. Document / Invoice Vault Collection
    {
      slug: 'invoices',
      upload: {
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/tiff'],
        maxFileSize: 10 * 1024 * 1024,
      },
      admin: {
        icon: 'Receipt',
        defaultView: 'table', // Opens in dense table view
      },
      fields: [
        { name: 'invoiceNumber', type: 'text', required: true },
        { name: 'vendor', type: 'relationship', relationTo: 'vendors' },
        { name: 'amount', type: 'number' },
        { name: 'status', type: 'select', options: ['pending', 'paid', 'flagged'] },
      ],
    },
  ],
});
```

### 3.2 Injected System Fields on Upload Collections

When `upload: true` (or `upload: { ... }`) is set on any collection, Dyrected automatically injects and indexes standard DAM fields alongside custom fields:

```typescript
export interface BaseMediaDocument {
  id: string;
  folderId?: string | null;     // Relationship to `_media_folders` (null = root folder)
  filename: string;             // Stored cloud/disk identifier
  originalFilename: string;     // e.g. "summer-campaign-banner.png"
  mimeType: string;             // e.g. "image/webp", "video/youtube", "application/pdf"
  filesize: number;             // Bytes (0 for remote embeds)
  width?: number;               // Natural width in px
  height?: number;              // Natural height in px
  aspectRatio?: number;         // Natural width / height
  url: string;                  // Direct CDN or local URL
  thumbnailUrl?: string;        // Fast thumbnail URL
  blurhash?: string;            // Instant low-res placeholder string
  
  // Standard Editorial Metadata
  title?: string;
  alt?: string;
  caption?: string;
  tags?: string[];
  focalPoint?: {
    x: number; // 0.0 to 1.0 (percentage from left)
    y: number; // 0.0 to 1.0 (percentage from top)
  };
  
  // Directus-style Ingestion & EXIF Metadata
  metadata?: {
    exif?: Record<string, unknown>;
    camera?: string;
    iso?: number;
    focalLength?: string;
    duration?: number;          // For video/audio in seconds
    isExternal?: boolean;       // Flag for YouTube / Vimeo / external links
  };

  // Provider
  provider: 'cloudinary' | 's3' | 'b2' | 'local' | 'external';
  providerMetadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Directus-Inspired Backend & Media Pipeline

```
[ Client Upload to /api/:collectionSlug ]
       │
       ▼
[ 1. Ingestion Pipeline ] ──► Validates allowedMimeTypes & maxFileSize
                              Extracts: Width, Height, EXIF, MIME, Blurhash/LQIP, Video Duration
       │
       ▼
[ 2. Storage Adapter ]    ──► Stores ONLY original pristine file in Cloudinary / S3 / Local / B2
       │
       ▼
[ 3. DB Document Record ] ──► Inserts into `collectionSlug` table with custom fields + media fields
       │
═══════════════════════════════════════════════════════════════════════════════════════════════════════
[ Asset Request: GET /api/:collectionSlug/:id?key=avatar OR ?width=300&fit=cover&focal_point=true ]
       │
       ├──► If Provider is Cloudinary ──► Redirects/Builds dynamic Cloudinary CDN URL
       │
       └──► If Provider is S3/Local/B2 ──► Checks Cache ──► If Miss: On-the-fly Sharp transform
                                                                   │
                                                                   ▼
                                                    Streams with Immutable Cache-Control
```

### 4.1 Polymorphic Asset Delivery Route (`GET /api/:collectionSlug/:id`)

* Works for **any** collection with `upload: true`.
* Supports dynamic parameters:
  * `?key=preset-name` (e.g. `?key=avatar-sm`, `?key=card-cover`)
  * `?width=400&height=300&fit=cover&quality=80&format=webp`
  * `?focal_point=true` (reads `focalPoint` from the collection document)
  * `?download=true` (forces attachment download with `originalFilename`)

### 4.2 Transformation Presets ("Keys")

```typescript
// dyrected.config.ts
export default defineConfig({
  media: {
    restrictTransforms: process.env.NODE_ENV === 'production',
    presets: {
      'thumbnail': { width: 150, height: 150, crop: 'fill', gravity: 'focal', format: 'webp' },
      'avatar-sm': { width: 48, height: 48, crop: 'fill', gravity: 'face', format: 'webp' },
      'card-cover': { width: 600, height: 400, crop: 'fill', gravity: 'focal', format: 'webp', quality: 85 },
      'hero-banner': { width: 1920, height: 800, crop: 'fill', gravity: 'focal', format: 'auto', quality: 'auto' },
    }
  }
});
```

---

## 5. Storage Adapters & Transformation Engine

### 5.1 Cloudinary Storage Adapter (`@dyrected/storage-cloudinary`)

Cloudinary serves as the flagship native transform provider, converting options directly into Cloudinary URL segments:

```typescript
export class CloudinaryStorageAdapter implements StorageAdapter {
  getURL(args: { filename: string; transform?: ImageTransformOptions }): string {
    const { filename, transform } = args;
    if (!transform) {
      return cloudinary.url(filename, { secure: true });
    }

    const transformation: Record<string, any> = {
      secure: true,
      fetch_format: transform.format ?? 'auto',
      quality: transform.quality ?? 'auto',
    };

    if (transform.width) transformation.width = transform.width;
    if (transform.height) transformation.height = transform.height;
    if (transform.aspectRatio) transformation.aspect_ratio = transform.aspectRatio;
    if (transform.crop) transformation.crop = transform.crop;

    if (transform.focalPoint) {
      transformation.gravity = 'xy_center';
      transformation.x = Math.round(transform.focalPoint.x * 100) / 100;
      transformation.y = Math.round(transform.focalPoint.y * 100) / 100;
    } else if (transform.gravity) {
      transformation.gravity = transform.gravity === 'focal' ? 'auto:focal' : transform.gravity;
    }

    return cloudinary.url(filename, transformation);
  }
}
```

---

## 6. Operational Views Integration for ANY Media Collection

Because any collection can be a media collection, Dyrected's operational workspace (`packages/admin/src/pages/collections/views/`) renders any media collection seamlessly:

### 6.1 Reused Views Matrix

| Layout Component | Media Collection Behavior | Custom Field Behavior |
| :--- | :--- | :--- |
| **`CardsLayout`** | **Visual Gallery:** Responsive image/video tiles, Blurhash placeholder, hover zoom preview, focal point badge, copy URL button, and folder navigation. | Shows custom fields on the card footer (e.g. `$150.00`, `SKU: 10482`, `Status: Approved`). |
| **`TableLayout`** | **Dense Management:** Image thumbnail cell with hover preview, dimensions, filesize, MIME badge, upload date. | Displays all custom collection columns (e.g. `Vendor`, `Invoice #`, `Payment Status`). |
| **`SpreadsheetLayout`** | **Bulk Editing:** Excel-like grid to edit `alt`, `caption`, `title`, and custom fields across hundreds of assets at once. | Full keyboard cell editing for custom strings, numbers, selects, and booleans. |

### 6.2 Universal View Enhancements for Media Collections

When an operational view detects `schema.upload`:
1. **Folder Breadcrumbs:** Embedded in the `ViewHeader` (`Home / Products / Footwear`).
2. **MIME Filter Chips:** Instant toolbar chips (`All`, `Images`, `Videos`, `Audio`, `Documents`).
3. **Dropzone Canvas:** Dragging files onto any active view (Cards, Table, or Spreadsheet) automatically uploads them into the current active collection and folder.
4. **Bulk Media Actions:** Bulk move to folder, bulk download ZIP, bulk tag, and bulk delete.

---

## 7. UI Components & Mobile-First Architecture (Option C Hybrid Pattern)

The UI architecture standardizes on **Option C (Hybrid Tree on Desktop + Mobile Pill Carousel)** built entirely on **shadcn / Radix UI primitives**.

```
─────────────────────────────────────────────────────────────────────────────
DESKTOP WORKSPACE (>= 768px)
─────────────────────────────────────────────────────────────────────────────
+-----------------------------------------------------------------------------------------------+
| Breadcrumbs: Home › 2026 › Campaigns     [Search...]  [Filter: Images ▾] [View: Card|Table] [+ Upload] |
+----------------------+------------------------------------------------------------------------+
| FolderTree Sidebar   | Main Media Gallery (CardsLayout / TableLayout)                         |
| (shadcn Sidebar)     |                                                                        |
| ▼ 📁 Root            |  [ Asset Card 1 ]   [ Asset Card 2 ]   [ Asset Card 3 ]   [ Asset 4 ]    |
|   ▶ 📁 Logos         |  (Blurhash -> Img)  (Blurhash -> Img)  (Video Badge)      (PDF Icon)   |
|   ▼ 📁 Marketing     |  hero-bg.webp       logo-dark.png      promo.mp4          invoice.pdf  |
|     ● 📁 Campaigns   |  1920x1080 (320kb)  800x400 (45kb)     0:32 (4.2mb)       2.1 MB       |
| + New Folder         |                                                                        |
+----------------------+------------------------------------------------------------------------+

─────────────────────────────────────────────────────────────────────────────
MOBILE WORKSPACE (< 768px)
─────────────────────────────────────────────────────────────────────────────
[ Top Bar: ⌂ Home › 2026 › Campaigns ]                          [🔍] [Filter ▾] [+ Upload]
-----------------------------------------------------------------------------
[ 📁 Subfolders Carousel: (ScrollArea orientation="horizontal")             ]
[ All (148) ] [ 📁 Social (24) ] [ 📁 Print (12) ] [ 📁 Web (112) ] [ +Folder ]
-----------------------------------------------------------------------------
Main Media Gallery (2-Column Grid with 44px touch targets):
[ Asset 1 (Card) ]     [ Asset 2 (Card) ]
[ hero-bg.webp   ]     [ logo-dark.png  ]
-----------------------------------------------------------------------------
[ Sticky Floating Bottom Action Bar (When selected): (3) [Move] [Delete] [⬇] ]
```

### 7.1 Desktop vs. Mobile Responsive Component Matrix

| Surface | Desktop Experience | Mobile Experience (< 768px) | shadcn Component Used |
| :--- | :--- | :--- | :--- |
| **Folder Hierarchy (Option C)** | Left Collapsible Tree Rail (240px) with drag & drop move | **Horizontal Touch Pill Carousel** + Interactive `Breadcrumb` | `Sidebar`, `ScrollArea` (horizontal), `Badge` |
| **Asset Inspector** | Right slide-out Sheet (`w-[440px]`) | **Interactive Bottom Sheet / Drawer** with 50% & 90% snap points | `Sheet side="bottom"` or `vaul` Drawer |
| **Gallery Grid** | 4–6 column auto-responsive grid | **2-column touch-friendly grid** (min 44px tap targets) | `CardsLayout` (`grid-cols-2 gap-3`) |
| **Batch Action Bar** | Top floating toolbar | **Sticky Bottom Floating Pill Bar** (`fixed bottom-4 inset-x-4 z-50 backdrop-blur-md`) | `Card`, `Button`, `Badge` |
| **Media Picker Modal** | Center `Dialog` (`max-w-4xl`) | **Full-Screen Bottom Sheet** (`h-full w-full`) with sticky footer | `Dialog` / `Sheet` |

### 7.2 Slide-Out / Bottom Asset Inspector Drawer (`AssetDetailDrawer`)

When clicking an item in any media collection:
* **Desktop (`Sheet side="right"`):**
  * Left preview pane with high-res zoom/pan, video player, and interactive focal point target.
  * Right metadata pane with technical EXIF, custom collection fields, and action buttons.
* **Mobile (`Sheet side="bottom"` / `vaul` Drawer):**
  * **Half-Height (50%):** Quick preview thumbnail, dimensions/filesize, "Copy URL", and "Select".
  * **Full-Height (90%):** Drag up to reveal full custom fields, tags, and focal point crop pin.

### 7.3 Universal Modal Picker (`<MediaLibraryDialog collectionSlug="..." />`)

* Accepts `collectionSlug` prop to pick assets from **any** media collection (defaults to `"media"`).
* Can be invoked from:
  * `relationship` fields pointing to a media collection.
  * `image` / `upload` fields.
  * Markdown / Rich-Text editors.
* **Tab 1: Library:** Browse/filter assets in folders, with single or multi-select.
* **Tab 2: Upload:** Drag-and-drop file uploader that immediately saves into the targeted collection and selects the newly created documents.

---

## 8. Backwards Compatibility & Migration Strategy

To guarantee that existing Dyrected projects, databases, and client code continue to run without breaking changes:

### 8.1 Database & Record Fallbacks
1. **Nullable System Columns:** All newly introduced columns (`folderId`, `focalPoint`, `blurhash`, `aspectRatio`, `metadata`) are optional.
2. **Root Folder Default:** Existing assets with `folderId === null` or `undefined` render automatically in the Root directory ("Uncategorized") without database patch requirements.
3. **Missing Focal Point:** Defaults to `'center'` / `'auto'` gravity if no `focalPoint` coordinates exist on the document.
4. **Missing Blurhash:** Renders standard CSS skeleton loaders if `blurhash` is absent.

### 8.2 Legacy `imageSizes` Configuration Support
* Existing configs containing `upload.imageSizes: [...]` (e.g. `[{ name: 'thumbnail', width: 300, height: 300 }]`) are automatically registered as **Transformation Presets** (`?key=thumbnail`).
* The API and SDK maintain backwards compatibility for documents expecting `doc.sizes?.thumbnail?.url` by synthesizing virtual getter URLs dynamically, preventing template crashes in live frontends.

### 8.3 Helper Function Signature Parity
* The standard helper `getMediaUrl(item, size)` in `@dyrected/admin` and `@dyrected/sdk` retains its exact signature:
  ```typescript
  export function getMediaUrl(
    media: string | Media | Record<string, unknown> | null | undefined,
    size?: string
  ): string
  ```
  Passing a size string (e.g. `'thumbnail'`) continues to return the appropriate transformed URL.

### 8.4 Form Field Value Interoperability
* The `<MediaLibraryDialog />` and `useMediaURL` hook continue to support both primitive ID strings (e.g. `"64f8a..."`) and populated objects (`{ id, url, filename }`) in `selectedValues`, ensuring relational form fields remain 100% backwards compatible.

---

## 9. Implementation Roadmap

### Phase 1: Core Engine & Multi-Collection Support
- [ ] Ensure `@dyrected/core` automatically injects media fields and indexes into any collection with `upload: true`.
- [ ] Implement polymorphic delivery endpoint `GET /api/:collectionSlug/:id` with query transform parsing (`width`, `height`, `fit`, `format`, `quality`, `key`).
- [ ] Add auto-mapping of legacy `upload.imageSizes` to transformation presets.
- [ ] Enhance `@dyrected/storage-cloudinary` to generate parameterized transformation URLs.
- [ ] Add ingestion hook extracting `width`, `height`, EXIF, and `blurhash`.

### Phase 2: Operational View Adaptations & Option C Folders
- [ ] Update `operational-view-page.tsx` to detect `schema.upload` and inject folder breadcrumbs, MIME chips, and global dropzone canvas.
- [ ] Build desktop `FolderTree` sidebar and mobile `FolderPillCarousel` (`ScrollArea orientation="horizontal"`).
- [ ] Enhance `CardsLayout` with thumbnail aspect ratio switcher (`square`, `original`, `16:9`), Blurhash placeholders, and 2-column mobile grid.
- [ ] Enhance `TableLayout` with thumbnail popover previews.

### Phase 3: Asset Inspection Drawer & Focal Point Editor
- [ ] Build `AssetDetailDrawer` rendering desktop right sheet and mobile bottom drawer with focal point selector.
- [ ] Add in-place file replacement preserving document IDs and foreign keys.

### Phase 4: Universal `<MediaLibraryDialog />` Component
- [ ] Build parameterized `<MediaLibraryDialog collectionSlug="..." />` with `StorageNotConfiguredNotice` guard for use across form fields and rich-text editors.
