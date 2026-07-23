import type { AuthenticatedUser, HookRequestContext } from "./request.js";
import type { AccessRule } from "./access.js";
import type { DatabaseAdapter, ReadonlyDatabaseAdapter } from "./adapters.js";
import type { AdminIconName } from "./admin.js";
import type { DeclarativeHookExpression } from "./hooks.js";

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
  options?:
    | string[]
    | { label: string; value: unknown }[]
    | DynamicOptionsResolver
    | DynamicOptionsConfig;
  /** Target collection slug for `relationship` fields. */
  relationTo?: string;
  /** Whether the field stores multiple values instead of one. */
  hasMany?: boolean;
  /** Child fields for `object` and `array` field types. */
  fields?: Field[];
  /** Allowed block definitions for a `blocks` field. */
  blocks?: Block[];
  /**
   * Shared block slugs pulled from the root `defineConfig({ blocks: [...] })`
   * registry for a `blocks` field.
   *
   * Use this when the same block types should be reused across multiple fields
   * without inlining the full block schema into each field definition.
   */
  blockReferences?: string[];
  /** Target collection slug for `join` fields. */
  collection?: string;
  /** Back-reference field name on the joined collection. */
  on?: string;
  /** Maximum number of joined documents returned by a `join` field. */
  limit?: number;
  /** Field-level read, create, and update access rules. Supports functions, Jexl strings, booleans, and named policies. */
  access?: {
    /** Controls whether this field is returned in API responses. */
    read?: AccessRule;
    /** Controls whether this field may be set when creating a document. Falls back to `update` when omitted. */
    create?: AccessRule;
    /** Controls whether incoming writes may change this field on update. */
    update?: AccessRule;
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
  /** For nested object-like fields, choose which child field should summarize the value in admin surfaces. */
  useAsTitle?: string;
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
  condition?:
    | ((
        data: Record<string, unknown>,
        siblingData: Record<string, unknown>,
      ) => boolean)
    | string;
  /** Tab name used when the edit form is rendered as tabs. */
  tab?: string;
  /** CSS width hint used when the field appears inside a `row`. */
  width?: string;
}

