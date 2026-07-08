import type { AuthenticatedUser, HookRequestContext } from "./request.js";
import type { AccessFunction } from "./access.js";
import type { DatabaseAdapter, ReadonlyDatabaseAdapter } from "./adapters.js";
import type { AdminIconName } from "./admin.js";

export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "time"
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

export interface DynamicOptionsResolverArgs {
  /** Database adapter available to server-side option resolvers. */
  db?: DatabaseAdapter;
  /** Authenticated user making the request, if any. */
  user?: AuthenticatedUser;
  /** Current HTTP request context, including query parameters. */
  req: HookRequestContext;
}

export type DynamicOptionsResolver = (
  args: DynamicOptionsResolverArgs,
) => Promise<DynamicOptionItem[]> | DynamicOptionItem[];

export interface DynamicOptionsConfig {
  /** Resolver function executed on the server to produce option items. */
  resolve: DynamicOptionsResolver;
  /** Cache duration in seconds for identical resolver calls. */
  cacheTTL?: number;
}

export type DynamicOptionItem = string | { label: string; value: unknown };

export interface Block {
  /** Stable identifier stored in each block row as `blockType`. */
  slug: string;
  /** Human-readable labels shown in the Admin block picker. */
  labels?: {
    /** Singular label, for example `Hero`. */
    singular: string;
    /** Plural label, for example `Heroes`. */
    plural: string;
  };
  /**
   * Lucide icon name shown on the block card and in the block library.
   * Falls back to a generic layout icon when omitted.
   */
  icon?: AdminIconName;
  /** Short one-line summary shown under the block name (block card subtitle). */
  description?: string;
  /**
   * Presentation variants for this block. All variants share the same `fields`;
   * only the rendered layout differs. The chosen variant is stored on each block
   * row under the reserved `variant` key and passed to the render component as a
   * `variant` prop. Switching variant preserves the author's content.
   */
  variants?: BlockVariant[];
  /** Fields that make up this block's payload. */
  fields: Field[];
}

/**
 * A single presentation variant of a {@link Block}. Variants are a layout choice
 * over a shared field set — for example a Hero rendered "centered" vs "split".
 */
export interface BlockVariant {
  /** Stable identifier stored on the block row as `variant`. */
  slug: string;
  /** Human-readable label shown in the variant switcher. Defaults to `slug`. */
  label?: string;
  /** Lucide icon name shown beside the variant label. */
  icon?: AdminIconName;
  /** Short one-line summary of what this variant looks like. */
  description?: string;
}

export interface FieldBase {
  /** Stored key for this field. Omit only for layout-only fields such as `row` or `join`. */
  name?: string;
  /** Human-readable label shown in the Admin UI. */
  label?: string;
  /** Whether the field must have a value when saving. */
  required?: boolean;
  /** Whether values for this field must be unique across the collection. */
  unique?: boolean;
  /** Default value used when a new document omits this field. */
  defaultValue?: unknown;
  /** Static or dynamic option source for supported selection fields. */
  options?: string[] | { label: string; value: unknown }[] | DynamicOptionsResolver | DynamicOptionsConfig;
  /** Target collection slug for `relationship` fields. */
  relationTo?: string;
  /** Whether the field stores multiple values instead of one. */
  hasMany?: boolean;
  /** Child fields for `object` and `array` field types. */
  fields?: Field[];
  /** Allowed block definitions for a `blocks` field. */
  blocks?: Block[];
  /** Target collection slug for `join` fields. */
  collection?: string;
  /** Back-reference field name on the joined collection. */
  on?: string;
  /** Maximum number of joined documents returned by a `join` field. */
  limit?: number;
  /** Field-level read and update access rules. */
  access?: {
    /** Controls whether this field is returned in API responses. */
    read?: AccessFunction | string;
    /** Controls whether incoming writes may change this field. */
    update?: AccessFunction | string;
  };
  /** Admin-only presentation options for this field. */
  admin?: BaseFieldAdmin;
  /** Previous storage key this field falls back to. When the field has no value, its value is read from the old key at read time, then rewritten under the new key on the next save. */
  renameTo?: string;
  /** Whether SQL adapters should promote this field into a first-class column. */
  promoted?: boolean;
}

export interface BaseFieldAdmin {
  /** Placeholder text shown when the input has no value. */
  placeholder?: string;
  /** Custom component key registered in the Admin UI. */
  component?: string;
  /** Help text rendered below the field. */
  description?: string;
  /** Hides the field from the Admin form without deleting stored data. */
  hidden?: boolean;
  /** Excludes the field from Admin list filtering. */
  filterable?: boolean;
  /** Renders the field as non-editable in the Admin UI. */
  readOnly?: boolean;
  /** Hides the field's label in the Admin form (e.g. single-field array rows where the label is redundant). */
  hideLabel?: boolean;
  /** Reactive condition controlling whether the field is visible in the Admin UI. */
  condition?: ((data: Record<string, unknown>, siblingData: Record<string, unknown>) => boolean) | string;
  /** Tab name used when the edit form is rendered as tabs. */
  tab?: string;
  /** CSS width hint used when the field appears inside a `row`. */
  width?: string;
}

