import type {
  Block,
  CollectionConfig,
  DyrectedConfig,
  Field,
  FieldType,
  GlobalConfig,
  InferDocShape,
  Prettify,
  SystemDocFields,
  AuthDocFields,
  UploadDocFields,
} from "./types/index.js";

/**
 * Define a collection. When called without an explicit type argument, TypeScript
 * automatically infers the document shape from the `fields` array you provide —
 * no manual interface required:
 *
 * ```ts
 * export const Posts = defineCollection({
 *   slug: 'posts',
 *   fields: [
 *     defineTextField({ name: 'title', required: true }),
 *     defineSelectField({ name: 'status', options: ['draft', 'published'], required: true }),
 *   ],
 *   hooks: {
 *     beforeChange: [({ data }) => {
 *       // data is { title: string; status: 'draft' | 'published' } — fully inferred
 *     }],
 *   },
 * })
 * ```
 *
 * When you need a richer interface (e.g. with methods, JSDoc, or types that
 * can't be derived from fields), pass it explicitly:
 *
 * ```ts
 * interface Post { id: string; title: string; status: 'draft' | 'published' }
 *
 * export const Posts = defineCollection<Post>({ ... })
 * ```
 */
// Overload 1: auth collection — infer fields + add system + auth fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<
    CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & AuthDocFields>>,
    "fields" | "auth"
  > & { fields: TFields; auth: true },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & AuthDocFields>>;
// Overload 2: upload/media collection — infer fields + add system + upload fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<
    CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & UploadDocFields>>,
    "fields" | "upload"
  > & { fields: TFields; upload: true },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & UploadDocFields>>;
// Overload 3: base collection — infer fields + add system fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>>, "fields"> & {
    fields: TFields;
  },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>>;
// Overload 4: explicit TDoc
export function defineCollection<TDoc extends object>(config: CollectionConfig<TDoc>): CollectionConfig<TDoc>;
// Implementation
export function defineCollection(config: unknown): unknown {
  return config;
}

/**
 * Define a global (singleton document). TypeScript automatically infers the
 * document shape from the `fields` array, or you can pass an explicit type:
 *
 * ```ts
 * // Inferred — no interface needed
 * export const Settings = defineGlobal({
 *   slug: 'site-settings',
 *   fields: [
 *     defineTextField({ name: 'siteName', required: true }),
 *     defineBooleanField({ name: 'maintenanceMode' }),
 *   ],
 *   hooks: {
 *     afterChange: [({ doc }) => {
 *       // doc.siteName is string, doc.maintenanceMode is boolean | undefined
 *       if (doc.maintenanceMode) alertOnCall()
 *     }],
 *   },
 * })
 *
 * // Explicit type
 * interface SiteSettings { siteName: string; maintenanceMode?: boolean }
 * export const Settings = defineGlobal<SiteSettings>({ ... })
 * ```
 */
// Overload 1: no explicit TDoc — infer from fields
export function defineGlobal<const TFields extends Field[]>(
  config: Omit<GlobalConfig<Prettify<InferDocShape<TFields>>>, "fields"> & {
    fields: TFields;
  },
): GlobalConfig<Prettify<InferDocShape<TFields>>>;
// Overload 2: explicit TDoc
export function defineGlobal<TDoc extends object>(config: GlobalConfig<TDoc>): GlobalConfig<TDoc>;
// Implementation
export function defineGlobal(config: unknown): unknown {
  return config;
}

/**
 * Define the root Dyrected configuration.
 *
 * This is the single object passed to `createDyrectedApp`. It wires together
 * the database adapter, collections, globals, storage, email, and all other
 * server-level configuration.
 */
export function defineConfig(config: DyrectedConfig): DyrectedConfig {
  return config;
}

