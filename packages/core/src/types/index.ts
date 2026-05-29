export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiSelect"
  | "radio"
  | "relationship"
  | "array"
  | "object"
  | "json"
  | "blocks"
  | "image"
  | "email"
  | "url"
  | "icon"
  | "join"
  | "row";

export type DynamicOptionItem = string | { label: string; value: any };

/**
 * Context passed to a dynamic options resolver at request time.
 * All properties are optional so external-API resolvers that need none of
 * them (`async () => fetch(...)`) still compile without errors.
 */
export interface DynamicOptionsResolverArgs {
  /** The configured database adapter — available for resolvers that query internal collections. */
  db?: DatabaseAdapter;
  /** The currently authenticated user (or undefined for unauthenticated requests). */
  user?: any;
  /**
   * The HTTP request context.  Sibling field values selected in the Admin UI
   * are forwarded as query parameters and are accessible via `req.query`.
   *
   * @example
   * // Cascading dropdown: ?country=ca forwarded by the Admin UI
   * options: async ({ req }) => {
   *   const country = req.query.country ?? 'us';
   *   ...
   * }
   */
  req?: {
    query: Record<string, string>;
    headers: Record<string, string>;
    raw?: Request;
  };
}

export type DynamicOptionsResolver = (
  args: DynamicOptionsResolverArgs,
) => Promise<DynamicOptionItem[]> | DynamicOptionItem[];

export interface DynamicOptionsConfig {
  resolve: DynamicOptionsResolver;
  cacheTTL?: number;
}

export interface Block {
  slug: string;
  labels?: {
    singular: string;
    plural: string;
  };
  fields: Field[];
}