export interface FieldBeforeChangeHookArgs<TValue = unknown, TDoc extends object = Record<string, unknown>> {
  /** Current field value after previous hooks in the chain. */
  value: TValue;
  /** Existing stored document before the write, if this is an update. */
  originalDoc?: TDoc;
  /** Full incoming payload being written. */
  data: Record<string, unknown>;
  /** Authenticated user performing the write, if any. */
  user?: AuthenticatedUser;
  /** Read-only database adapter for related lookups. */
  db: ReadonlyDatabaseAdapter;
}

export type FieldBeforeChangeHook<TValue = unknown, TDoc extends object = Record<string, unknown>> = (
  args: FieldBeforeChangeHookArgs<TValue, TDoc>,
) => unknown;

export interface FieldAfterReadHookArgs<TValue = unknown, TDoc extends object = Record<string, unknown>> {
  /** Raw stored field value before this hook transforms it. */
  value: TValue;
  /** Full document currently being returned to the caller. */
  doc: TDoc;
  /** Authenticated user requesting the document, if any. */
  user?: AuthenticatedUser;
  /** Read-only database adapter for related lookups. */
  db: ReadonlyDatabaseAdapter;
}

export type FieldAfterReadHook<TValue = unknown, TDoc extends object = Record<string, unknown>> = (
  args: FieldAfterReadHookArgs<TValue, TDoc>,
) => unknown;

export type FieldHooks<TValue> = {
  hooks?: {
    beforeChange?: Array<FieldBeforeChangeHook<TValue>>;
    afterRead?: Array<FieldAfterReadHook<TValue>>;
  };
};

export interface FieldAdminOnChangeHookArgs<TValue = unknown> {
  /** Current field value in the form state. */
  value: TValue;
  /** Current values for sibling fields at the same nesting level. */
  siblingData: Record<string, unknown>;
  /** Current values for the entire form. */
  data: Record<string, unknown>;
  /** Imperative setter for async or derived updates. */
  setValue: (value: unknown) => void;
}

export type FieldAdminOnChangeHook<TValue = unknown> = (args: FieldAdminOnChangeHookArgs<TValue>) => unknown;

export type FieldAdminHooks<TValue> = {
  admin?: {
    hooks?: {
      onChange?: FieldAdminOnChangeHook<TValue>;
    };
  };
};

export interface FieldAdminOptionsHookArgs {
  /** Current values for sibling fields at the same nesting level. */
  siblingData: Record<string, unknown>;
  /** Current values for the entire form. */
  data: Record<string, unknown>;
}

export type FieldAdminOptionsHookResult = Array<string | { label: string; value: unknown }>;

export type FieldAdminOptionsHook = (
  args: FieldAdminOptionsHookArgs,
) => FieldAdminOptionsHookResult | Promise<FieldAdminOptionsHookResult>;

export type TypedField<TType extends FieldType, TValue, TAdminExtra = Record<never, never>> = Omit<FieldBase, "admin"> & {
  type: TType;
  admin?: BaseFieldAdmin & TAdminExtra;
} & FieldHooks<TValue> &
  FieldAdminHooks<TValue>;

export type BooleanFieldAdmin = {
  /** Boolean presentation style. */
  layout?: "checkbox" | "switch";
};

export type SelectFieldAdmin = {
  /** Select presentation style. */
  layout?: "radio" | "select";
  /** Radio orientation when `layout: 'radio'` is used. */
  direction?: "horizontal" | "vertical";
  hooks?: {
    /** Client-side option recalculation for dependent dropdowns or radios. */
    options?: FieldAdminOptionsHook;
  };
};

export type RadioFieldAdmin = {
  /** Radio group orientation. */
  direction?: "horizontal" | "vertical";
  hooks?: {
    /** Client-side option recalculation for dependent radio groups. */
    options?: FieldAdminOptionsHook;
  };
};

export type MultiSelectFieldAdmin = {
  hooks?: {
    /** Client-side option recalculation for dependent multi-select fields. */
    options?: FieldAdminOptionsHook;
  };
};

export interface CharacterLimitFieldConfig {
  /** Advisory maximum character count exposed to editors and client tooling. */
  maxLength?: number;
}

export interface WordLimitFieldConfig {
  /** Advisory maximum word count exposed to editors and client tooling. */
  maxWords?: number;
}

export type CharacterLimitFieldAdmin = {
  /** Admin-only compatibility alias for `field.maxLength`. Prefer the top-level field property. */
  maxLength?: number;
};

