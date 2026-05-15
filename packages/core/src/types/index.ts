export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiSelect"
  | "relationship"
  | "array"
  | "object"
  | "json"
  | "blocks"
  | "image"
  | "email"
  | "url"
  | "icon"
  | "join";

export interface Block {
  slug: string;
  labels?: {
    singular: string;
    plural: string;
  };
  fields: Field[];
}

export interface Field {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[] | { label: string; value: string }[]; // For select/multiSelect
  relationTo?: string; // For relationship
  hasMany?: boolean; // For relationship/multiSelect/image
  fields?: Field[]; // For array/object
  blocks?: Block[]; // For blocks
  collection?: string; // For join fields - the target collection slug
  on?: string; // For join fields - the field in the target collection that references this one
  access?: {
    read?: AccessFunction;
    update?: AccessFunction;
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
  operation?: 'create' | 'update' | 'delete';
}) => any | Promise<any>;

export type FieldHook = (args: { value: any; originalDoc?: any; data?: any; user?: any }) => any | Promise<any>;

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
    read?: AccessFunction;
    create?: AccessFunction;
    update?: AccessFunction;
    delete?: AccessFunction;
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
    previewMode?: 'postMessage' | 'token';
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
    config?: CollectionConfig['upload'];
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