export interface Field {
  name?: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  /**
   * Defines the available choices for `select` and `multiSelect` fields.
   *
   * **Three ways to provide options — pick the one that fits your data source:**
   *
   * ---
   *
   * ### 1. Static array (simplest)
   * Use when the list is fixed and known at build time.
   * ```ts
   * options: [
   *   { label: 'Draft', value: 'draft' },
   *   { label: 'Published', value: 'published' },
   * ]
   * ```
   *
   * ---
   *
   * ### 2. Async server-side resolver (for DB queries or secret API keys)
   * The function runs **on the server** inside your Node.js process — never in the browser.
   * Use this when your options require:
   * - Querying your own database
   * - Calling a third-party API that needs a secret key
   * - Filtering options based on the authenticated user
   *
   * The Admin UI fetches results from `GET /api/dyrected/options/:collection/:field`.
   * Sibling field values are forwarded as query parameters (e.g. `?country=us`)
   * and are accessible via `req.query`.
   *
   * ```ts
   * // ✅ Fetching records from your own database
   * options: async ({ db, user }) => {
   *   const categories = await db.find({ collection: 'categories' })
   *   return categories.docs.map(c => ({ label: c.name, value: c.id }))
   * }
   *
   * // ✅ Calling a third-party API with a secret key (never exposed to the browser)
   * options: async () => {
   *   const res = await fetch('https://api.stripe.com/v1/products', {
   *     headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
   *   })
   *   const { data } = await res.json()
   *   return data.map((p: any) => ({ label: p.name, value: p.id }))
   * }
   *
   * // ✅ Cascading dropdown driven by a sibling field — server-side version
   * // The Admin UI appends sibling values as query params: ?country=us
   * options: async ({ req }) => {
   *   const country = req?.query.country
   *   if (!country) return []
   *   const regions = await db.find({ collection: 'regions', where: { country: { equals: country } } })
   *   return regions.docs.map(r => ({ label: r.name, value: r.code }))
   * }
   *
   * // ✅ With caching — avoid hammering an external API on every Admin UI open
   * options: {
   *   resolve: async () => { ... },
   *   cacheTTL: 300, // cache for 5 minutes
   * }
   * ```
   *
   * ---
   *
   * ### 3. Client-side cascading via `admin.hooks.options`
   * For **instant, zero-latency** dependent dropdowns where the option list is
   * already known and just needs to be filtered by a sibling field.
   * See `admin.hooks.options` below.
   */
  options?: string[] | { label: string; value: any }[] | DynamicOptionsResolver | DynamicOptionsConfig;
  relationTo?: string; // For relationship
  hasMany?: boolean; // For relationship/multiSelect/image
  fields?: Field[]; // For array/object
  blocks?: Block[]; // For blocks
  collection?: string; // For join fields - the target collection slug
  on?: string; // For join fields - the field in the target collection that references this one
  access?: {
    read?: AccessFunction | string;
    update?: AccessFunction | string;
  };
  hooks?: {
    beforeChange?: FieldHook[];
    afterRead?: FieldHook[];
  };
  admin?: {
    placeholder?: string;
    description?: string;
    hidden?: boolean;
    readOnly?: boolean;
    condition?: ((data: any, siblingData: any) => boolean) | string;
    layout?: "radio" | "select" | string;
    direction?: "horizontal" | "vertical";
    tab?: string;
    width?: string;
    hooks?: {
      /**
       * Runs **client-side** in the browser whenever any sibling field value changes.
       * Use this to **derive a field's value** from other fields in real time.
       *
       * Return a new value to update this field. Return `undefined` to leave it unchanged.
       *
       * ⚠️ Do NOT return an options array here — use `admin.hooks.options` for that.
       *
       * @example
       * // Auto-generate a URL slug from the title field
       * onChange: ({ siblingData }) =>
       *   (siblingData.title ?? '')
       *     .toLowerCase()
       *     .replace(/[^a-z0-9]+/g, '-')
       *     .replace(/(^-|-$)/g, '')
       *
       * @example
       * // Calculate a derived numeric value
       * onChange: ({ siblingData }) => {
       *   const price = Number(siblingData.price) || 0
       *   const tax   = Number(siblingData.taxRate) || 0
       *   return price + price * (tax / 100)
       * }
       */
      onChange?: (args: { value: any; siblingData: any; data: any; setValue: (value: any) => void }) => any;
      /**
       * For `select` and `multiSelect` fields only.
       *
       * Runs **client-side** in the browser whenever any sibling field value changes.
       * Use this to **compute the available choices** for this field based on what
       * the user has selected in another field (cascading / dependent dropdowns).
       *
       * This hook runs entirely in the browser — **no network request, instant reactivity**.
       * When the returned list changes, the field's current value is automatically cleared
       * if it is no longer a valid choice.
       *
       * Use `options: async ({ db, req })` (the top-level field property) instead when:
       * - Your option list comes from a database query or a secret third-party API key
       * - You need server-side caching (`cacheTTL`)
       *
       * @example
       * // Country → State/Province cascading dropdown
       * options: ({ siblingData }) => {
       *   if (siblingData.country === 'us') {
       *     return [
       *       { label: 'California', value: 'CA' },
       *       { label: 'New York',   value: 'NY' },
       *     ]
       *   }
       *   if (siblingData.country === 'ca') {
       *     return [
       *       { label: 'Ontario',          value: 'ON' },
       *       { label: 'British Columbia', value: 'BC' },
       *     ]
       *   }
       *   return []
       * }
       *
       * @example
       * // Show different sub-types depending on a parent category field
       * options: ({ siblingData }) =>
       *   siblingData.category === 'vehicle'
       *     ? [{ label: 'Car', value: 'car' }, { label: 'Truck', value: 'truck' }]
       *     : [{ label: 'Shirt', value: 'shirt' }, { label: 'Shoes', value: 'shoes' }]
       */
      options?: (args: {
        siblingData: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Array<string | { label: string; value: any }> | Promise<Array<string | { label: string; value: any }>>;
    };
  };
  /** For database migrations: if set, data from this key will be migrated to the current field name. */
  renameTo?: string;
  /** For database migrations: if true, this field will be extracted to a real SQL column for performance. */
  promoted?: boolean;
}

export type AccessFunction = (args: {
  user: any;
  doc?: any;
  data?: any;
  req: any;
}) => boolean | object | Promise<boolean | object>;

export type HookFunction = (args: {
  data?: any;
  doc?: any;
  user?: any;
  req?: any;
  /** The operation that triggered this hook. */
  operation?: "create" | "update" | "delete";
}) => any | Promise<any>;

export type FieldHook<T = any, V = any> = (args: {
  value: V;
  originalDoc?: T;
  data?: T;
  doc?: T;
  user?: any;
}) => T | Promise<T>;

export interface CollectionConfig {
  slug: string;
  siteId?: string;
  shared?: boolean;
  labels?: {
    singular: string;
    plural: string;
  };
  auth?: boolean;
  upload?: boolean | UploadConfig;
  fields: Field[];
  timestamps?: boolean;
  /** Initial data to seed this collection with on first fetch if it is empty. */
  initialData?: any[];
  /** Enable full activity logging to the __audit collection for this collection. */
  audit?: boolean;
  access?: {
    read?: AccessFunction | string;
    create?: AccessFunction | string;
    update?: AccessFunction | string;
    delete?: AccessFunction | string;
  };
  hooks?: {
    beforeRead?: HookFunction[];
    afterRead?: HookFunction[];
    beforeChange?: HookFunction[];
    afterChange?: HookFunction[];
    beforeDelete?: HookFunction[];
    afterDelete?: HookFunction[];
  };
  admin?: {
    useAsTitle?: string;
    defaultColumns?: string[];
    group?: string;
    hidden?: boolean;
    /**
     * URL to open in the Live Preview pane.
     * Accepts a static string or a function that receives the document and returns a URL.
     */
    previewUrl?: string | ((doc: any, opts: { locale?: string }) => string | null);
    /** Which mode to use for live preview. Defaults to 'postMessage'. */
    previewMode?: "postMessage" | "token";
    /**
     * Frontend URL pattern for this collection, used by URL fields to resolve internal links.
     * Use {fieldName} placeholders, e.g. "/{slug}" or "/blog/{slug}".
     */
    urlPattern?: string;
  };
}

export interface UploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  /** Local disk path where files are stored. Only used by LocalStorage adapter. */
  staticDir?: string;
  /** Public URL prefix for locally stored files. Only used by LocalStorage adapter. */
  staticURL?: string;
  /** Which imageSizes entry to use as the thumbnail in the Admin media grid. */
  adminThumbnail?: string;
  imageSizes?: {
    name: string;
    width?: number;
    height?: number;
    crop?: string;
    /** sharp fit strategy: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' */
    fit?: string;
    /** Never upscale images smaller than the target size. Default: true. */
    withoutEnlargement?: boolean;
    /** Additional sharp format options. */
    formatOptions?: Record<string, any>;
  }[];
}

export interface GlobalConfig {
  slug: string;
  siteId?: string;
  shared?: boolean;
  label?: string;
  fields: Field[];
  access?: {
    read?: AccessFunction;
    update?: AccessFunction;
  };
  hooks?: {
    beforeRead?: HookFunction[];
    afterRead?: HookFunction[];
    beforeChange?: HookFunction[];
    afterChange?: HookFunction[];
  };
  admin?: {
    group?: string;
    hidden?: boolean;
  };
  /** Initial data to seed this global with on first fetch if it is empty. */
  initialData?: any;
}

export interface PaginatedResult<T = any> {
  docs: T[];
  total: number;
  limit: number;
  page: number;
  /** Total number of pages given the current limit. */
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DatabaseAdapter {
  find(args: {
    collection: string;
    where?: any;
    limit?: number;
    page?: number;
    sort?: string;
  }): Promise<PaginatedResult>;
  findOne(args: { collection: string; id: string }): Promise<any>;
  create(args: { collection: string; data: any }): Promise<any>;
  update(args: { collection: string; id: string; data: any }): Promise<any>;
  delete(args: { collection: string; id: string }): Promise<any>;

  // Globals
  getGlobal(args: { slug: string }): Promise<any>;
  updateGlobal(args: { slug: string; data: any }): Promise<any>;

  /**
   * Sync the database schema with the provided collections and globals.
   * Useful for creating tables on startup.
   */
  sync?(collections: CollectionConfig[], globals: GlobalConfig[]): Promise<void>;

  /**
   * Low-level raw query execution.
   * Optional as not all adapters may support raw SQL/commands.
   */
  execute?(query: string, params?: any[]): Promise<any>;
}

export interface FileData {
  filename: string;
  filesize?: number;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  blurhash?: string;
  type?: "upload" | "external";
  provider?: string;
  provider_metadata?: any;
  [key: string]: any;
}

export interface StorageAdapter {
  upload(args: { filename: string; buffer: Uint8Array; mimeType: string; prefix?: string }): Promise<FileData>;
  delete(args: { filename: string }): Promise<void>;
  getURL(args: { filename: string }): string;
  /** Retrieve file content for serving via API */
  resolve?(args: { filename: string }): Promise<{ buffer: Uint8Array; mimeType: string } | null>;
}

/** Branding and metadata configuration for the Admin UI. */
export interface AdminConfig {
  branding?: {
    /** URL or imported image for the full logo shown in the sidebar. */
    logo?: string;
    /** URL or imported image for the compact logo mark used in collapsed sidebar. */
    logoMark?: string;
    /** Primary accent colour as a CSS value (e.g. '#6366f1' or 'hsl(240 50% 60%)') */
    primaryColor?: string;
    /** URL for the browser tab favicon. */
    favicon?: string;
    /** Default font family for body and UI elements (sans-serif). */
    fontSans?: string;
    /** Default font family for headings and display elements (serif). */
    fontSerif?: string;
  };
  meta?: {
    /** Appended to every Admin page title. Default: '- Dyrected' */
    titleSuffix?: string;
  };
}

export interface ImageService {
  process(args: {
    buffer: Uint8Array;
    mimeType: string;
    config?: CollectionConfig["upload"];
    focalPoint?: { x: number; y: number };
  }): Promise<{
    metadata: {
      width?: number;
      height?: number;
      blurhash?: string;
    };
    sizes?: Record<string, { buffer: Uint8Array; width: number; height: number; filename: string }>;
  }>;
}

export interface DyrectedConfig {
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  db?: DatabaseAdapter;
  storage?: StorageAdapter;
  image?: ImageService;
  /** Admin UI branding and meta configuration. */
  admin?: AdminConfig;
  email?: {
    from: string;
    send: (args: { to: string; subject: string; html: string }) => Promise<void>;
    templates?: {
      welcome?: (args: { email: string }) => { subject?: string; html: string };
      invite?: (args: { token: string; invitedByEmail?: string }) => { subject?: string; html: string };
      resetPassword?: (args: { token: string }) => { subject?: string; html: string };
      passwordChanged?: (args: { email: string }) => { subject?: string; html: string };
    };
  };
  redis?: {
    url: string;
  };
  cors?: {
    origins: string[];
  };
  onSchemaFetch?: (siteId: string) => Promise<{ collections?: CollectionConfig[]; globals?: GlobalConfig[] }>;
}
