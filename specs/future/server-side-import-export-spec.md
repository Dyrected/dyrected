# Server-Side Import & Export Specification

**Document Version:** 0.3.0 (Draft, code-verified)
**Status:** Proposed
**Scope:** `@dyrected/core` (controller, new import/export services, validation, router, rate limit), `@dyrected/sdk`, `@dyrected/admin` (CSV importer, export actions), `@dyrected/cli`
**Adapters:** no `DatabaseAdapter` interface changes

---

## 1. Context & Motivation

Import and export are implemented entirely in the browser, and they are expensive in HTTP requests.

- **Export** pages through `GET /api/collections/:slug` at `limit: 20`, then flattens documents and builds the CSV in the browser. Exporting 500 documents costs 25 requests. The logic exists in **three** places: `lib/csv.ts` (used by `use-system-ops.ts` and `view-io-actions.tsx`), and a separate inline copy in `list-view-v1.tsx`.
- **Import** (`packages/admin/src/components/ui/csv-importer.tsx`) parses the CSV, coerces and validates each row, fetches image URLs with the browser's `fetch`, uploads each image, then calls `POST /api/collections/:slug` once per row. Importing 500 rows costs at least 500 requests, and more for rows with media.

The core rate limiter (`middleware/rate-limit.ts`) defaults to 500 requests per 15 minutes per client IP. On self-hosted installs without `trustProxy`, every user shares one `127.0.0.1` bucket. A single CSV import can exhaust the window and lock every admin out with `Too many requests. Try again later.`

The rate limit is the symptom. The underlying problems are:

1. **N requests for N rows.** The browser is the orchestrator, so the cost scales with data size.
2. **Logic is trapped in the admin.** Column selection, flattening and coercion live in `@dyrected/admin`. The SDK, CLI and API consumers cannot import or export without re-implementing them.
3. **Remote image fetching is client-side.** It fails on any host without permissive CORS, and it makes the user's browser the download proxy.
4. **Partial failure is hard to reason about.** A closed tab mid-import leaves an unknown subset of rows created.
5. **Large exports hold everything in browser memory** before download.
6. **The server does not validate field values.** Required fields, select options, numeric and date formats are checked only by the admin form. A client that calls the API, and any server-side import, gets no such checks today. This spec adds them to every write (§4.4).

This spec moves import and export into core as first-class endpoints. One request moves any number of documents. The server does the work through the same pipeline that serves a normal create.

## 2. Goals & Non-Goals

**Goals**
1. One HTTP request per import and one per export, regardless of row count.
2. Imported rows go through the same create pipeline as `POST /api/collections/:slug`: access control, defaults, field write access, `beforeChange`/`afterChange` hooks, workflow initialization, password hashing, audit, RAG indexing. Field validation (§4.4) now applies to every write, so import and the API reject the same invalid data.
3. Export is streamed, so memory stays flat and the first bytes arrive immediately.
4. A **dry run** validates the whole file server-side and returns per-row errors without writing.
5. Per-row results: a bad row never aborts the batch, and every failure is reportable and retryable.
6. The SDK and CLI get import and export for free; the admin becomes a thin client.
7. Works on all adapters, serverless included, with no new infrastructure required.

**Non-goals**
- A general background job system or queue. Large imports are handled by chunked requests (§6), not workers.
- Cross-collection or whole-site backup and restore. This spec covers one collection per operation.
- Schema migration or transformation pipelines.
- Importing globals.
- Collections whose members are managed by an external admin-auth provider (`adminAuth.providers[].members`). Their create, list and update are delegated, so import and export return `400` with a clear message.
- Replacing `seed` (`controller.seed`), which stays as the dev-time bulk loader.

## 3. Design Overview

```
Admin / SDK / CLI                          Core
─────────────────                          ────
GET  /export?...        ───────────────▶   stream rows → format → response
POST /export  (json body) ──────────────▶  same, for large id lists and filters
POST /import?dryRun=1   (file + options)▶  parse → map → coerce → validate → report
POST /import            (file + options)▶  parse → map → coerce → create each row → report
```

New code is organised as services so the controller stays thin and the pipeline is testable without HTTP:

| Unit | Responsibility |
| --- | --- |
| `services/export.service.ts` | Select columns, page the adapter, flatten, serialise to CSV/JSON as a stream |
| `services/import.service.ts` | Parse, map, coerce, validate, create, collect row results |
| `services/csv.ts` | RFC 4180 parse and serialise. Single implementation shared by both services |
| `CollectionController.performCreate()` / `performUpdate()` | **Extracted** write pipelines that return a document and throw typed errors (§4.1) |
| `CollectionController.readPage()` | **Extracted** read pipeline shared by `find` and export (§4.3) |
| `utils/validate-document.ts` | New server-side field validation, used by every write (§4.4) |

## 4. Prerequisites

Tracing the code showed that import and export cannot be built safely on the controller as it is. Five prerequisites come first. Each ships on its own and improves the existing API.

### 4.0 What the code does today

| Fact | Where | Consequence |
| --- | --- | --- |
| Create is ~190 lines inline in the handler, and returns `c.json(...)` for access denial | `collection.controller.ts:552-742` | Cannot be called per row; must be extracted (§4.1) |
| Update is already a shared private pipeline, `performUpdate(c, id, data)`, but also returns a `Response` | `collection.controller.ts:1003` | Same split needed so import can update (§4.1) |
| Upload/media creation is a second inline pipeline using `config.storage` | `collection.controller.ts:744-914` | Needed for server-side image import (§4.2) |
| `find` is ~270 lines inline: where sanitising, search, `beforeRead`, workflow draft visibility, access constraint, auto-seed, `afterRead`, field read access, population, auth sanitising | `collection.controller.ts:153-421` | Export must reuse it exactly or it will leak drafts or restricted fields (§4.3) |
| `find` caps `limit` at 100 | `collection.controller.ts:~210` | Export pages internally, below the HTTP cap |
| No server-side validation of `required`, `options`, number, date, email or url. Only immutability and money normalisation exist. No field-level custom validators exist, and workflows do not gate on required fields | `utils/field-integrity.ts`, `workflows.ts` | Validation has to be built, and applied to every write (§4.4) |
| `ValidationError`/`ConflictError` carry a single message. Responses are `{ error, message }` | `utils/errors.ts`, `app.ts:222` | There is no field-keyed error shape to reuse (§4.5) |
| Unique constraints are enforced only by the database. Adapters throw `DuplicateKeyError` (`409`, with `field`, `value`) | adapters, `utils/errors.ts:70` | Violations surface one at a time (§4.5) |
| The global rate limiter runs before `optionalAuth` | `app.ts:193-196` | It cannot key by user (§7) |
| No request body size limit exists | `app.ts` | The import endpoint must enforce its own (§6.1) |
| Trashed documents are moved to the `__trash` collection | `trash.ts:316-356` | They are excluded from reads by construction |
| `MediaService` only fetches oEmbed metadata (YouTube, Vimeo) | `services/media.service.ts` | It is not an upload service; uploads go through `storage.upload` |

### 4.1 Extract the write pipelines

Mirror what `performUpdate` already does. Split each write into a pipeline that returns the persisted document and throws typed errors, and a thin HTTP wrapper that shapes the response.

