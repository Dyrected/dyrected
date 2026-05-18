# Dyrected CMS - Known Bugs, Diagnoses, and Resolution Plans

This document catalogs known bugs, their root causes, and technical plans to resolve them.

---

## Bug 1: `nitro-runtime-import` (Nuxt Nitro Runtime Import Resolution Issue)

**Component/File:** [`packages/nuxt/src/runtime/server/plugins/db.ts`](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts)
**Status:** Resolved ✅

### Issue Outline
The `@dyrected/nuxt` module imports `defineNitroPlugin` from `"nitro/runtime"`. In some versions of Nuxt and Nitro, this import path is not directly resolvable, resulting in module resolution failures. Consumers have been forced to implement a manual workaround by defining a Nitro alias in their `nuxt.config.ts`:

```javascript
nitro: {
  alias: {
    "nitro/runtime": "nitropack/runtime",
  },
}
```

### Plan to Fix
Update [db.ts](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts) to import directly from `"nitropack/runtime"`, which is the standardized and universally resolvable path in modern Nitro/Nuxt installations.

---

## Bug 2: `mysql-db-auto-creation` (MySQL Adapter Database Auto-Creation Failure)

**Component/File:** [`packages/db-mysql/src/index.ts`](file:///Users/busola/Work/dyrected/packages/db-mysql/src/index.ts)
**Status:** Resolved ✅

### Issue Outline
When initializing the `MysqlAdapter`, it synchronously spawns a connection pool configured to select the database specified in the connection string. If the target database (e.g. `dyrected_alajo`) does not yet exist on the MySQL server, the connection handshake fails. Any subsequent query, including table initialization, immediately throws an `Unknown database` error:

```
ERROR [dyrected/db-mysql] Failed to init internal tables: Unknown database 'dyrected_alajo'

at MysqlAdapter.initInternalTables (node_modules/@dyrected/db-mysql/dist/index.js:23:21)
at new MysqlAdapter (node_modules/@dyrected/db-mysql/dist/index.js:20:10)
at mysqlAdapter (node_modules/@dyrected/db-mysql/dist/index.js:197:32)
at dyrected.config.ts:102:7
at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async onImport.tracePromise.**proto** (node:internal/modules/esm/loader:647:26)
at async <anonymous> (node_modules/@dyrected/nuxt/dist/runtime/server/plugins/db.mjs:9:39)

ℹ Vite server warmed up in 3578ms 7:30:10 AM
```

### Plan to Fix
Modify [index.ts](file:///Users/busola/Work/dyrected/packages/db-mysql/src/index.ts) to intercept database initialization inside `initInternalTables()`.
1. Asynchronously parse the database name from the connection config.
2. Establish a temporary `mysql.createConnection` to the server *without* selecting a database.
3. Execute `CREATE DATABASE IF NOT EXISTS \`dbname\`` to ensure the database exists.
4. Close the temporary connection and allow the adapter pool to proceed securely.

---

## Bug 3: `postgres-parameter-mismatch` (Postgres Adapter Dynamic WHERE Parameter Nesting Failure)

**Component/File:** [`packages/db-postgres/src/index.ts`](file:///Users/busola/Work/dyrected/packages/db-postgres/src/index.ts)
**Status:** Resolved ✅

### Issue Outline
When executing a search query that includes a where filter (such as `where: { status: { equals: 'published' } }`), the query is processed by the shared `parseSqlWhere` utility to return parameterized SQL and parameter values:

```typescript
const { sql: whereSql, params } = parseSqlWhere(args.where, ...)
// whereSql → '"status" = $1'
// params → ['published']
```

The adapter currently attempts to embed this output inside the main query template literal like so:
```typescript
whereFragment = this.sql`WHERE ${this.sql.unsafe(whereSql, params)}`
// then embeds into:
await this.sql`SELECT count(*) FROM ${table} ${whereFragment}`
```
`postgres.js` treats the nested `unsafe` fragment as a standalone query fragment but fails to bubble up or merge its parameter bindings into the outer statement's final parameters array. Thus, PostgreSQL receives the `$1` placeholder but zero bound arguments, triggering a database prepared-statement exception.

This bug breaks any query using where clauses, such as:
```typescript
// index.vue — triggers bug
where: { status: { equals: 'published' } }

// [slug].vue — triggers bug  
where: { slug: { equals: slug.value }, status: { equals: 'published' } }
```

#### Historical Client-Side Workaround (Highly Inefficient)
Previously, developers had to fetch the entire dataset and filter on the client to circumvent this error:
```typescript
// Client-side computed workaround in pages/news/index.vue:
const { data: result } = await useDyrectedCollection("news", {
  sort: "-publishedAt",
  limit: 20,
})
const articles = computed(() =>
  (result.value?.docs ?? []).filter(a => a.status === 'published')
)

// Computed workaround in pages/news/[slug].vue:
const { data: results } = await useDyrectedCollection('news', {
  limit: 100,
  initialData: [],
})
const article = computed(() =>
  results.value?.docs?.find(a => a.slug === slug.value && a.status === 'published') ?? null
)
```

### Plan to Fix
Rewrite the query executor block in `find()` of [index.ts](file:///Users/busola/Work/dyrected/packages/db-postgres/src/index.ts). Instead of nesting template literals, build the dynamic query string and pass the whole query along with the parameters array directly to `this.sql.unsafe(queryStr, params)`, eliminating nested parameter resolution issues.

---

## Bug 4: `ts-config-import-error` (Nuxt Server Config TS File Import Resolution Failure)

**Component/File:** [`packages/nuxt/src/runtime/server/plugins/db.ts`](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts)
**Status:** Resolved ✅

### Issue Outline
The `@dyrected/nuxt` module uses a Nitro server plugin to re-attach the non-serializable database adapter to the global context by dynamically importing the consumer's configuration file (`dyrected.config.ts`). In raw Node.js environments, executing `await import()` on a `.ts` file throws an "Unknown file extension" error:

```
[11:21:48] ERROR [dyrected/nuxt] Failed to re-attach database: Unknown file extension ".ts" for C:\Users\Swaggo\Downloads\alajo-landing-page-main\alajo-landing-page-main\dyrected.config.ts

    at Object.getFileProtocolModuleFormat [as file:] (node:internal/modules/esm/get_format:219:9)
    at defaultGetFormat (node:internal/modules/esm/get_format:245:36)
    at defaultLoad (node:internal/modules/esm/load:120:22)
    at async ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:580:32)
    at async ModuleJob._link (node:internal/modules/esm/module_job:116:19)
```

### Plan to Fix
Modify [db.ts](file:///Users/busola/Work/dyrected/packages/nuxt/src/runtime/server/plugins/db.ts) to intercept TypeScript configuration files.
1. If the configuration path has a `.ts` or `.mts` extension, dynamically import the standard compiler `"jiti"` (bundled with Nuxt).
2. Instantiate `jiti` with `import.meta.url` to safely transpile and load the configuration module.
3. Fall back gracefully to standard `import()` for `.js` / `.mjs` configuration targets.

---

## Bug 5: `mysql-read-eaddrnotavail` (MySQL Connection EADDRNOTAVAIL Error on Startup / Sync)

**Component/File:** [`packages/db-mysql/src/index.ts`](file:///Users/busola/Work/dyrected/packages/db-mysql/src/index.ts)
**Status:** Resolved ✅

### Issue Outline
On application startup during schema synchronization, the MySQL adapter attempts to establish connection pool handshakes to execute database and table check operations. Under certain macOS networking environments, if the host is configured as `localhost`, Node's native DNS/socket layer resolves to the IPv6 loopback address (`::1`) or runs into ephemeral socket allocation conflicts, throwing a fatal `read EADDRNOTAVAIL` exception:

```
 ERROR  [nuxt] [request error] [unhandled] [fatal] [500] read EADDRNOTAVAIL
  at MysqlAdapter.ensureTable (./node_modules/@dyrected/db-mysql/dist/index.js:35:21)  
  at MysqlAdapter.sync (./node_modules/@dyrected/db-mysql/dist/index.js:169:18)  
  at createDyrectedApp (./node_modules/@dyrected/core/dist/chunk-PH36WQYS.js:1832:21)  
  at Object.handler (./node_modules/@dyrected/nuxt/dist/runtime/server/handler.mjs:19:17)  
  at Object.handler (./node_modules/h3/dist/index.mjs:2263:34)  
  at ./node_modules/h3/dist/index.mjs:2017:31  
  at process.processTicksAndRejections (node:internal/process/task_queues:105:5)  
  at async Object.callAsync (./node_modules/unctx/dist/index.mjs:72:16)  
  at async Server.toNodeHandle (./node_modules/h3/dist/index.mjs:2316:7)
```

### Plan to Fix
1. **Descriptive Connection Diagnostics:** Catch connection errors during pool handshakes (especially on `sync` / `ensureTable`). If the error code or message is `EADDRNOTAVAIL` and host specifies `localhost` (or the connection URL resolves to `localhost`), catch it and raise a high-quality explanation guiding the developer to use explicit IPv4 loopback (`127.0.0.1`) in their `.env` database connection configuration to bypass unstable macOS IPv6 loopback mapping.
2. **Safe Fallback Connection Strategy:** Let the adapter automatically log or warn the developer when connection fails on localhost, explicitly suggesting the `127.0.0.1` solution.

---

## Bug 6: `array-field-usability` (Global/Array Field Items Difficult to Organize and Navigate)

**Component/File:** [`packages/admin/src/components/forms/form-field-renderer.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/form-field-renderer.tsx)
**Status:** Resolved ✅

### Issue Outline
Array and repeater fields in the admin dashboard (especially on long global configuration pages) render all items completely expanded by default and cannot be collapsed. Furthermore, there is no way to reorder or rearrange items once they have been added. This makes large arrays or repeating page layouts extremely tedious and difficult to manage.

### Plan to Fix
1. **Collapsible Rows:** Convert the array field renderer to support expanding and collapsing. Add local states for collapse tracking, and construct a compact header for collapsed items displaying its numeric index pill (`#1`, `#2`, etc.) and a relevant preview label parsed dynamically from common text or media candidate fields (e.g. `title`, `label`, `name`, `filename`).
2. **Drag-and-Drop Rearranging:** Integrate `@dnd-kit/sortable` inside `ArrayFieldRenderer` to match `BlockBuilder`'s drag-and-drop capability. Add explicit "Move Up" (ChevronUp) and "Move Down" (ChevronDown) buttons inside each item's header for alternative mouse/touch controls.

---

## Bug 7: `logo-url-prefix-duplication` (Double "/dyrected/" Prefixes Added to Site Logos)

**Component/File:** [`packages/admin/src/lib/utils.ts`](file:///Users/busola/Work/dyrected/packages/admin/src/lib/utils.ts)
**Status:** Resolved ✅

### Issue Outline
When the site branding logo is loaded, `getMediaUrl` resolves relative paths (e.g. `/dyrected/media/logo.png`) by prepending the host base URL (e.g. `http://localhost:3000/dyrected`). Because both parts contain the subfolder prefix `/dyrected`, it produces a broken duplicated URL path such as `http://localhost:3000/dyrected/dyrected/media/logo.png`.

### Plan to Fix
Modify `getMediaUrl` to safely parse the `baseUrl` utilizing a `new URL()` instance. If the relative image URL already starts with the parsed pathname/subpath of the base URL (e.g. `/dyrected`), avoid double-prefixing it by prepending only the origin part of the base URL (e.g. `http://localhost:3000`), or simply returning the relative path directly if the base URL is relative itself.

---

## Bug 8: `images-not-showing-in-edit-pages` (Blank Image Placeholders on Collection Edit Views)

**Component/File:** [`packages/admin/src/components/forms/fields/media-picker.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/fields/media-picker.tsx)
**Status:** Resolved ✅

### Issue Outline
When editing existing collections or globals, saved media picker fields containing string image paths/URLs from the database (e.g. `/dyrected/media/banner.png`) do not show thumbnail previews. The `MediaPicker` attempts to load media metadata by ID, and when the query returns empty because it passed a URL instead of a relationship ID, it renders an empty pulsed placeholder.

### Plan to Fix
Update the image preview resolver in `MediaPicker` to gracefully fall back. If the query to fetch media metadata by ID does not find an object for a value but the value is a valid path/URL string, treat the string value itself as the item target and pass it directly to `getMediaUrl` to display a successful image thumbnail.

---

## Bug 9: `media-library-pagination-limit` (Media Library Limited to Displaying Only 10 Images)

**Components/Files:**
- [`packages/admin/src/pages/media/media-page.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/pages/media/media-page.tsx)
- [`packages/admin/src/components/media/media-library-dialog.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/components/media/media-library-dialog.tsx)
**Status:** Resolved ✅

### Issue Outline
Both the main Media Library page and the field Media Library Dialog query all database documents at once without passing specific page or limit parameters. The underlying API returns only up to the default page size (10 items), preventing the user from viewing or selecting any images beyond the initial ten.

### Plan to Fix
1. **React Query Infinite Scroll:** Refactor both components to replace standard queries with `@tanstack/react-query`'s `useInfiniteQuery`. Fetch items in chunks of 20 with `page` parameters, using `getNextPageParam` to resolve subsequent page numbers.
2. **Sentinel Intersection Observer:** Insert an invisible sentinel `div` at the bottom of the scroll area grids. Wire up an `IntersectionObserver` to trigger `fetchNextPage()` automatically as the user scrolls to the bottom of the container, providing seamless infinite scroll pagination.

---

## Bug 10: `slug-label-mismatch` (Collection Slug Displayed Instead of Human-Friendly Label in Form Buttons and Media Library Headers)

**Components/Files:**
- [`packages/admin/src/components/forms/form-field-renderer.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/form-field-renderer.tsx)
- [`packages/admin/src/pages/collections/list-page.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/pages/collections/list-page.tsx)
- [`packages/admin/src/pages/media/media-page.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/pages/media/media-page.tsx)
- [`packages/admin/src/components/media/media-library-dialog.tsx`](file:///Users/busola/Work/dyrected/packages/admin/src/components/media/media-library-dialog.tsx)
**Status:** Resolved ✅

### Issue Outline
Throughout the Admin UI dashboard, generic labels like "Add Item" are rendered inside array and collection fields instead of specific and human-friendly collection names (e.g. "Add Testimonial" or "Add Post"). Furthermore, the media page and media library dialogs render collection slugs (e.g. `portfolio-assets`) or generic headers like `Media Library` instead of the matching collection label first, hurting usability.

### Plan to Fix
1. **Dynamic Dynamic Add Button Labeling:** Update `ArrayFieldRenderer` to display `Add ${itemLabel}` instead of a static "Add Item". Parse `itemLabel` from the schema label (singularized to match English grammar patterns, e.g. "Testimonials" -> "Add Testimonial").
2. **Collection Creation Buttons:** Modify the "Create New" button in `list-page.tsx` to read `Add ${singularLabel}` (resolving `schema.labels.singular || schema.label || schema.slug`).
3. **Friendly Media Page/Dialog Headers:** Resolve matching schema definitions inside `media-page.tsx` and `media-library-dialog.tsx`. If schema is loaded, display `schema.labels.plural ?? schema.label`, falling back to capital-cased `collectionSlug` or default `"Media Library"`.