export interface FieldBeforeChangeHookArgs<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> {
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

export type FieldBeforeChangeHook<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> = (args: FieldBeforeChangeHookArgs<TValue, TDoc>) => unknown;

export interface FieldAfterReadHookArgs<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> {
  /** Raw stored field value before this hook transforms it. */
  value: TValue;
  /** Full document currently being returned to the caller. */
  doc: TDoc;
  /** Authenticated user requesting the document, if any. */
  user?: AuthenticatedUser;
  /** Read-only database adapter for related lookups. */
  db: ReadonlyDatabaseAdapter;
}

export type FieldAfterReadHook<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> = (args: FieldAfterReadHookArgs<TValue, TDoc>) => unknown;

export type FieldHooks<TValue> = {
  hooks?: {
    beforeChange?: Array<FieldBeforeChangeHook<TValue> | DeclarativeHookExpression>;
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

export type FieldAdminOnChangeHook<TValue = unknown> = (
  args: FieldAdminOnChangeHookArgs<TValue>,
) => unknown;

export type FieldAdminHooks<TValue> = {
  admin?: {
    hooks?: {
      onChange?: FieldAdminOnChangeHook<TValue> | DeclarativeHookExpression;
    };
  };
};

export interface FieldAdminOptionsHookArgs {
  /** Current values for sibling fields at the same nesting level. */
  siblingData: Record<string, unknown>;
  /** Current values for the entire form. */
  data: Record<string, unknown>;
}

export type FieldAdminOptionsHookResult = Array<
  string | { label: string; value: unknown }
>;

export type FieldAdminOptionsHook = (
  args: FieldAdminOptionsHookArgs,
) => FieldAdminOptionsHookResult | Promise<FieldAdminOptionsHookResult>;

export type TypedField<
  TType extends FieldType,
  TValue,
  TAdminExtra = Record<never, never>,
> = Omit<FieldBase, "admin"> & {
  type: TType;
  admin?: BaseFieldAdmin & TAdminExtra;
} & FieldHooks<TValue> &
  FieldAdminHooks<TValue>;

/**
 * A semantic color for a badge or status pill in the Admin UI. The Admin panel
 * maps each tone to a themed color, so you pick meaning (`success`, `danger`)
 * rather than a raw color and it stays consistent in light and dark mode.
 */
export type DisplayTone =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info";

/**
 * How a `select`, `radio`, or `multiSelect` value is presented in read-only
 * Admin surfaces (list cells). Renders the chosen option as a colored badge —
 * ideal for statuses like `draft`/`published`. Display only and
 * JSON-serializable so it round-trips through Dyrected Cloud.
 *
 * Pass the shorthand `"badge"` for neutral badges, or an object to color and
 * relabel each value.
 */
export type OptionFormat =
  /** Shorthand for `{ type: "badge" }` — every value renders as a neutral badge. */
  | "badge"
  | {
      type: "badge";
      /** Maps an option value to a color tone. Values not listed use `defaultTone`. */
      tones?: Record<string, DisplayTone>;
      /** Overrides the displayed text per option value. Falls back to the option's label. */
      labels?: Record<string, string>;
      /** Tone for values missing from `tones`. Defaults to `"neutral"`. */
      defaultTone?: DisplayTone;
    };

/**
 * How a `boolean` value is presented in read-only Admin surfaces. Replaces the
 * default `Yes`/`No` badge with your own labels and tones — for example
 * `Active`/`Inactive` or `In stock`/`Sold out`. Display only.
 */
export type BooleanFormat = {
  type: "boolean";
  /** Presentation for a `true` value. */
  true?: { label?: string; tone?: DisplayTone };
  /** Presentation for a `false` value. */
  false?: { label?: string; tone?: DisplayTone };
};

/**
 * How a `text` or `textarea` value is presented in read-only Admin surfaces.
 * Display only — the stored string is unchanged. Pass a shorthand string for the
 * simple transforms, or an object for `truncate` and `mask`.
 */
export type TextFormat =
  /** Shorthand for the matching object form. */
  | "uppercase"
  | "lowercase"
  | "capitalize"
  | "code"
  /** Change the letter case for display. */
  | { type: "uppercase" | "lowercase" | "capitalize" }
  /** Render in a monospace pill — good for IDs, SKUs, and short codes. */
  | { type: "code" }
  /** Cut the text to `length` characters with a trailing ellipsis. */
  | { type: "truncate"; length: number }
  /**
   * Hide all but the last few characters — for tokens, keys, or reference
   * numbers you don't want fully visible in a list.
   */
  | {
      type: "mask";
      /** How many trailing characters stay visible. Defaults to `4`. */
      reveal?: number;
      /** Character used for the hidden portion. Defaults to `"•"`. */
      character?: string;
    };

/**
 * How a `url` or `email` value is presented in read-only Admin surfaces.
 * Renders the value as a clickable link (a `mailto:` link for `email`) instead
 * of plain text. Display only.
 */
export type LinkFormat =
  /** Shorthand for `{ type: "link" }`. */
  | "link"
  | {
      type: "link";
      /** Open the link in a new tab. Defaults to `true`. */
      newTab?: boolean;
    };

/**
 * How a `json` value is presented in read-only Admin surfaces. Display only.
 */
export type JsonFormat =
  /** Shorthand for the matching object form. */
  | "summary"
  | "code"
  /** A compact key count, e.g. `{ 3 keys }`. */
  | { type: "summary" }
  /** A truncated inline monospace preview of the raw JSON. */
  | { type: "code" };

export type BooleanFieldAdmin = {
  /** Boolean presentation style. */
  layout?: "checkbox" | "switch";
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: BooleanFormat;
};

export type SelectFieldAdmin = {
  /** Select presentation style. */
  layout?: "radio" | "select";
  /** Radio orientation when `layout: 'radio'` is used. */
  direction?: "horizontal" | "vertical";
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: OptionFormat;
  hooks?: {
    /** Client-side option recalculation for dependent dropdowns or radios. */
    options?: FieldAdminOptionsHook;
  };
};

export type RadioFieldAdmin = {
  /** Radio group orientation. */
  direction?: "horizontal" | "vertical";
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: OptionFormat;
  hooks?: {
    /** Client-side option recalculation for dependent radio groups. */
    options?: FieldAdminOptionsHook;
  };
};

export type MultiSelectFieldAdmin = {
  /** How each selected value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: OptionFormat;
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

export interface NumberLimitFieldConfig {
  /** Advisory minimum numeric value exposed to editors and client tooling. */
  min?: number;
  /** Advisory maximum numeric value exposed to editors and client tooling. */
  max?: number;
}

export type CharacterLimitFieldAdmin = {
  /** Admin-only compatibility alias for `field.maxLength`. Prefer the top-level field property. */
  maxLength?: number;
};

export type WordLimitFieldAdmin = {
  /** Admin-only compatibility alias for `field.maxWords`. Prefer the top-level field property. */
  maxWords?: number;
};

export type NumberLimitFieldAdmin = {
  /** Admin-only compatibility alias for `field.min`. Prefer the top-level field property. */
  min?: number;
  /** Admin-only compatibility alias for `field.max`. Prefer the top-level field property. */
  max?: number;
};

/**
 * How a `number` field's value is presented in read-only Admin surfaces (list
 * cells and read-only inputs). Display only — the stored value is unchanged, and
 * editing still uses a plain numeric input. Every option is JSON-serializable so
 * it round-trips through Dyrected Cloud.
 *
 * Pass a shorthand string for defaults (`format: "currency"`) or an object to
 * configure it (`format: { type: "currency", currency: "NGN" }`).
 */
export type NumberFormat =
  /** Shorthand for the matching object form, using that format's defaults. */
  | "decimal"
  | "currency"
  | "percent"
  | "compact"
  | "bytes"
  | "rating"
  /** Grouped number, e.g. `1234.5` → `1,234.5`. */
  | {
      type: "decimal";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  /** Currency amount, e.g. `1234.5` → `$1,234.50`. */
  | {
      type: "currency";
      /** ISO 4217 currency code, e.g. `"USD"`, `"NGN"`, `"EUR"`. Defaults to `"USD"`. */
      currency?: string;
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  /**
   * Percentage. By default the stored value is a ratio, so `0.5` → `50%`. Set
   * `scale: false` when the stored value is already a percentage, so `50` → `50%`.
   */
  | {
      type: "percent";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
      /** `false` when the stored number is already scaled to 0–100. Defaults to `true`. */
      scale?: boolean;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  /** A measurement unit, e.g. `5` → `5 km` with `unit: "kilometer"`. */
  | {
      type: "unit";
      /** A [sanctioned Intl unit](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#sec-issanctionedsimpleunitidentifier), e.g. `"kilometer"`, `"liter"`, `"celsius"`. */
      unit: string;
      unitDisplay?: "short" | "long" | "narrow";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
      maximumFractionDigits?: number;
    }
  /** Abbreviated large numbers, e.g. `1200` → `1.2K`. */
  | {
      type: "compact";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
      maximumFractionDigits?: number;
    }
  /** A byte count rendered with units, e.g. `1536` → `1.5 KB`. */
  | {
      type: "bytes";
      /** Use 1024-based units (`KiB`, `MiB`) instead of 1000-based (`KB`, `MB`). Defaults to `false`. */
      binary?: boolean;
      maximumFractionDigits?: number;
    }
  /** A star rating, e.g. `4` → `★★★★☆` with `max: 5`. */
  | {
      type: "rating";
      /** Total number of stars. Defaults to `5`. */
      max?: number;
    };

/**
 * How a `date`, `datetime`, or `time` field's value is presented in read-only
 * Admin surfaces. Display only and JSON-serializable so it round-trips through
 * Dyrected Cloud.
 *
 * Pass a shorthand string (`format: "relative"`) or an object for finer control
 * (`format: { type: "date", dateStyle: "long" }`).
 */
export type DateFormat =
  /** Shorthand for the matching object form, using that format's defaults. */
  | "date"
  | "datetime"
  | "time"
  | "relative"
  /** Calendar date, e.g. `Jan 5, 2026`. */
  | {
      type: "date";
      dateStyle?: "short" | "medium" | "long" | "full";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
    }
  /** Date and time together, e.g. `Jan 5, 2026, 2:30 PM`. */
  | {
      type: "datetime";
      dateStyle?: "short" | "medium" | "long" | "full";
      timeStyle?: "short" | "medium" | "long" | "full";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
    }
  /** Time of day, e.g. `2:30 PM`. */
  | {
      type: "time";
      timeStyle?: "short" | "medium" | "long" | "full";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
    }
  /** Relative to now, e.g. `3 days ago`, `in 2 hours`. */
  | {
      type: "relative";
      /** BCP 47 locale tag. Defaults to the viewer's browser locale. */
      locale?: string;
    };

export type TextFieldAdmin = CharacterLimitFieldAdmin &
  WordLimitFieldAdmin & {
    /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
    format?: TextFormat;
  };
export type TextareaFieldAdmin = CharacterLimitFieldAdmin &
  WordLimitFieldAdmin & {
    /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
    format?: TextFormat;
  };
export type EmailFieldAdmin = CharacterLimitFieldAdmin & {
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: LinkFormat;
};
export type UrlFieldAdmin = CharacterLimitFieldAdmin & {
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: LinkFormat;
};
export type IconFieldAdmin = CharacterLimitFieldAdmin;
export type JsonFieldAdmin = {
  /** How the value is displayed in read-only Admin surfaces. Does not affect storage or editing. */
  format?: JsonFormat;
};
export type NumberFieldAdmin = NumberLimitFieldAdmin & {
  /** How the value is displayed in read-only Admin surfaces (list cells, read-only inputs). Does not affect storage or editing. */
  format?: NumberFormat;
};
export type DateFieldAdmin = {
  /** How the value is displayed in read-only Admin surfaces (list cells, read-only inputs). Does not affect storage or editing. */
  format?: DateFormat;
};
export type JoinFieldAdmin = {
  /** Whether the join field should show the "Create new" action in the Admin UI. Defaults to `true`. */
  showCreateButton?: boolean;
  /** Whether the join field should show the "View all" action in the Admin UI. Defaults to `true`. */
  showViewButton?: boolean;
};

export interface UrlLinkValue {
  /** Whether the link is a custom URL or a reference to an internal document. */
  type: "custom" | "internal";
  /** The link URL. Absolute for custom links; may be a site-relative path for internal links. */
  url?: string;
  /** For internal links, the collection slug of the referenced document. */
  relationTo?: string;
  /** For internal links, the ID of the referenced document. */
  value?: string;
  /** Optional display label shown for the link. */
  label?: string;
}

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

export type TextField = TypedField<"text", string, TextFieldAdmin> &
  CharacterLimitFieldConfig &
  WordLimitFieldConfig;
export type TextareaField = TypedField<"textarea", string, TextareaFieldAdmin> &
  CharacterLimitFieldConfig &
  WordLimitFieldConfig;
export type EmailField = TypedField<"email", string, EmailFieldAdmin> &
  CharacterLimitFieldConfig;
export type UrlField = TypedField<"url", string | UrlLinkValue, UrlFieldAdmin> &
  CharacterLimitFieldConfig;
export type IconField = TypedField<"icon", string, IconFieldAdmin> &
  CharacterLimitFieldConfig;
/** A calendar day, stored and returned as an ISO date string. */
export type DateField = TypedField<"date", string, DateFieldAdmin>;
/** A specific instant, stored and returned as an ISO date-time string. */
export type DateTimeField = TypedField<"datetime", string, DateFieldAdmin>;
/** A local time of day, stored as a string when the date is modeled elsewhere. */
export type TimeField = TypedField<"time", string, DateFieldAdmin>;
/** A single choice from a fixed or dynamically-resolved set of options, stored as the chosen value. */
export type SelectField = TypedField<"select", string, SelectFieldAdmin>;
/** A single choice shown as radio buttons, stored as the chosen value. */
export type RadioField = TypedField<"radio", string, RadioFieldAdmin>;
/** A numeric value. Optional advisory `min`/`max` guide editors without enforcing server-side validation. */
export type NumberField = TypedField<"number", number, NumberFieldAdmin> &
  NumberLimitFieldConfig;
/** A `true`/`false` value, shown to editors as a checkbox or switch. */
export type BooleanField = TypedField<"boolean", boolean, BooleanFieldAdmin>;
/** Several choices from a fixed or dynamically-resolved set, stored as an array of the chosen values. */
export type MultiSelectField = TypedField<
  "multiSelect",
  string[],
  MultiSelectFieldAdmin
>;
/** A reference to one or more documents in another collection, stored as an ID or array of IDs. Use `relationTo` to name the target and `hasMany` for multiple. */
export type RelationshipField = TypedField<"relationship", string | string[]>;
/** A reference to one or more documents in an upload-enabled collection, stored as an ID or array of IDs. Use `relationTo` to name the target and `hasMany` for multiple. */
export type ImageField = TypedField<"image", string | string[]>;
/** Formatted content authored in the admin editor, stored as an HTML string. */
export type RichTextField = TypedField<"richText", string> &
  RichTextFieldConfig;
/** An arbitrary JSON value. Dyrected stores it as-is and does not validate its shape. */
export type JsonField = TypedField<
  "json",
  Record<string, unknown>,
  JsonFieldAdmin
>;
/** A group of nested `fields` stored as an embedded object under this field's `name`. */
export type ObjectField = TypedField<"object", unknown>;
/** A repeatable list of rows that all share the same `fields`, stored as an array of objects. */
export type ArrayField = TypedField<"array", unknown>;
/** Flexible content built from a controlled set of typed `blocks`, stored as an ordered array where each row records its `blockType`. */
export type BlocksField = TypedField<"blocks", unknown>;
/** A virtual reverse relationship that surfaces documents pointing back at this one via `collection` and `on`. Read-only; nothing is stored on this document. */
export type JoinField = TypedField<"join", unknown, JoinFieldAdmin>;
/** A layout-only container that arranges its child `fields` horizontally in the admin UI. Stores no value of its own. */
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
