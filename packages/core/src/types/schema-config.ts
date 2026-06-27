import type { AdminIconName, CollectionListComponentSlots } from "./admin.js";
import type { AccessFunction } from "./access.js";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeReadHook,
  GlobalAfterChangeHook,
  GlobalAfterReadHook,
  GlobalBeforeChangeHook,
  GlobalBeforeReadHook,
} from "./hooks.js";
import type { Field, UploadConfig } from "./schema-core.js";
import type { WorkflowConfig } from "./workflows.js";

/**
 * Defines a Dyrected collection — a named set of documents with a shared schema.
 *
 * Pass your document's TypeScript type as the generic parameter `TDoc` to get
 * fully typed hooks and access functions.
 */
export interface CollectionConfig<TDoc extends object = Record<string, unknown>> {
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
  initialData?: Partial<TDoc>[];
  audit?: boolean;
  workflow?: WorkflowConfig<TDoc>;
  access?: {
    read?: AccessFunction<TDoc> | string;
    create?: AccessFunction<TDoc> | string;
    update?: AccessFunction<TDoc> | string;
    delete?: AccessFunction<TDoc> | string;
  };
  hooks?: {
    beforeRead?: CollectionBeforeReadHook[];
    afterRead?: CollectionAfterReadHook<TDoc>[];
    beforeChange?: CollectionBeforeChangeHook<TDoc>[];
    afterChange?: CollectionAfterChangeHook<TDoc>[];
    beforeDelete?: CollectionBeforeDeleteHook<TDoc>[];
    afterDelete?: CollectionAfterDeleteHook<TDoc>[];
  };
  admin?: {
    icon?: AdminIconName;
    components?: CollectionListComponentSlots;
    useAsTitle?: string;
    defaultColumns?: string[];
    group?: string;
    hidden?: boolean;
    filterable?: boolean;
    previewUrl?: string | ((doc: TDoc, opts: { locale?: string }) => string | null);
    previewMode?: "postMessage" | "token";
    urlPattern?: string;
  };
}

/**
 * Defines a Dyrected global — a singleton document without pagination or IDs.
 */
export interface GlobalConfig<TDoc extends object = Record<string, unknown>> {
  slug: string;
  siteId?: string;
  shared?: boolean;
  label?: string;
  fields: Field[];
  access?: {
    read?: AccessFunction<TDoc>;
    update?: AccessFunction<TDoc>;
  };
  hooks?: {
    beforeRead?: GlobalBeforeReadHook[];
    afterRead?: GlobalAfterReadHook<TDoc>[];
    beforeChange?: GlobalBeforeChangeHook<TDoc>[];
    afterChange?: GlobalAfterChangeHook<TDoc>[];
  };
  admin?: {
    icon?: AdminIconName;
    group?: string;
    hidden?: boolean;
  };
  initialData?: Partial<TDoc>;
}
