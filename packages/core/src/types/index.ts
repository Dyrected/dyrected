export type FieldType =
  | 'text'
  | 'textarea'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'email'
  | 'url'
  | 'relationship'
  | 'array'
  | 'object'
  | 'json';

export interface Field {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[] | { label: string; value: string }[]; // For select/multiSelect
  collection?: string; // For relationship
  fields?: Field[]; // For array/object
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
}) => any | Promise<any>;

export type FieldHook = (args: {
  value: any;
  originalDoc?: any;
  data?: any;
  user?: any;
}) => any | Promise<any>;

export interface CollectionConfig {
  slug: string;
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
  };
}

export interface UploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  imageSizes?: {
    name: string;
    width: number;
    height: number;
    crop?: string;
  }[];
}

export interface GlobalConfig {
  slug: string;
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

export interface DatabaseAdapter {
  find(args: { collection: string; where?: any; limit?: number; offset?: number }): Promise<any[]>;
  findOne(args: { collection: string; id: string }): Promise<any>;
  create(args: { collection: string; data: any }): Promise<any>;
  update(args: { collection: string; id: string; data: any }): Promise<any>;
  delete(args: { collection: string; id: string }): Promise<any>;
  
  // Globals
  getGlobal(args: { slug: string }): Promise<any>;
  updateGlobal(args: { slug: string; data: any }): Promise<any>;
}

export interface DyrectedConfig {
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  db: DatabaseAdapter;
  storage?: any; // Will be typed by StorageAdapter
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
}
