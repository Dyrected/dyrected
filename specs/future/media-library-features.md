# Media Library Features

Detailed documentation of all media library features and capabilities.

Reference: [uiPress Media Library](https://docs.uipress.co/media-library)

---

## View Modes

### Grid View

- **Purpose**: Visual browsing of media files with thumbnail previews.
- **Layout**:
  - Responsive grid: 2 columns (mobile), 3-5 columns (desktop)
  - Aspect ratio maintained for thumbnails
  - Hover effects for better interaction
  - Checkbox overlay for selection
- **Display Information**:
  - Thumbnail preview (images) or file type icon
  - File name on hover
  - File size indicator
  - Selection checkbox
- **Use Cases**:
  - Quick visual browsing
  - Identifying images at a glance
  - Casual media management
  - Visual content organization

### List View

- **Purpose**: Detailed information display in tabular format.
- **Layout**:
  - Single column list
  - Consistent row height
  - Sortable columns
  - Checkbox column for selection
- **Display Information**:
  - Thumbnail (small)
  - File name
  - File size
  - Upload date
  - File type icon
- **Use Cases**:
  - Finding specific files
  - Comparing file sizes/dates
  - Text-based file management
  - Large library navigation

---

## Upload Features

### Drag and Drop Upload

- **Functionality**:
  - Drag files from file explorer
  - Drop onto media library area
  - Visual drop zone indicator
  - Multiple file support
- **Visual Feedback**:
  - Drop zone highlight
  - File count indicator
  - Upload progress per file
  - Success/error notifications
- **Supported Files**:
  - Images (JPEG, PNG, GIF, WebP, SVG)
  - Videos (MP4, MOV, AVI, WebM)
  - Documents (PDF, DOC, DOCX, etc.)
  - Archives (ZIP, RAR)

### SVG Upload Support

- **Feature Description**:
  - Enable SVG file uploads to the media library.
  - Automatic sanitization of SVG files before upload.
  - Security-first approach to prevent malicious code.
  - Removes potentially dangerous elements and attributes.
- **Settings**:
  - **Category**: Media
  - **Setting Name**: Enable SVG Uploads
  - **Type**: Toggle
  - **Description**: Allow SVG (Scalable Vector Graphics) files to be uploaded to the media library. All SVG files are automatically sanitized before upload to remove potentially malicious code, ensuring safe handling of SVG files.
  - **Activation**: No license required
  - **Default State**: Disabled
- **Security Features**:
  - **Automatic Sanitization**: All SVG files are sanitized before upload
  - **Code Removal**: Removes script tags and event handlers
  - **Structure Validation**: Validates SVG structure
  - **XSS Prevention**: Prevents cross-site scripting attacks
  - **Safe Rendering**: Ensures safe display of SVG files
- **Use Cases**:
  - Upload logo files as SVG
  - Use scalable graphics
  - Maintain image quality at any size
  - Reduce file sizes for simple graphics
  - Support modern web graphics
- **Technical Details**:
  - SVG files are processed server-side
  - Sanitization happens before file storage
  - Original file structure is validated
  - Dangerous elements are removed
  - Safe attributes are preserved

### File Selection Upload

- **Process**:
  - Click upload button
  - File picker opens
  - Select one or multiple files
  - Files upload automatically
  - Progress shown per file
- **Features**:
  - Multiple file selection (Ctrl/Cmd+click)
  - File type filtering in picker
  - Size validation
  - Error handling

### Upload Progress

- **Progress Indicators**:
  - Per-file progress bar
  - Percentage complete
  - File name display
  - Current file indicator
- **Status Messages**:
  - "Uploading..."
  - "Processing..."
  - "Complete"
  - Error messages for failures

### Add Media from URL

- **Functionality**:
  - Add media using external links / URLs
  - Support embedding YouTube and Vimeo videos by pasting links
- **Features**:
  - Automated metadata retrieval (such as title, description, and duration)
  - Automatic thumbnail generation for YouTube, Vimeo links, and remote images
  - Visual badges/indicators in grid/list views to distinguish external links from uploaded files
  - Integration with the Media Details Panel for viewing and editing link metadata

---

## Media Details Panel

### Panel Layout

- **Location**: Right side drawer/sidebar
- **Sections**:
  - Media Preview
  - Metadata Editing
  - File Information
  - Usage Tracking
  - Quick Actions

### Media Preview

- **Size Selector**:
  - Full size
  - Large
  - Medium Large
  - Medium
  - Thumbnail
- **Display Information**:
  - Image dimensions (e.g., "1200 × 1200")
  - File size (e.g., "9.7 KB")
  - MIME type (e.g., "image/webp")
  - Upload date
- **Features**:
  - Click to view full size
  - Size switching without reload
  - Responsive preview
  - Zoom capability

### Metadata Editing

- **Editable Fields**:
  - **Title**:
    - Media file title
    - Used in media library display
    - Searchable field
    - Auto-saves on blur
  - **Alt Text**:
    - Accessibility description
    - Important for SEO
    - Screen reader support
    - Required for images
  - **Caption**:
    - Display caption
    - Shown with media in posts
    - Optional field
    - Rich text support
  - **Description**:
    - Detailed description
    - Internal notes
    - Not displayed publicly
    - Full text searchable
  - **Tags**:
    - Custom tags for organization
    - Autocomplete suggestions
    - Multiple tags per file
    - Filter by tags

### File Information

- **Details Displayed**:
  - **Filename**: Original uploaded filename
  - **ID**: WordPress media ID
  - **Modified**: Last modification date
  - **File Size**: Human-readable size
  - **Dimensions**: Width × height (images)
  - **MIME Type**: File type identifier
- **Formatting**:
  - Human-readable dates
  - Formatted file sizes (KB, MB, GB)
  - Clear labels
  - Copy-to-clipboard for URLs

### Usage Tracking

- **Information Displayed**:
  - List of posts using the media
  - List of pages using the media
  - Custom post types using media
  - "Not used" indicator
- **Features**:
  - Click to navigate to content
  - Real-time usage updates
  - Deep search capability
  - Usage count

### Quick Actions

#### Optimize Image

- **Functionality**:
  - Compress image file size
  - Maintains visual quality
  - Reduces storage usage
  - Improves page load times
- **Process**:
  - Click "Optimize Image" button
  - Image processed on server
  - Compression statistics shown
  - Original backed up (optional)
- **Statistics**:
  - Original size
  - Compressed size
  - Compression percentage
  - Quality maintained

#### Replace Image

- **Functionality**:
  - Replace file while keeping media ID
  - Maintains all relationships
  - Preserves metadata
  - Updates all references
- **Process**:
  - Click "Replace Image"
  - Select new file (or drag & drop)
  - File validated
  - Replacement processed
  - All references updated
- **Use Cases**:
  - Updating outdated images
  - Fixing incorrect uploads
  - Improving image quality
  - Changing file format

#### Edit Image

- **Functionality**:
  - Opens built-in image editor
  - Crop, rotate, resize
  - Apply adjustments
  - Save edited version
- **Editor Tools**:
  - Crop tool
  - Rotate (90° increments)
  - Flip (horizontal/vertical)
  - Resize
  - Brightness/contrast
  - Filters
- **Features**:
  - Real-time preview
  - Undo/redo
  - Aspect ratio lock
  - Quality control

#### Delete

- **Functionality**:
  - Permanently remove media file
  - Removes from server
  - Updates all references
  - Cannot be undone
- **Process**:
  - Click "Delete" button
  - Confirmation dialog
  - File deleted
  - References updated
  - Success notification
- **Safety**:
  - Confirmation required
  - Usage warning if used
  - Permanent action
  - No recovery option

---

## Sorting & Organization

### Sort Options

- **Available Sorts**:
  - Date: Upload date (newest/oldest)
  - Name: Alphabetical (A-Z/Z-A)
  - Size: File size (largest/smallest)
  - Type: File type grouping
- **Sort Direction**:
  - Ascending (↑)
  - Descending (↓)
  - Toggle with sort button

### Pagination

- **Features**:
  - Items per page: 30 (default)
  - Page navigation
  - Total page count
  - Item count display
- **Navigation**:
  - Previous page button
  - Next page button
  - Page number display
  - Jump to page (future)

### Context Menu

- **Right-click Actions**:
  - View details
  - Edit
  - Duplicate
  - Delete
  - Download
- **Features**:
  - Context-aware menu
  - Keyboard shortcuts
  - Quick actions
  - Non-intrusive

### Keyboard Shortcuts

- **Navigation**:
  - `Arrow Keys`: Navigate items
  - `Enter`: Open details
  - `Space`: Select/deselect
  - `Esc`: Close details panel
- **Selection**:
  - `Ctrl/Cmd + A`: Select all
  - `Shift + Click`: Range selection
  - `Ctrl/Cmd + Click`: Multi-select
- **Actions**:
  - `Delete`: Delete selected
  - `Ctrl/Cmd + D`: Duplicate
  - `Ctrl/Cmd + E`: Edit
  - `Ctrl/Cmd + S`: Save

---

## Responsive Design

### Mobile View

- **Adaptations**:
  - Single column grid
  - Simplified controls
  - Touch-optimized
  - Swipe gestures
- **Features**:
  - Thumbnail-only view
  - Simplified details panel
  - Touch selection
  - Mobile upload

### Tablet View

- **Adaptations**:
  - 2-3 column grid
  - Full feature set
  - Touch support
  - Optimized spacing

### Desktop View

- **Adaptations**:
  - 4-5 column grid
  - Full feature set
  - Keyboard shortcuts
  - Multi-window support

---

## Implementation Status & Gaps

The following table summarizes the implementation status of these features in the current codebase relative to this specification:

| Feature Area | Specification Requirement | Implementation Status | Location / Notes |
| :--- | :--- | :--- | :--- |
| **View Modes** | Grid View | **Fully Implemented** | [media-page.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/media/media-page.tsx), [media-library-dialog.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/media/media-library-dialog.tsx) |
| | List View (Tabular, Sortable) | **Not Implemented ❌** | Currently only grid view exists. |
| **Upload Features** | Drag and Drop Upload | **Fully Implemented** | Uses `react-dropzone` with status/active indicators. |
| | File Selection Upload | **Fully Implemented** | Integrates standard file input select. |
| | Upload Progress | **Fully Implemented** | Total progress percentage bar in `FileUploader`. |
| | SVG Upload Support & Sanitization | **Partially Implemented ⚠️** | Handled as a generic upload; lacks setting toggle and server-side XSS sanitization. |
| | Add Media from URL | **Partially Implemented ⚠️** | Tab exists in the dialog modal, but not on the main media page. Vimeo links render using standard `<video>` tag (which is broken and needs iframe embeds). |
| **Media Details** | Details Drawer / Dialog | **Implemented as Dialog** | Opens as a center modal dialog (`MediaDetailsDialog`). |
| | Media Preview (Size select / Zoom) | **Partially Implemented ⚠️** | Shows full preview with Blurhash, but lacks zoom and size switching. |
| | Metadata Editing | **Partially Implemented ⚠️** | Supports editing `alt` and `caption`. Filename/Title is read-only; Description and Tags are missing. |
| | File Information & Copy URL | **Fully Implemented** | Displays dimensions, type, ID, size, and date; copy URL is functional. |
| | Usage Tracking | **Not Implemented ❌** | No tracking of which posts/pages use the asset. |
| | Optimize Image | **Not Implemented ❌** | No compression action exists. |
| | Replace Image | **Not Implemented ❌** | File swap action for the same ID is missing. |
| | Crop Image | **Partially Implemented ⚠️** | Crop action works, but rotate, flip, and filters are missing. |
| **Sorting / Pages** | Sort Options (Date, Size, Name) | **Not Implemented ❌** | Search works, but sorting dropdowns/actions are missing. |
| | Pagination | **Implemented via Infinite Scroll** | Uses React Query infinite scroll (12 items per load) instead of page numbers. |
| | Context Menu & Shortcuts | **Not Implemented ❌** | No right-click custom context menus or keyboard shortcuts are implemented. |
| **Responsive** | Mobile, Tablet, Desktop views | **Fully Implemented** | Layout adjusts responsively using Tailwind utility classes. |