```ts
private async performCreate(
  c: Context<DyrectedContext>,
  rawData: Record<string, unknown>,
  options?: { deferIndexing?: boolean },
): Promise<BaseDocument>
private async applyUpdate(c: Context<DyrectedContext>, id: string, rawData: Record<string, unknown>): Promise<{ doc: BaseDocument; originalDoc: BaseDocument }>
private async shapeReadResponse(c: Context<DyrectedContext>, doc: BaseDocument): Promise<Record<string, unknown>>
```

- `performCreate` holds today's steps from timestamps through `afterChange` and RAG indexing. Access denial throws `ForbiddenError("Access denied: create on <slug>")`. `app.onError` already answers with `{ error: true, message }` and the thrown status, so the HTTP body is unchanged.
- `shapeReadResponse` holds the `afterRead` hooks, field `afterRead`, field read access and auth-field sanitising that create, update and upload each repeat today.
- `create()` and `update()` become: tenant check, delegated-provider branch, multipart branch, parse body, call the pipeline, `shapeReadResponse`, `c.json`. Their behaviour does not change.
- Import calls `performCreate` and `applyUpdate` per row and skips `shapeReadResponse`, because it only returns the id.
- **Indexing is deferred for import.** Today each write starts a fire-and-forget `RAGService.indexDocument` call. A 500-row chunk would start 500 embedding requests at once. With `deferIndexing: true` the pipeline skips that call, and the import service indexes the chunk's documents afterwards with a concurrency of 2. Index failures are logged and never fail a row. `indexDocument` already returns immediately when RAG is disabled for the collection or no embedding key is configured, so deployments without AI pay nothing.
- **Audit stays per document.** `AuditService.log` is already fire-and-forget and is unchanged: one entry per created or updated document.

**Hooks and the request.** Hooks receive `req: c.req`. In an import, that is the single import request for every row, with `operation` set normally. A hook that reads the request body would find it already consumed. This is documented as a caveat and covered by a test, not engineered around.

**Workflow collections.** The create path uses `createWorkflowDocument` and update uses `saveWorkflowDraft`, which both require `db.transaction` and throw otherwise. Import inherits this: it works on workflow collections where the adapter supports transactions, and a clear error is returned for the whole request when it does not.

This refactor ships first with no behaviour change. The existing create and update tests must pass untouched.

### 4.2 Extract file storage from `upload`

Server-side image import needs to create a media document from bytes. Extract `storeUploadedFile(c, { file, fields })` from `upload()` (`validateUpload`, `generateUniqueUploadFilename`, `storage.upload`, then the create steps). `upload()` calls it.

The extraction is behaviour-preserving. Upload today skips `persistInTransaction`, workflow handling and audit logging that the JSON create path performs. That inconsistency is noted and left alone; changing it is a separate decision.

### 4.3 Extract the read pipeline

Extract `readPage(c, args)` from `find`, where `args` is `{ where, sort, page, limit, depth, search }` and the result is the processed, populated, sanitised page. `find` calls it and keeps only HTTP concerns: parsing query params, the `limit` cap of 100, and the delegated-provider branch.

`readPage` must preserve, in order: where sanitising (including `admin.filterable === false`), search, `beforeRead`, the workflow draft-visibility filter, the access `constraint`, `materializeWorkflowDocument`, defaults, `afterRead`, field read access, population, and auth-field sanitising.

Two behaviours are explicitly **not** carried into export:
- **Auto-seeding.** `find` creates `initialData` documents when a collection is empty. An export must never write.
- **The 100-row cap.** That is an HTTP guard; export pages internally with its own batch size.

### 4.4 Server-side field validation (every write)

Nothing on the server validates field values today. Required fields, select options, number ranges and date formats are enforced only in the admin form, so the API accepts anything. This spec closes that for **every** write path, not only import. An API that accepts data the admin would refuse is a data-integrity hole, and import would otherwise be the only path that behaved correctly.

Add `validateDocument(fields, data, { operation, existing })` in `utils/validate-document.ts`. It returns a field-keyed map and never throws. Callers turn a non-empty result into a `ValidationError` (`400`) carrying `errors` (§4.5).

```ts
interface FieldErrors { [fieldPath: string]: string }
```

**What it checks**, per field type (the full rules are in §6.3): `required`; `select`, `radio` and `multiSelect` against static or resolved `options`; `number` against `min`/`max`; `money` as a safe integer; `boolean`; `date`, `datetime` and `time` formats; `email` and `url` formats; JSON validity; and nested `object` and `array` fields recursively, with field paths like `address.city` and `items.2.sku`.

**Where it runs**

| Write path | Validated |
| --- | --- |
| `POST /collections/:slug` (`performCreate`) | Yes, all fields |
| `PATCH /collections/:slug/:id` (`applyUpdate`) | Yes, fields present in the payload |
| Operational view actions with declarative mutations (they use the update pipeline) | Yes, as `PATCH` |
| Import rows | Yes, after coercion |
| Upload (`storeUploadedFile`) | Yes, the collection's declared custom fields |
| Globals `PATCH` | Yes, fields present in the payload |
| `seed`, `initialData` auto-seed | No. These are developer-supplied and call the adapter directly |
| Restore from trash | No. The snapshot was valid when deleted and may predate new rules; restore must never be blocked by validation |

**Timing.** Validation runs on the **final** payload, after `beforeChange` hooks (the same point as the immutability and uniqueness checks), so a hook that fills in or normalises a required value is respected.

**Partial updates.** `PATCH` validates only the fields present in the payload. A document that violates a rule introduced after it was written does not block an unrelated edit. A required field is rejected only when a `PATCH` explicitly sets it to `null` or an empty value.

**No coercion on the API path.** The API never rewrites values to make them pass. A wrong type is rejected with a message naming the field and the expected type. The two existing normalisations are kept: money integer strings, and the admin importer's coercion, which happens before validation in import only.

**Workflow collections.** Drafts are routinely incomplete, so for a collection with a `workflow` (including `drafts: true`), `required` is **not** enforced when saving a draft (`saveWorkflowDraft`). It is enforced when a transition moves the document into its published state. Format and type checks (a malformed email, an out-of-range number) apply to drafts as well. Workflows do not gate on required fields today, so the transition check is new behaviour that must be added in `transitionWorkflow` and tested.

**Rollout, because this is a breaking change for API consumers.** Applications that currently send incomplete or loosely typed data will start receiving `400`s.

- `validation` is configurable app-wide and per collection: `'enforce'` (default), `'warn'`, or `'off'`.
- `'warn'` runs the validator, logs each violation through the request logger with the collection, field and operation, and lets the write through. It exists so operators can see what would break before enforcing.
- `defineCollection({ validate: false })` opts a single collection out for known-legacy data.
- The release is flagged as a behaviour change in its changeset and the upgrade notes, and `dyrected doctor` gains a check that reports the effective mode.
- The admin form, SDK and CLI surface `errors` per field (§9).

**Test sequence.** First, a characterisation test pinning that `POST` accepts a missing required field today. Then the validator with unit tests per field type. Then the wiring, flipping that test deliberately in the same change so the behaviour change is visible in review.

### 4.5 Application-level uniqueness and field-keyed errors

