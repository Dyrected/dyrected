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
  | "url";

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
  hasMany?: boolean; // For relationship/multiSelect
  fields?: Field[]; // For array/object
  blocks?: Block[]; // For blocks
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
    condition?: (data: any) => boolean;
  };
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
  type?: "upload" | "external";
  provider?: string;
  provider_metadata?: any;
  [key: string]: any;
}

export interface StorageAdapter {
  upload(args: { filename: string; buffer: Buffer; mimeType: string; prefix?: string }): Promise<FileData>;
  delete(args: { filename: string }): Promise<void>;
  getURL(args: { filename: string }): string;
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
  };
  meta?: {
    /** Appended to every Admin page title. Default: '- Dyrected' */
    titleSuffix?: string;
  };
}

export interface DyrectedConfig {
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  db?: DatabaseAdapter;
  storage?: StorageAdapter;
  /** Admin UI branding and meta configuration. */
  admin?: AdminConfig;
  email?: {
    provider: string;
    apiKey?: string;
    from: string;
  };
  redis?: {
    url: string;
  };
  cors?: {
    origins: string[];
  };
  onSchemaFetch?: (siteId: string) => Promise<{ collections?: CollectionConfig[]; globals?: GlobalConfig[] }>;
}