export type WordLimitFieldAdmin = {
  /** Admin-only compatibility alias for `field.maxWords`. Prefer the top-level field property. */
  maxWords?: number;
};

export type TextFieldAdmin = CharacterLimitFieldAdmin & WordLimitFieldAdmin;
export type TextareaFieldAdmin = CharacterLimitFieldAdmin & WordLimitFieldAdmin;
export type EmailFieldAdmin = CharacterLimitFieldAdmin;
export type UrlFieldAdmin = CharacterLimitFieldAdmin;
export type IconFieldAdmin = CharacterLimitFieldAdmin;

/**
 * Editor capabilities available on a `richText` field. Each feature maps to a
 * formatting control in the Admin editor toolbar and to the underlying editor
 * schema, so disabling a feature removes both its toolbar button and the
 * capability itself (including keyboard shortcuts and paste handling).
 */
export type RichTextFeature =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "heading"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "align"
  | "link"
  | "table"
  | "image";

/** Heading levels offered by the `heading` rich-text feature. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface RichTextFieldConfig {
  /**
   * Editor capabilities to enable, in toolbar order. When omitted, every
   * {@link RichTextFeature} is enabled (the default toolbar). Provide a subset
   * to restrict what editors can do — for example `['bold', 'italic', 'link']`
   * for a lightweight inline editor.
   */
  features?: RichTextFeature[];
  /**
   * Heading levels offered when the `heading` feature is enabled.
   * Defaults to `[1, 2, 3]`.
   */
  headingLevels?: HeadingLevel[];
  /**
   * Upload collection slug used by the `image` feature's media picker.
   * Defaults to the first collection configured with `upload: true`.
   */
  uploadCollection?: string;
}

export type TextField = TypedField<"text", string, TextFieldAdmin> & CharacterLimitFieldConfig & WordLimitFieldConfig;
export type TextareaField = TypedField<"textarea", string, TextareaFieldAdmin> &
  CharacterLimitFieldConfig &
  WordLimitFieldConfig;
export type EmailField = TypedField<"email", string, EmailFieldAdmin> & CharacterLimitFieldConfig;
export type UrlField = TypedField<"url", string, UrlFieldAdmin> & CharacterLimitFieldConfig;
export type IconField = TypedField<"icon", string, IconFieldAdmin> & CharacterLimitFieldConfig;
export type DateField = TypedField<"date", string>;
export type DateTimeField = TypedField<"datetime", string>;
export type TimeField = TypedField<"time", string>;
export type SelectField = TypedField<"select", string, SelectFieldAdmin>;
export type RadioField = TypedField<"radio", string, RadioFieldAdmin>;
export type NumberField = TypedField<"number", number>;
export type BooleanField = TypedField<"boolean", boolean, BooleanFieldAdmin>;
export type MultiSelectField = TypedField<"multiSelect", string[], MultiSelectFieldAdmin>;
export type RelationshipField = TypedField<"relationship", string | string[]>;
export type ImageField = TypedField<"image", string | string[]>;
export type RichTextField = TypedField<"richText", Record<string, unknown>> & RichTextFieldConfig;
export type JsonField = TypedField<"json", Record<string, unknown>>;
export type ObjectField = TypedField<"object", unknown>;
export type ArrayField = TypedField<"array", unknown>;
export type BlocksField = TypedField<"blocks", unknown>;
export type JoinField = TypedField<"join", unknown>;
export type RowField = TypedField<"row", unknown>;

export type Field =
  | TextField
  | TextareaField
  | EmailField
  | UrlField
  | IconField
  | DateField
  | DateTimeField
  | TimeField
  | SelectField
  | RadioField
  | NumberField
  | BooleanField
  | MultiSelectField
  | RelationshipField
  | ImageField
  | RichTextField
  | JsonField
  | ObjectField
  | ArrayField
  | BlocksField
  | JoinField
  | RowField;

export interface UploadConfig {
  /** Allowed MIME types for uploaded files. */
  allowedMimeTypes?: string[];
  /** Maximum upload size in bytes. */
  maxFileSize?: number;
  /** Local filesystem destination used by disk-based storage adapters. */
  staticDir?: string;
  /** Public URL prefix for disk-based uploads. */
  staticURL?: string;
  /** Generated image size name used as the Admin media thumbnail. */
  adminThumbnail?: string;
  imageSizes?: {
    /** Stable name used to reference this generated size. */
    name: string;
    /** Target width in pixels. */
    width?: number;
    /** Target height in pixels. */
    height?: number;
    /** Crop strategy forwarded to the image processor. */
    crop?: string;
    /** Resize fit strategy forwarded to the image processor. */
    fit?: string;
    /** Prevents upscaling smaller source images. */
    withoutEnlargement?: boolean;
    /** Format-specific options forwarded to the image processor. */
    formatOptions?: Record<string, unknown>;
  }[];
}