Unique constraints (`unique: true` fields and `CollectionIndex` entries with `unique: true`) are enforced only by the database. Adapters already translate the driver error into `DuplicateKeyError`, so the failure is a clean `409`. But there is no pre-check, so violations surface one at a time, after hooks have run, and as a single message.

**Field-keyed errors.** Add an optional `errors?: Record<string, string>` to `DyrectedError`, and have `app.onError` include it in the JSON body when present. The change is additive: `message` stays, and existing consumers ignore the new key.

```json
{ "error": true, "message": "Validation failed", "errors": { "email": "already exists", "slug": "already exists" } }
```

**`assertUniqueness(collection, data, { excludeId })`**, called from `performCreate` and `applyUpdate`:

1. Collect constraints: every field with `unique: true`, plus every unique `CollectionIndex` (single or composite).
2. For each constraint whose values are all present and non-null, query for a document with those values, excluding `excludeId` on update. Run it on the **final** values, after `beforeChange` hooks, so a hook that derives a unique value is checked.
3. Collect all violations and throw one `ConflictError` (`409`) with `errors`. A composite violation is keyed by the index's first field, and the message names the full set.
4. **The database constraint stays as the backstop.** The pre-check is a read, so two concurrent writers can both pass it. `DuplicateKeyError` is mapped to the same `errors` shape from its `field` and `value`.

Trashed documents live in `__trash`, so they do not occupy a unique value. Restore keeps its own conflict check. This check does not change that.

Everything that writes benefits: the REST API, the admin form, view actions and import. Collections without unique constraints see no change.

Uniqueness checks and field validation report together: one `400`/`409` response lists every field error, so an editor fixes everything in one pass.

## 5. Export

### 5.1 Endpoint

```
GET /api/collections/:slug/export
```

| Query param | Default | Description |
| --- | --- | --- |
| `format` | `csv` | `csv` or `json` (NDJSON when streaming) |
| `where` | none | Same filter syntax as `find` |
| `sort` | collection default | Same as `find` |
| `fields` | all exportable | Comma-separated field names to include, in order |
| `ids` | none | Comma-separated ids; restricts to a selection (applied as `where id in [...]`, merged with `where`) |
| `search` | none | Same text search as `find` |
| `depth` | `1` | Relationship population depth, as `find` |

Response headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="<slug>-export-<yyyymmdd>.csv"
```

It is registered before the `/:id` wildcard, like `delete-many` and `trash`.

**`POST /api/collections/:slug/export`** accepts the same parameters as a JSON body:

```json
{ "format": "csv", "where": { "status": { "equals": "draft" } }, "ids": ["a", "b"], "sort": "-createdAt", "fields": ["title", "status"], "search": "q", "depth": 1 }
```

`GET` is for simple, bookmarkable exports. `where` is already JSON inside the URL, and an "export selected" of a few hundred ids produces a URL of tens of kilobytes, which proxies and CDNs commonly reject. `GET` therefore accepts at most **100** `ids` and returns `400` pointing to `POST` beyond that. The admin and SDK use `POST` whenever `ids` is present.

Both verbs run the same service and the same access checks. `POST` is a read operation despite its verb. It is documented as such in the OpenAPI spec, and it is not subject to any CSRF-style write protections the app applies to mutations.

### 5.2 Behaviour

1. **Access.** Export calls `readPage` (§4.3), so it gets everything `find` applies: the collection's `read` access and its row-level constraint, `beforeRead`, workflow draft visibility, field-level read access and population. A user can never export a row or field they cannot read.
2. **Trash.** Trashed documents live in `__trash`, so they are excluded by construction.
3. **Paging.** The service pages `readPage` with a server-chosen batch size (default 500, configurable), below the 100-row HTTP cap that only applies to `find`. Pass an explicit `sort` with `id` appended as a tiebreaker when the requested sort is not unique, so concurrent writes do not duplicate or skip rows. Export never auto-seeds.
4. **Streaming.** Rows are written to a `ReadableStream` as each batch is serialised. No full-set buffering.
5. **Columns.** Column derivation moves from `csvColumnsForSchema` into core and is a single source of truth:
   - `id`, every visible schema field in declared order, `updatedAt`
   - excluded: `password`, `admin.hidden` fields, field types `row`, `join`, `blocks`
6. **Flattening.** Port `flattenForCsv` unchanged in behaviour so existing exports stay byte-compatible: arrays join with `; `, media resolve to a URL, relationships resolve to title/name/label then id, objects fall back to JSON. Media URLs become absolute using the request's public base URL. `money` fields export the stored integer of minor units, never a formatted amount, so a re-import is exact.
7. **Formula injection.** Cells beginning with `=`, `+`, `-` or `@` are prefixed with `'` in CSV output. This is a security fix over today's behaviour (§11).
8. **Encoding.** CSV is UTF-8 with a leading byte-order mark by default (`export.bom`, default `true`), because Excel otherwise misreads non-ASCII text. Line endings stay `\n`, as today. JSON export (NDJSON) never carries a BOM.
9. **Row cap.** `export.maxRows` (default `100_000`). Exceeding it returns `413` with guidance to narrow the filter, instead of a half-written file.

### 5.3 Auth-collection and sensitive data

- `password`, reset tokens, and invite tokens are never exported.
- Exporting an `auth` collection uses the same `read` access as any other collection. There is no extra role requirement in v1, so a deployment that lets non-admins read the users collection will let them export it. Operators who need more can set the app-wide `export.access` gate (§8).
- Collections with externally managed members return `400`. Their data is not in the local database.

### 5.4 Cancellation

If the client disconnects, the stream's `cancel` stops paging immediately. No orphaned work.

### 5.5 Hosting

Export returns a standard fetch-API `Response` with a `ReadableStream` body, which Hono handles in every runtime the app supports. The Next integration wraps the app with `hono/vercel`'s `handle`, which passes the `Response` through unchanged.

- Hosts that buffer responses (some proxies, and the Nuxt `$fetch` path in the SDK) deliver the whole file at once. Memory is then bounded by `export.maxRows`, which is why that cap exists.
- Serverless platforms cap function duration. A 100,000-row export may exceed it. `export.maxRows` and `export.batchSize` are the controls, and the docs state the host limits to size them against.
- Streaming through the Next handler and the Nuxt module has not been exercised yet. Step 6 includes an acceptance test against each, and the docs claim streaming only for the hosts that pass it.

## 6. Import

### 6.1 Endpoint

```
POST /api/collections/:slug/import
Content-Type: multipart/form-data
```

| Part | Description |
| --- | --- |
| `file` | The CSV or JSON file |
| `options` | JSON string: see below |

Alternatively `application/json` with `{ rows: [...], options }` for SDK and CLI use, where the caller has already parsed the data.

**Authorisation.** Before reading the body, the endpoint evaluates `import.access` (§8) when configured, and returns `403` if it denies. Per-row `create` access then applies as usual. The two are independent: a deployment can restrict bulk import to admins while still letting editors create documents one at a time.