/**
 * Define a single field of any type. This is an identity helper: it returns the
 * field unchanged at runtime but preserves the exact literal type, so document
 * shapes still infer correctly when the field is placed in a `defineCollection`
 * or `defineGlobal` `fields` array.
 *
 * Use it when you want autocomplete and type-checking on a field written on its
 * own — for example a shared field reused across collections:
 *
 * ```ts
 * const slug = defineField({ name: 'slug', type: 'text', required: true, unique: true })
 *
 * export const Posts = defineCollection({ slug: 'posts', fields: [slug, ...] })
 * ```
 *
 * For a field of a known type, prefer the dedicated helper (e.g.
 * {@link defineTextField}) so you don't have to repeat the `type`.
 */
export function defineField<const T extends Field>(field: T): T {
  return field;
}

/**
 * Define a {@link Block} for use in a `blocks` field. Identity helper that
 * preserves the block's literal type (slug + fields) so `blocks`-field values
 * stay fully inferred.
 *
 * ```ts
 * const Hero = defineBlock({
 *   slug: 'hero',
 *   fields: [defineTextField({ name: 'heading', required: true })],
 * })
 *
 * defineBlocksField({ name: 'layout', blocks: [Hero] })
 * ```
 */
export function defineBlock<const T extends Block>(block: T): T {
  return block;
}

/** The member of the {@link Field} union that has the given `type`. */
type FieldOfType<TType extends FieldType> = Extract<Field, { type: TType }>;

/**
 * Builds a typed identity helper for one field type. The returned function
 * accepts the field config without its `type` (autocompleted to that type's
 * shape), injects the `type`, and preserves literal inference for document
 * shapes. Used to generate the `define<Type>Field` helpers below.
 */
function createFieldDefiner<TType extends FieldType>(type: TType) {
  return <const T extends Omit<FieldOfType<TType>, "type">>(field: T): T & { type: TType } =>
    ({ ...field, type }) as T & { type: TType };
}

/** Define a `text` field. */
export const defineTextField = createFieldDefiner("text");
/** Define a `textarea` field. */
export const defineTextareaField = createFieldDefiner("textarea");
/** Define a `richText` field, including its editor `features` and `headingLevels`. */
export const defineRichTextField = createFieldDefiner("richText");
/** Define a `number` field. */
export const defineNumberField = createFieldDefiner("number");
/** Define a `boolean` field. */
export const defineBooleanField = createFieldDefiner("boolean");
/** Define a `date` field. */
export const defineDateField = createFieldDefiner("date");
/** Define a `datetime` field. */
export const defineDateTimeField = createFieldDefiner("datetime");
/** Define a `time` field. */
export const defineTimeField = createFieldDefiner("time");
/** Define a `select` field. */
export const defineSelectField = createFieldDefiner("select");
/** Define a `multiSelect` field. */
export const defineMultiSelectField = createFieldDefiner("multiSelect");
/** Define a `radio` field. */
export const defineRadioField = createFieldDefiner("radio");
/** Define a `relationship` field. */
export const defineRelationshipField = createFieldDefiner("relationship");
/** Define an `array` field. */
export const defineArrayField = createFieldDefiner("array");
/** Define an `object` field. */
export const defineObjectField = createFieldDefiner("object");
/** Define a `json` field. */
export const defineJsonField = createFieldDefiner("json");
/** Define a `blocks` field. */
export const defineBlocksField = createFieldDefiner("blocks");
/** Define an `image` field. */
export const defineImageField = createFieldDefiner("image");
/** Define an `email` field. */
export const defineEmailField = createFieldDefiner("email");
/** Define a `url` field. */
export const defineUrlField = createFieldDefiner("url");
/** Define an `icon` field. */
export const defineIconField = createFieldDefiner("icon");
/** Define a `join` field. */
export const defineJoinField = createFieldDefiner("join");
/** Define a layout-only `row` field. */
export const defineRowField = createFieldDefiner("row");

export * from "./types/index.js";
export * from "./utils/config.js";
export * from "./utils/admin-auth.js";
export * from "./utils/parse-where.js";
export * from "./utils/parse-sort.js";
export * from "./utils/hooks.js";
export * from "./utils/openapi.js";
export * from "./workflows.js";