**Text encoding.** CSV must be UTF-8. A leading BOM is stripped. Content that is not valid UTF-8 returns `400` with a message suggesting "Save as CSV UTF-8" instead of importing mojibake. The delimiter is auto-detected from the header line among `,`, `;`, tab and `|` (the admin's `papaparse` does the same today), and can be forced with `options.delimiter`. Any line ending is accepted, and quoted fields may contain newlines.

**Request size.** The app has no body size limit today, and `c.req.formData()` buffers the whole body in memory. The endpoint therefore enforces its own cap: it rejects with `413` from the `Content-Length` header before reading the body, and again after reading if the header was absent or wrong. The limit is `import.maxFileBytes`, and it applies to the JSON form too.

```ts
interface ImportOptions {
  format?: 'csv' | 'json';              // default: inferred from file
  /**
   * CSV header → target. A string is shorthand for `{ field }`; `null` ignores the column.
   * Omitted headers are matched by field name, then label.
   */
  mapping?: Record<string, string | ImportColumnMapping | null>;
  /** Validate and report only. Writes nothing. */
  dryRun?: boolean;
  /** What to do when a row matches an existing document (see `matchOn`). */
  onConflict?: 'fail' | 'skip' | 'update';   // default: 'fail'
  /**
   * The field used to find an existing document for `onConflict`.
   * `'id'` (default) or the name of a field with `unique: true`.
   * Any other field rejects the whole request with `400` before any row runs.
   */
  matchOn?: string;
  /** Stop at the first failed row instead of continuing. */
  stopOnError?: boolean;                // default: false
  /** CSV delimiter. Auto-detected when omitted. */
  delimiter?: ',' | ';' | '\t' | '|';
  /**
   * Identifies one logical import across chunks and retries (§6.9). The SDK,
   * CLI and admin generate one per import. Rows without a match key get a
   * deterministic id derived from it, so retrying a chunk cannot double-create.
   */
  runId?: string;
  /** Fetch remote URLs for image/upload fields server-side. */
  fetchRemoteMedia?: boolean;           // default: true
  /** 1-based row range within the file, for chunked imports (§6.6). */
  range?: { from: number; to: number };
}

interface ImportColumnMapping {
  /** Target field name on this collection. */
  field: string;
  /**
   * Relationship fields only: which field on the related collection the cell
   * contains. `'id'` (default) or any field name, for example `email` or `slug`.
   */
  matchBy?: string;
}
```

### 6.2 Response

```ts
interface ImportResult {
  dryRun: boolean;
  total: number;            // rows considered
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];  // failures always; successes only if ?verbose=1
  /** Set when the file was larger than one request would process. */
  nextRange?: { from: number; to: number };
}

interface ImportRowResult {
  row: number;              // 1-based, matches the user's spreadsheet row minus header
  status: 'created' | 'updated' | 'skipped' | 'failed';
  id?: string;
  errors?: Record<string, string>;   // field-keyed, same shape the admin form shows
  message?: string;                  // row-level failure
}
```

HTTP status is `200` when the batch was processed, even if rows failed. `4xx` is reserved for request-level problems (bad file, unknown collection, no access).

### 6.3 Pipeline per row

1. **Map** headers to fields using `mapping`, falling back to name then label match (the matching the admin importer does today).
2. **Coerce** cell text to the field's stored shape using the table below.
3. **Validate** with `validateDocument` (§4.4), the same validator every write uses. All errors for the row are collected, not just the first.
4. **Resolve** relationship cells (§6.3.1) and image cells (§6.5).
5. **Create or update** through `performCreate` / `applyUpdate` (§4.1). Access, defaults, field write access, hooks, uniqueness (§4.5), workflow rules, audit and indexing run as for an API write.
6. **Record** the row result. Never throw out of the loop on a row-level failure.

**Importable columns.** Same as the admin importer today: every field except layout fields (`row`, `join`) and `admin.hidden` fields. `createdAt` and `updatedAt` are set by the server and are not importable. `id` is accepted only when it is the `matchOn` key (§6.7), or to preserve ids when the document does not yet exist.

#### Coercion rules

Import coerces text to the stored shape first, then validates. The API does not coerce (§4.4). The admin importer today coerces only `number`, `boolean`, `date`/`datetime`, `image`, `url` and `select`/`radio`, and treats everything else as a string. It has no handling for relationships, multi-select, JSON, objects, arrays or money. The table below is therefore the **new** contract. Rows marked ✱ are behaviour carried over from the admin importer.

| Field type | Cell value | Stored as | Validation |
| --- | --- | --- | --- |
| `text`, `textarea`, `icon`, `richText` | string | string | `required` |
| `email` | string | string | email format |
| `url` ✱ | URL string | `{ type: "custom", url, label: "" }` | valid absolute URL |
| `date`, `datetime` ✱ | any `Date`-parsable string | ISO 8601 string | valid date |
| `time` | `HH:mm` or `HH:mm:ss` | string | time format |
| `number` ✱ | numeric text; currency symbols and thousands separators stripped | number | numeric; `min`/`max` if declared |
| `money` | integer of **minor units** (kobo, cents) | integer | safe integer; decimals rejected with a hint to use minor units |
| `boolean` ✱ | `true/false`, `yes/no`, `1/0` (case-insensitive) | boolean | one of the accepted forms |
| `select`, `radio` ✱ | option value or label (case-insensitive) | canonical option value | must match a static option |
| `multiSelect` | values separated by `;` | string array | each value must match a static option |
| `relationship` | id, or the `matchBy` field's value; `;`-separated when `hasMany` is set | id or id array | resolved per §6.3.1 |
| `image` ✱ | media id, or a URL | media id | resolved per §6.5 |
| `json` | JSON text | parsed value | valid JSON |
| `object`, `array` | JSON text | parsed value | nested fields validated recursively |
| `blocks` | JSON text (JSON import only) | parsed value | block types validated |
| `row`, `join` | not importable | none | none |

Notes:
- **Dynamic options.** A field's `options` may be a static list, a `DynamicOptionsResolver`, or a `DynamicOptionsConfig` (`schema-core.ts`). Resolvers are server-side functions that receive `{ db, user, req }`, so import can run them. Each resolver is called once per request per field with a read-only `db`, the importing `user` and the import request, and its result is cached for the request (honouring `cacheTTL`). A resolver that throws does not fail the import: that field is validated as unconstrained and listed under `skippedChecks`.
- **Money is minor units.** This matches the API contract and what export emits, so a round trip is exact. Accepting decimals would make `1000` ambiguous between 10.00 and 1000.00.
- **Export and import round-trip.** Today a relationship exports as a title but the importer cannot resolve a title, so a re-import writes the title string into a relationship field. `matchBy` (§6.3.1) fixes this: the user maps the column back to the field that the export wrote.

#### 6.3.1 Relationship resolution (`matchBy`)

A relationship cell holds a value the user can read, not necessarily an id (for example `author = "Jane Doe"`). The user chooses which field on the related collection that value identifies, per column, through `matchBy`. The default is `id`, so existing exports re-import unchanged.

| Lookup result | Row outcome |
| --- | --- |
| Exactly one match | Resolved to that document's id |
| No match | Row fails: `author: no users found where name = "Jane Doe"` |
| More than one match | Row fails: `author: matches 2 users where name = "Jane Doe"; match by a unique field such as email` |

- Import never creates the related document implicitly. That would be a surprising side effect and would bypass the related collection's own create access.
- Multi-value relationships split on `;` and resolve each value independently. One unresolved value fails the row.
- Resolution runs with the **importing user's read access** on the related collection, so a user cannot probe documents they cannot read.
- Lookups are batched and cached per request, one query per distinct `(collection, matchBy)` value set per chunk, not one per row.
- `matchBy` accepts any field on the related collection, because ambiguity is reported per row. Unlike `matchOn` (§6.7), it does not have to be unique.

Access is evaluated **per row** with the row's data, because `create` access functions receive `data`. A user with conditional create access gets a correct per-row 403 as a failed row, not an all-or-nothing denial.

### 6.4 Dry run

`dryRun: true` runs mapping, coercion, `validateDocument`, relationship resolution, the `create` access check for each row, and the uniqueness pre-check (§4.5). All of these are reads. It does not persist, and it does not run any hook, audit, indexing or media fetching.

- **`beforeChange` hooks are not run**, because they may have side effects, and hooks can throw. The response says so in `skippedChecks`, so the preview never claims more certainty than it has.
- **Image URLs are validated for form and host policy (§6.5) but not fetched.**
- Access is evaluated with `data` before `beforeChange`, which can differ from the final data a real run would see.

A row that passes dry run can still fail on a real run (a hook rejects it, a remote image is unreachable, a unique constraint races). The admin preview must present dry run as "looks valid", not "guaranteed".

### 6.5 Remote media fetching and SSRF

Server-side URL fetching is a classic SSRF vector. Requirements:

- Only `http:` and `https:`.
- Resolve DNS, then reject loopback, link-local, private (RFC 1918), CGNAT, and cloud-metadata addresses (`169.254.169.254`, etc.). Check the **resolved** address, and re-check after redirects.
- Max redirects: 3. Max body size: `import.media.maxBytes` (default 25 MB). Timeout: 15 s.
- The file must pass the target media collection's `upload.allowedMimeTypes` and `upload.maxFileSize` through the existing `validateUpload`. The import does not add its own MIME list.
- Optional `import.media.allowHosts` allowlist.
- Per-import concurrency cap (default 4) so one import cannot saturate outbound bandwidth.

**Resolution order for an `image` cell:**
1. If the value is not a URL, treat it as a media id and verify it exists in the field's `relationTo` collection.
2. If it is a URL, look for an existing media document whose `url` equals it (`url` is a filterable system field). If found, reuse its id. This stops a re-import of an export from downloading and duplicating every image from its own server.
3. Otherwise fetch it, store it with `storeUploadedFile` (§4.2) into the field's `relationTo` collection, and use the new id.

Upload runs through the media collection's own access and hooks, so a user who cannot create media gets a failed row, not a silent bypass.

On failure the row fails with a clear message; the batch continues.

### 6.6 Large files and request limits

A single request must not run unbounded, particularly on serverless where execution time is capped.

- The service processes rows until `import.maxRowsPerRequest` (default 500) or `import.maxDurationMs` (default 25 000) is reached, then returns the result plus `nextRange`.
- The caller (admin, SDK, CLI) re-issues the request with `range: nextRange`. The SDK exposes `importAll()`, which loops until `nextRange` is absent and aggregates results.
- The file is re-sent per chunk in this design. This keeps the server stateless with no upload store or job table. For typical admin imports (< 50k rows), the cost is acceptable and is O(chunks), not O(rows).

A 50,000-row import is 100 requests, not 50,000.

**Alternative considered: server-side jobs.** A persisted `import_jobs` collection with a `jobId` and polling would allow true background processing. It needs durable file storage between requests, a worker model that works on serverless, and a status API. The existing `tasks.ts` runner is cron-and-lock oriented, not a work queue. This is deferred (§12) because chunked requests solve the stated problem without new infrastructure.

### 6.7 Matching existing documents (`onConflict` and `matchOn`)

`onConflict` decides what happens when a row matches an existing document. `matchOn` decides what "matches" means.

```ts
{ onConflict: 'update', matchOn: 'email' }   // match users by email
{ onConflict: 'skip' }                       // matchOn defaults to 'id'
```

**Validation, before any row runs.** `matchOn` must be `'id'` or an eligible unique field. Anything else returns `400` with the list of eligible fields. Matching on a non-unique field would silently update unrelated documents.

A field is eligible when either is true:
- it declares `unique: true` (`FieldBase.unique`, `schema-core.ts`), which core promotes to a physical column and every adapter backs with a unique index; or
- it is the sole field of a collection-level index declared `{ fields: [name], unique: true }` (`CollectionIndex`, `schema-config.ts`).

Auth collections always qualify on `email`, which core injects as `unique: true`. Because eligible fields are promoted columns, the match lookup is an indexed `where` query, not a JSON scan.

**Uniqueness.** Uniqueness is enforced by the shared check in §4.5, so import does not carry its own rules.
- A row that violates a constraint fails with the same field-keyed error (`email: already exists`) that the API returns.
- Under `onConflict: 'update'` or `'skip'`, the row is first resolved against `matchOn`. A uniqueness violation on a *different* unique field than `matchOn` is still a row failure (it would mean the row collides with a second, unrelated document).
- If a concurrent writer creates the matched document between the lookup and the create, the database backstop fires. The row is re-resolved once against `onConflict` (becoming an update or a skip), and only fails if the second attempt also conflicts.

**Per row:**

| Matches | `fail` (default) | `skip` | `update` |
| --- | --- | --- | --- |
| None | create | create | create |
| One | row fails: already exists | row `skipped` | row `updated` |
| More than one | row fails | row fails | row fails |

A row's `matchOn` cell must be non-empty. An empty value fails the row rather than matching nothing and creating a duplicate. With `matchOn: 'id'`, a row without an `id` cell is simply created.

`update` runs `applyUpdate` (§4.1) for the matched document (access, field write access, `beforeChange`/`afterChange`, workflow rules, audit), not a raw write. On a workflow collection this saves a new draft revision. Columns absent from the file are left untouched; empty cells are applied as empty only when the column is mapped.

**Idempotency.**
- Rows matched by `id` or a unique field make a re-run safe. A failed chunk or retry does not double-create.
- Rows with no match key are not idempotent. The response states how many were created before a failure so the caller can retry only failed rows.
- The admin's existing "retry failed rows" and "download failed rows CSV with Import Error column" flows keep working from `rows[]` with `status: 'failed'`.

### 6.8 Transactions

Each row is its own unit. A whole-file transaction is intentionally not provided: a 10,000-row transaction holds locks, defeats per-row hook semantics, and is not portable across all adapters. Callers that need all-or-nothing should run `dryRun` first, and use `stopOnError: true`.

### 6.9 Retry safety and time budget

**Retry safety (`runId`).** A chunk can complete on the server while the response is lost, and the retry would then re-create rows that have no match key. Import closes this without new storage:

- The caller sends the same `runId` on every chunk and retry of one logical import. The SDK, CLI and admin generate it automatically.
- For a row that would be created without an `id`, the server assigns a **deterministic id** derived from `SHA-256(runId + ":" + rowNumber)`, formatted to the collection's `idType` (a prefixed id with the collection prefix, or a UUID layout). If `idGenerator` is custom, the derived id is still honoured because `performCreate` keeps a caller-supplied `data.id`.
- A retried row therefore targets the same id. The create is attempted, the uniqueness backstop (§4.5) reports the existing id, and the row resolves as `skipped` with a note that it was created by this run, rather than as a duplicate or a failure.
- Rows that already carry an `id` or a `matchOn` value are idempotent by those keys and do not need this.
- Without a `runId` the old behaviour applies: not idempotent, and the docs say so.

The deterministic id must not collide across runs, which the `runId` provides, and must be indistinguishable from a normal id to the rest of the system. A test asserts both, per `idType`.

**Time budget.** `import.maxDurationMs` is a soft budget checked **between** rows. A row in progress is never cancelled, because aborting a hook or a half-written document is worse than overrunning. The consequences are explicit:

- The response is returned after the in-flight row finishes, so a single slow row can overrun the budget by that row's time.
- Remote image fetches have their own 15 s timeout (§6.5), which bounds the worst row.
- The default (25 s) assumes a 60 s host limit. The docs tell operators to set it to at most half of their host's function limit.
- If the client disconnects, the request signal stops further rows. Rows already written persist, and a retry with the same `runId` resumes safely.

## 7. Rate Limiting

- Import and export are single requests, so the global limiter stops being the bottleneck. Both routes live under `/api`, so each still counts as one request toward the global bucket.
- Both endpoints get their own bucket, keyed by **user id**.
- **Ordering constraint.** The global limiter is registered before `optionalAuth` (`app.ts:193-196`), so it only ever sees an IP. The bulk bucket cannot live in that middleware. It is a route-level middleware registered after authentication, on the import and export routes only, and it falls back to the client IP when there is no user.
- The bucket reuses the existing `RateLimitConfig` machinery and `skip` hook and the same in-memory store semantics, so it behaves the same on a single node. Multi-instance deployments share the same caveat the global limiter already has.
- Defaults: 10 imports and 20 exports per user per hour. Configurable:

```ts
defineConfig({
  rateLimit: {
    bulk: { importMax: 10, exportMax: 20, window: 60 * 60 * 1000 },
  },
})
```

- Row-level creates inside an import do **not** count against any request limiter. They are one request.
- A dry run counts as an import request. Chunked imports consume one unit per chunk, so `importMax` should be sized with `maxRowsPerRequest` in mind (the default of 10 per hour covers 5,000 rows).

## 8. Configuration

```ts
defineConfig({
  import: {
    access: ({ user }) => user?.roles?.includes('admin'), // optional extra gate
    maxRowsPerRequest: 500,
    maxDurationMs: 25_000,
    maxFileBytes: 20 * 1024 * 1024,
    media: {
      maxBytes: 25 * 1024 * 1024,
      allowHosts: ['cdn.example.com'],   // optional
    },
  },
  export: {
    batchSize: 500,
    maxRows: 100_000,
    bom: true,                                              // UTF-8 BOM for Excel
    access: ({ user }) => user?.roles?.includes('admin'), // optional extra gate
  },
})
```

Validation (§4.4) is configured separately and applies to all writes:

```ts
defineConfig({
  validation: 'enforce',            // 'enforce' (default) | 'warn' | 'off'
})
defineCollection({ slug: 'legacy_orders', validate: false })  // opt one collection out
```

Per-collection override via `defineCollection({ import: false })` / `export: false` to disable either for a collection, mirroring `trash`.

## 9. SDK, CLI & Admin

### 9.1 SDK

```ts
// Export — returns a Response/stream; helper to read text
const csv = await client.collection('posts').export({ format: 'csv', where: { status: { equals: 'draft' } } });

// Import — single call, loops chunks internally
const result = await client.collection('posts').import(file, {
  dryRun: false,
  onConflict: 'update',
  matchOn: 'email',
  mapping: { Author: { field: 'author', matchBy: 'email' } },
  onProgress: ({ processed, total }) => {},
});
```

`import()` accepts a `File`/`Blob`/string or pre-parsed `rows`. `onProgress` fires per chunk. It generates a `runId` when none is given and reuses it for every chunk and retry, so a transient failure can be retried without duplicates (§6.9).

**Field errors.** `DyrectedError` in the SDK gains an `errors?: Record<string, string>` property populated from the response body, so consumers can map validation and uniqueness failures to form fields without parsing messages.

**SDK internals.** `DyrectedClient.request()` always calls `res.json()` on success and dispatches the `dyrected:rate-limit` and `dyrected:auth-unauthorized` window events on `429`/`401`. Export returns text or a stream, so it needs a sibling `requestRaw()` that returns the `Response` and shares the same header merging and error mapping. Under a custom `fetch` such as Nuxt's `$fetch`, which returns parsed data rather than a `Response`, `export()` returns the text the adapter yields and does not stream.

### 9.2 CLI

The existing CLI commands either read local files (`generate:types`, `doctor`, `nav`) or call Dyrected Cloud with an API key (`sync:schema`). None talks to a self-hosted server's data API. Import and export are the first that do.

```
dyrected export <collection> [--format csv|json] [--where <json>] [--out <file>]
dyrected import <collection> <file> [--dry-run] [--on-conflict skip|update|fail] [--match-on <field>]
```

- Both use the SDK against `--url` (or `DYRECTED_URL`) with a bearer `--token` (or `DYRECTED_TOKEN`). They do not load `dyrected.config.ts` and do not open the database directly, so access control always applies.
- A token is a JWT from the collection's `login` endpoint. The command help documents how to obtain one.
- `import` prints a summary and writes failed rows to `<file>.errors.csv` with an `Import Error` column, matching the admin's behaviour.
- New command modules follow the existing `registerX(program)` pattern in `cli/src/commands/`.

### 9.3 Admin

- The client-side CSV code is removed from every place it lives:
  - `lib/csv.ts` (`fetchAllDocs`, `buildCsv`, `flattenForCsv`, `csvColumnsForSchema`, `downloadCsv`)
  - `components/ui/csv-importer.tsx` (parse, coercion and the per-row create loop) and its `csv-importer-dialog.tsx`
  - `pages/collections/views/use-system-ops.ts` (`exportDocs`, `exportAll`, `fetchAll`)
  - `pages/collections/views/view-io-actions.tsx` (`exportCsv`, `fetchAllDocs` use, `ImportCsvDialog`)
  - `pages/collections/list-view-v1.tsx`, which carries its **own** inline copy of the flatten, escape and export code and renders `CsvImporter`
  - `pages/collections/views/operational-view-page.tsx`, which renders `ImportCsvDialog`
- The file is still parsed in the browser with `papaparse` for the mapping step (to show headers and a sample). Coercion, validation and creation are server-side.
- **Export all / filtered:** triggers `GET /export` with the view's current `where` and `sort`. **Export selected** sends `ids` with `POST /export` instead of building the CSV from loaded rows, so it respects field access consistently and is not limited by URL length.
- **Import:** the existing wizard keeps its steps (upload → map → preview → import → complete). The preview step calls `dryRun`. The import step calls `import()` with progress. The mapping UI sends `mapping` instead of coercing locally. Two additions:
  - A relationship column shows a **Match by** dropdown listing `ID` and the related collection's fields, with `ID` preselected.
  - When "Update existing entries" is chosen, a **Match existing entries by** dropdown lists `ID` and the collection's `unique` fields only.
- Image-URL fetching and `File` construction in the browser are removed.

## 10. Backwards Compatibility

- No changes to existing endpoints. `POST /api/collections/:slug` behaves as before.
- The CSV produced by export matches today's output apart from two intentional changes: the formula-injection prefix (§5.2, item 7) and the leading UTF-8 BOM (§5.2, item 8, disable with `export.bom: false`). Consumers that parse the first header cell byte-for-byte should strip the BOM.
- **The admin requires a matching core version.** There is no fallback to the old client-side import and export loops. `@dyrected/admin` declares the minimum `@dyrected/core` version in its peer dependency range, and the release notes state it. If the admin reaches a server that answers `404` on the new routes anyway (a stale deployment), it shows a clear message, "This server needs @dyrected/core X or later to import and export", instead of failing silently.
- New config keys are all optional with the defaults above.
- `DyrectedError` gains an optional `errors` map and `app.onError` forwards it. Existing responses keep `error` and `message` unchanged.
- **Breaking change:** `POST`/`PATCH` now reject invalid field values (§4.4). `validation: 'warn'` and `validate: false` provide a migration path. This ships as its own release with upgrade notes, and the changeset says so.
- The old client-side loops are deleted in the same release as the endpoints.

## 11. Security

| Risk | Mitigation |
| --- | --- |
| SSRF via image URLs | §6.5: scheme, resolved-IP and redirect checks, size and time caps |
| CSV/formula injection in exports | Prefix `'` on cells starting with `= + - @` |
| Exporting data a user cannot read | Row `where` + field read access applied per document |
| Privileged data in auth collections | Passwords and tokens are never exported. Export otherwise follows `read` access, so the collection's `read` rule is the control (§5.3) |
| Mass-create abuse | Per-row create access, per-user bulk limiter, `maxRowsPerRequest`, `maxFileBytes` |
| Zip/CSV bomb | `maxFileBytes`, row cap, streaming parser |
| Hook side effects in dry run | `beforeChange` skipped in dry run and disclosed in response |
| Tenant crossing | `checkTenantAccess` and the resolved `siteId` apply to import and export exactly as to `create` and `find` |
| Oversized request bodies | No global limit exists; the import endpoint rejects over `maxFileBytes` from `Content-Length`, then again after reading |
| Export writing data | Export uses `readPage` with auto-seed disabled, so it never creates documents |
| Reading data through relationship lookup | `matchBy` lookups use the importing user's read access on the related collection |
| Bypassing media access | Image import goes through the media collection's access and hooks |
| Externally managed members | Import and export reject these collections rather than touching the local table |
| Bulk import by users who may only create singly | `import.access` gate, evaluated before the body is read |
| Embedding-provider flooding | Indexing deferred and run at concurrency 2 after each chunk (§4.1) |
| Duplicate rows on retry | Deterministic ids from `runId` (§6.9) |
| Mojibake from wrong encoding | Non-UTF-8 files rejected with a clear message (§6.1) |

## 12. Decisions & Out of Scope

The following were considered and settled for this spec.

**Decisions**

| Topic | Decision |
| --- | --- |
| Update match key | `matchOn` is `id` or a single unique field. The user chooses; non-unique fields are rejected up front (§6.7). |
| Relationship cells | The user chooses `matchBy` per column; ambiguity fails the row, nothing is auto-created (§6.3.1). |
| Uniqueness enforcement | A shared application-level check plus the database backstop (§4.5), so API, admin and import behave identically. |
| Long imports | Chunked requests with `range`/`nextRange`. No job table or worker (§6.6). |
| Export of `blocks` and `join` fields | Excluded from CSV, as today. Included in JSON export, which round-trips them losslessly. |
| Audit | Per-document audit entries only, from the same pipeline as a normal create or update. No separate import-run record. |
| Dry run | Skips `beforeChange` hooks and media fetching, and says so in the response (§6.4). |
| Field validation | New server-side `validateDocument`, applied to **every** write path, with `enforce`/`warn`/`off` and per-collection opt-out (§4.4). |
| Money in CSV | Integer minor units only, matching the API and the export (§6.3). |
| Image round trip | Reuse an existing media document whose `url` matches before fetching (§6.5). |
| Hooks during import | Hooks see the import request for every row; hooks that read the body are a documented caveat (§4.1). |
| CLI transport | SDK over HTTP with a token. No direct database access (§9.2). |
| Admin vs core version | The admin requires a matching core. No client-side fallback (§10). |
| Cloud availability | Import and export ship on Cloud, with the integration in §15. |
| Rate limit placement | Route-level bucket after auth, not in the global middleware (§7). |
| Large id lists | `POST /export` with a JSON body; `GET` caps `ids` at 100 (§5.1). |
| Who may import | Optional `import.access` gate, independent of per-row `create` access (§6.1). |
| Who may export | `read` access, plus an optional app-wide `export.access` gate. A dedicated per-collection `access.export` is planned (§12). |
| Indexing during import | Deferred and batched at concurrency 2; failures logged, never row failures (§4.1). |
| Retry safety | Client `runId` plus deterministic ids; no server-side state (§6.9). |
| Overrunning the time budget | Soft budget between rows; in-flight rows are never cancelled (§6.9). |
| Encoding | UTF-8 only on import, BOM on export by default (§5.2, §6.1). |
| Dynamic select options | Resolvers are executed once per request with `{ db, user, req }` (§6.3). |
| AI tools | No AI/MCP tool for import or export in v1. The AI tool set is hand-defined, not derived from routes. |

**Out of scope for this spec**

- **Background jobs.** Chunked requests cover the stated problem. A job runner needs durable upload storage and a worker model that works on serverless; it can be a follow-up if slow hooks or very large media imports make chunking insufficient.
- **Composite `matchOn`.** Composite unique indexes are enforced by §4.5, but matching on them is not offered in v1. It generalises later as "the field set equals a declared unique index" without breaking the single-field API.
- **XLSX.** The format layer is pluggable, so it can be added without changing the endpoints.
- **Localized content.** Core has no per-language content storage today. Revisit export columns and import mapping when `language-translation-architecture.md` lands.
- **Whole-site backup and restore, and importing globals.**
- **Dedicated `access.export` and `access.import` rules per collection.** v1 reuses `read` for export and per-row `create` for import, plus the app-wide gates. A per-collection rule that falls back to `read`/`create` when unset is the intended next step, and the config shape in §8 leaves room for it.
- **Making `upload` consistent with `create`.** Upload skips transactions, workflow and audit. §4.2 preserves that.

## 13. Implementation Plan

Each step is independently shippable and reviewed on its own. Steps 1 to 4 change no externally visible behaviour except where stated.

1. **Extract write pipelines** (§4.1, §4.2): `performCreate`, `applyUpdate`, `shapeReadResponse`, `storeUploadedFile`. No behaviour change. Existing create, update, upload and media-controller tests must pass untouched.
2. **Extract `readPage`** (§4.3) from `find`. No behaviour change. Existing find, depth, search and workflow tests must pass untouched.
3. **Field-keyed errors and uniqueness** (§4.5): `errors` on `DyrectedError`, `app.onError`, shared `assertUniqueness`, `DuplicateKeyError` mapped to the same shape. Visible change: richer `409` bodies. Tests: single and composite constraints, multiple simultaneous violations, update excluding self, hook-derived values, and the concurrent-writer backstop in `adapter-contract-tests` across all four adapters.
4. **Field validation on every write** (§4.4): characterisation test, the validator with unit tests per field type, wiring into create, update, upload, globals and view actions, the `enforce`/`warn`/`off` modes, `validate: false`, the workflow draft rule and the transition check, the `doctor` check, and the changeset and upgrade notes. This is the one breaking step and ships as its own release.
5. **Shared CSV module** in core: RFC 4180 parse and serialise, with tests ported from the admin.
6. **Export endpoint** (`GET` and `POST`) + `ExportService` (sets `billableOperations` and `Cache-Control: private, no-store`): streaming, `readPage`, `ids`, column derivation, formula-injection guard, BOM, `maxRows`. Register both routes in `utils/openapi.ts` and extend `openapi.test.ts`. Acceptance test that the stream reaches the client incrementally through the Next `hono/vercel` handler and the Nuxt module, and document which hosts pass. Tests: row and field access, draft visibility on a workflow collection, trash exclusion, stable paging under concurrent writes, cancellation, no auto-seed, delegated-provider rejection.
7. **Import endpoint** + `ImportService` (sets `billableOperations`): `import.access`, request size cap, encoding and delimiter handling, mapping, coercion table with dynamic option resolvers, `validateDocument`, dry run, `onConflict`/`matchOn`, `matchBy`, chunking, `runId` deterministic ids per `idType`, deferred indexing. Register the route in `utils/openapi.ts`. Tests: per-row access, hook parity with `create`, hook-reads-body caveat, partial failure, `range`/`nextRange`, idempotent re-run, workflow collections, non-transactional adapter error.
8. **Remote media** with the SSRF guard and the resolve-then-reuse-then-fetch order. Tests: private ranges, redirect to private, oversize, wrong MIME, existing `url` reuse.
9. **Bulk rate-limit bucket** as route-level middleware after auth.
10. **SDK** `requestRaw`, `export()`, `import()`, `importAll()`; **CLI** `export` and `import` commands.
11. **Admin migration** to the endpoints across every file listed in §9.3, deleting the client-side loops outright, with the peer-dependency range and the "needs @dyrected/core X" message. It also renders per-field `errors` from the server in the entry form.
12. **Cloud integration** (§15) in `dyrected-pro`: row-based metering from `billableOperations`, `/export` on the CDN cache skip list, API-key documentation, and the Cloud acceptance tests. Import and export are not announced for Cloud until these pass.
13. **Docs** under `apps/docs`, written with the `api-doc-hitl` workflow, including the self-hosted rate-limit and `trustProxy` guidance.

## 14. Testing Strategy

- **Parity test:** for a fixture collection with hooks, defaults, workflow and password fields, assert that importing a valid row and POSTing the same data produce identical documents and identical hook invocations (`operation`, `data`, `user`).
- **Validation parity test:** an invalid row (missing required field, bad option, bad email) fails identically in import and via `POST`, with the same `errors` map. A valid row succeeds in both.
- **Validation scope tests:** `PATCH` of an untouched legacy-invalid document succeeds; explicitly nulling a required field fails; draft save of an incomplete workflow document succeeds and the publish transition fails; trash restore and `seed` bypass validation; `warn` logs and writes; `validate: false` skips.
- **Access matrix:** anonymous, user without create, user with conditional create, admin. Per-row results must match single-create results.
- **Adapter matrix:** run uniqueness, `matchOn` and export paging against all four adapters through `packages/adapter-contract-tests`.
- **Limits:** oversize file, row cap, duration cap producing `nextRange`, remote media over size/time, a slow row overrunning the budget.
- **Retry safety:** replay a chunk with the same `runId` after a simulated lost response and assert no duplicates, once per `idType` and with a custom `idGenerator`.
- **Encoding:** UTF-8 with and without BOM, Windows-1252 rejected, `;` and tab delimiters, quoted newlines.
- **Indexing:** a 500-row chunk issues at most 2 concurrent `indexDocument` calls and no row fails when indexing throws.
- **OpenAPI:** the new routes appear with correct request and response schemas.
- **Regression:** an export of N documents issues exactly 1 HTTP request; an import of N rows issues `ceil(N / maxRowsPerRequest)` requests.

## 15. Dyrected Cloud Integration

Import and export must be available on Cloud. Cloud mounts the whole core app (`cloudApp.route("/", dyrectedApp)` and `cloudApp.route("/sites/:siteId", dyrectedApp)` in `dyrected-pro/apps/cloud/src/boot.ts`), so the new routes are reachable with no allowlist change and with site context already set. Tracing Cloud's enforcement shows what already applies and what needs work.

### 15.1 Already enforced, with no change

| Concern | Mechanism | Effect on import |
| --- | --- | --- |
| Suspended or read-only workspace | `QueryInterceptor.create`/`update` call `checkWorkspaceWritable` | Each row fails with Cloud's message. No document is written |
| Storage quota | `StorageGuard.upload` and the interceptor's `checkStorageLimit` wrap `config.storage` | Server-side image import is quota-checked per file, because it uses `storage.upload` |
| Tenant isolation | `QueryInterceptor.qualifyCollection` scopes every adapter call to the workspace and site | Rows land in the right tenant, including inside transactions (`transaction` re-wraps the interceptor) |
| Delivery cache invalidation | `invalidateCollection` on create and update | Imported documents purge the right cache tags |

### 15.2 Requires changes in `dyrected-pro`

1. **Metering by rows, not by requests.**
   - `enforceApiRateLimit` counts one unit per HTTP request against the plan's `apiRateLimit` (10,000 per day by default).
   - An import chunk writes up to 500 documents in one request, so a plan's request quota would stop meaning anything.
   - Core therefore exposes a billable-operations count. The import and export endpoints set a context variable `billableOperations` (rows created or updated, or rows exported) in `DyrectedContext`.
   - Cloud's middleware reads it after `await next()` and increments the workspace and site counters by `billableOperations - 1` (the request itself is already counted).
   - The pre-check still rejects a request when the counter is already over the limit. A single chunk can overshoot by at most `maxRowsPerRequest`, which is acceptable and documented.
2. **Exempt the export from CDN caching.**
   - Cloud applies Cloudflare cache headers to successful `GET` responses, with a skip list of auth and internal paths.
   - `GET /api/collections/:slug/export` is not on that list, so a private file could be cached at the edge.
   - Add `/export` to the skip list. Core also sets `Cache-Control: private, no-store` on every export response as defence in depth.
3. **API key on `POST /export`.** For `/sites/:siteId/api/*`, Cloud requires `x-api-key` on every `POST`, `PUT`, `PATCH` and `DELETE`. `POST /export` is a read, but it is a `POST`, so it needs the key. The SDK already sends the key when configured, and the docs state it.
4. **Plan gating (optional).** If any plan should not include bulk import, Cloud adds a check on the import route using the existing `getWorkspacePlan` limits. Core's `import.access` gate is the hook for this on self-hosted installs.

### 15.3 Cloud acceptance tests

- An import into a suspended workspace fails every row with the read-only message and writes nothing.
- An import that would exceed storage quota fails the affected image rows and continues.
- A 500-row chunk advances the workspace usage counter by 500, and a request made when the quota is already exhausted returns `429` before any row is processed.
- An export response carries no CDN cache headers and is not cached on a second request.
- Rows land in the correct workspace schema and site, and the delivery cache tags for the collection are purged.

