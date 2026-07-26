import type {
  AccessPolicyResolver,
  AuthenticatedUser,
  AuthConfig,
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

type TopLevelFieldName<TFields extends readonly Field[]> = Extract<
  TFields[number],
  { name: string }
>["name"];

type InvalidReference<
  TLabel extends string,
  TReceived,
  TExpected extends string,
> = {
  __dyrected_error__: `Invalid ${TLabel}`;
  __dyrected_received__: TReceived;
  __dyrected_expected__: TExpected;
};

type TypedReference<
  TValue,
  TExpected extends string,
  TLabel extends string,
> = TValue extends undefined
  ? undefined
  : TValue extends TExpected
    ? TValue
    : InvalidReference<TLabel, TValue, TExpected>;

type TypedReferenceList<
  TValue,
  TExpected extends string,
  TLabel extends string,
> = TValue extends readonly unknown[]
  ? {
      [K in keyof TValue]: TypedReference<TValue[K], TExpected, TLabel>;
    }
  : InvalidReference<`${TLabel} list`, TValue, TExpected>;

type TypedCollectionAdmin<
  TFields extends readonly Field[],
  TDoc extends object,
  TAdmin extends NonNullable<CollectionConfig<TDoc>["admin"]> | undefined,
> = Omit<
  NonNullable<CollectionConfig<TDoc>["admin"]>,
  "useAsTitle" | "defaultColumns" | "searchableFields"
> & {
  useAsTitle?: TypedReference<
    PropertyType<NonNullable<TAdmin>, "useAsTitle">,
    TopLevelFieldName<TFields>,
    "field name"
  >;
  defaultColumns?: TypedReferenceList<
    PropertyType<NonNullable<TAdmin>, "defaultColumns">,
    TopLevelFieldName<TFields>,
    "field name"
  >;
  searchableFields?: TypedReferenceList<
    PropertyType<NonNullable<TAdmin>, "searchableFields">,
    TopLevelFieldName<TFields>,
    "field name"
  >;
};

type TypedNestedFieldAdmin<
  TFields extends readonly Field[],
  TAdmin extends NonNullable<Field["admin"]> | undefined,
> = Omit<
  NonNullable<Field["admin"]>,
  "useAsTitle"
> & {
  useAsTitle?: TypedReference<
    PropertyType<NonNullable<TAdmin>, "useAsTitle">,
    TopLevelFieldName<TFields>,
    "field name"
  >;
};

type PropertyType<T, K extends PropertyKey> = T extends {
  [P in K]?: infer V;
}
  ? V
  : never;

type PolicyNames<TPolicies> = Extract<keyof NonNullable<TPolicies>, string>;

type TypedPolicyReference<
  TPolicyNames extends string,
  TPolicy extends string | undefined,
> = {
  policy: TypedReference<TPolicy, TPolicyNames, "policy name">;
  params?: Record<string, unknown>;
};

type TypedAccessRule<TRule, TPolicyNames extends string> =
  | Exclude<TRule, { policy: string }>
  | TypedPolicyReference<
      TPolicyNames,
      Extract<PropertyType<TRule, "policy">, string>
    >;

type RetypeAccessObject<
  TAccess,
  TKeys extends PropertyKey,
  TPolicyNames extends string,
> = TAccess extends object
  ? Omit<TAccess, Extract<TKeys, keyof TAccess>> & {
      [K in Extract<TKeys, keyof TAccess>]?: TypedAccessRule<
        PropertyType<TAccess, K>,
        TPolicyNames
      >;
    }
  : TAccess;

type TypedFieldAccess<TAccess, TPolicyNames extends string> = RetypeAccessObject<
  TAccess,
  "read" | "create" | "update",
  TPolicyNames
>;

type TypedCollectionAccess<
  TAccess,
  TPolicyNames extends string,
> = RetypeAccessObject<
  TAccess,
  "read" | "create" | "update" | "delete" | "readAudit",
  TPolicyNames
>;

type TypedGlobalAccess<TAccess, TPolicyNames extends string> = RetypeAccessObject<
  TAccess,
  "read" | "update",
  TPolicyNames
>;

type SlugOf<T> = T extends { slug: infer TSlug extends string } ? TSlug : never;

type CollectionSlug<TCollections extends readonly unknown[]> = SlugOf<
  TCollections[number]
>;

type BlockSlug<TBlocks extends readonly unknown[]> = SlugOf<TBlocks[number]>;

type UploadCollectionSlug<TCollections extends readonly unknown[]> = SlugOf<
  Extract<TCollections[number], { upload: unknown }>
>;

type AuthCollectionSlug<TCollections extends readonly unknown[]> = SlugOf<
  Extract<TCollections[number], { auth: unknown }>
>;

type CollectionBySlug<
  TCollections extends readonly unknown[],
  TSlug extends string,
> = Extract<TCollections[number], { slug: TSlug }>;

type CollectionFieldNamesBySlug<
  TCollections extends readonly unknown[],
  TSlug extends string,
> = CollectionBySlug<TCollections, TSlug> extends {
  fields: infer TFields extends readonly Field[];
}
  ? TopLevelFieldName<TFields>
  : never;

type WorkflowStateName<TWorkflow> = TWorkflow extends {
  states: infer TStates extends readonly unknown[];
}
  ? Extract<TStates[number], { name: string }>["name"]
  : never;

type TypedWorkflowStateValue<TValue, TWorkflow> = TValue extends readonly unknown[]
  ? {
      [K in keyof TValue]: TypedReference<
        TValue[K],
        WorkflowStateName<TWorkflow>,
        "workflow state name"
      >;
    }
  : TypedReference<TValue, WorkflowStateName<TWorkflow>, "workflow state name">;

type TypedWorkflowTransition<TTransition, TWorkflow> = Omit<
  TTransition,
  "from" | "to"
> & {
  from: TypedWorkflowStateValue<PropertyType<TTransition, "from">, TWorkflow>;
  to: TypedReference<
    PropertyType<TTransition, "to">,
    WorkflowStateName<TWorkflow>,
    "workflow state name"
  >;
};

type TypedWorkflow<TWorkflow> = TWorkflow extends {
  transitions: infer TTransitions extends readonly unknown[];
}
  ? Omit<TWorkflow, "initialState" | "draftState" | "transitions"> & {
      initialState: TypedReference<
        PropertyType<TWorkflow, "initialState">,
        WorkflowStateName<TWorkflow>,
        "workflow state name"
      >;
      draftState?: TypedReference<
        PropertyType<TWorkflow, "draftState">,
        WorkflowStateName<TWorkflow>,
        "workflow state name"
      >;
      transitions: {
        [K in keyof TTransitions]: TypedWorkflowTransition<
          TTransitions[K],
          TWorkflow
        >;
      };
    }
  : TWorkflow;

type TypedBlockForConfig<
  TBlock extends Block,
  TCollections extends readonly unknown[],
  TRootBlocks extends readonly Block[],
  TPolicyNames extends string,
> = Omit<TBlock, "fields"> & {
  fields: TBlock["fields"] extends readonly Field[]
    ? TypedFields<TBlock["fields"], TCollections, TRootBlocks, TPolicyNames>
    : TBlock["fields"];
};

type TypedBlocksForConfig<
  TBlocks extends readonly Block[],
  TCollections extends readonly unknown[],
  TRootBlocks extends readonly Block[],
  TPolicyNames extends string,
> = {
  [K in keyof TBlocks]: TBlocks[K] extends Block
    ? TypedBlockForConfig<TBlocks[K], TCollections, TRootBlocks, TPolicyNames>
    : TBlocks[K];
};

type TypedFieldForConfig<
  TField extends Field,
  TCollections extends readonly unknown[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = TField extends { type: "relationship" }
  ? Omit<TField, "relationTo" | "access"> & {
      relationTo?: TypedReference<
        PropertyType<TField, "relationTo">,
        CollectionSlug<TCollections>,
        "collection slug"
      >;
      access?: TypedFieldAccess<NonNullable<TField["access"]>, TPolicyNames>;
    }
  : TField extends { type: "image" }
    ? Omit<TField, "relationTo" | "access"> & {
        relationTo?: TypedReference<
          PropertyType<TField, "relationTo">,
          UploadCollectionSlug<TCollections>,
          "upload collection slug"
        >;
        access?: TypedFieldAccess<NonNullable<TField["access"]>, TPolicyNames>;
      }
    : TField extends { type: "richText" }
      ? Omit<TField, "uploadCollection" | "access"> & {
          uploadCollection?: TypedReference<
            PropertyType<TField, "uploadCollection">,
            UploadCollectionSlug<TCollections>,
            "upload collection slug"
          >;
          access?: TypedFieldAccess<NonNullable<TField["access"]>, TPolicyNames>;
        }
      : TField extends { type: "join" }
        ? Omit<TField, "collection" | "on" | "access"> & {
            collection?: TypedReference<
              PropertyType<TField, "collection">,
              CollectionSlug<TCollections>,
              "collection slug"
            >;
            on?: TypedReference<
              PropertyType<TField, "on">,
              CollectionFieldNamesBySlug<
                TCollections,
                Extract<PropertyType<TField, "collection">, string>
              > | TopLevelFieldName<
                Extract<
                  CollectionBySlug<
                    TCollections,
                    CollectionSlug<TCollections>
                  >,
                  { fields: readonly Field[] }
                >["fields"]
              >,
              "field name"
            >;
            access?: TypedFieldAccess<
              NonNullable<TField["access"]>,
              TPolicyNames
            >;
          }
        : TField extends { type: "blocks" }
          ? Omit<TField, "blocks" | "blockReferences" | "access"> & {
              blocks?: TField["blocks"] extends readonly Block[]
                ? TypedBlocksForConfig<
                    TField["blocks"],
                    TCollections,
                    TBlocks,
                    TPolicyNames
                  >
                : TField["blocks"];
              blockReferences?: TypedReferenceList<
                PropertyType<TField, "blockReferences">,
                BlockSlug<TBlocks>,
                "block slug"
              >;
              access?: TypedFieldAccess<
                NonNullable<TField["access"]>,
                TPolicyNames
              >;
            }
          : TField extends {
                type: "array";
                fields: infer TSubFields extends readonly Field[];
              }
            ? Omit<TField, "fields" | "access" | "admin"> & {
                fields: TypedFields<
                  TSubFields,
                  TCollections,
                  TBlocks,
                  TPolicyNames
                >;
                access?: TypedFieldAccess<
                  NonNullable<TField["access"]>,
                  TPolicyNames
                >;
                admin?: TypedNestedFieldAdmin<
                  TSubFields,
                  PropertyType<TField, "admin">
                >;
              }
            : TField extends {
                  type: "object";
                  fields: infer TSubFields extends readonly Field[];
                }
              ? Omit<TField, "fields" | "access" | "admin"> & {
                  fields: TypedFields<
                    TSubFields,
                    TCollections,
                    TBlocks,
                    TPolicyNames
                  >;
                  access?: TypedFieldAccess<
                    NonNullable<TField["access"]>,
                    TPolicyNames
                  >;
                  admin?: TypedNestedFieldAdmin<
                    TSubFields,
                    PropertyType<TField, "admin">
                  >;
                }
          : TField extends { fields: infer TSubFields extends readonly Field[] }
            ? Omit<TField, "fields" | "access"> & {
                fields: TypedFields<
                  TSubFields,
                  TCollections,
                  TBlocks,
                  TPolicyNames
                >;
                access?: TypedFieldAccess<
                  NonNullable<TField["access"]>,
                  TPolicyNames
                >;
              }
            : Omit<TField, "access"> & {
                access?: TypedFieldAccess<
                  NonNullable<TField["access"]>,
                  TPolicyNames
                >;
              };

type TypedFields<
  TFields extends readonly Field[],
  TCollections extends readonly unknown[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = {
  [K in keyof TFields]: TFields[K] extends Field
    ? TypedFieldForConfig<TFields[K], TCollections, TBlocks, TPolicyNames>
    : TFields[K];
};

type TypedCollectionForConfig<
  TCollection extends CollectionConfig<any>,
  TCollections extends readonly CollectionConfig<any>[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = Omit<TCollection, "fields" | "access" | "workflow"> & {
  fields: TCollection["fields"] extends readonly Field[]
    ? TypedFields<TCollection["fields"], TCollections, TBlocks, TPolicyNames>
    : TCollection["fields"];
  access?: TypedCollectionAccess<
    NonNullable<TCollection["access"]>,
    TPolicyNames
  >;
  workflow?: TypedWorkflow<NonNullable<TCollection["workflow"]>>;
};

type TypedCollections<
  TCollections extends readonly CollectionConfig<any>[],
  TAllCollections extends readonly CollectionConfig<any>[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = {
  [K in keyof TCollections]: TCollections[K] extends CollectionConfig<any>
    ? TypedCollectionForConfig<
        TCollections[K],
        TAllCollections,
        TBlocks,
        TPolicyNames
      >
    : TCollections[K];
};

type TypedGlobalForConfig<
  TGlobal extends GlobalConfig<any>,
  TCollections extends readonly CollectionConfig<any>[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = Omit<TGlobal, "fields" | "access"> & {
  fields: TGlobal["fields"] extends readonly Field[]
    ? TypedFields<TGlobal["fields"], TCollections, TBlocks, TPolicyNames>
    : TGlobal["fields"];
  access?: TypedGlobalAccess<NonNullable<TGlobal["access"]>, TPolicyNames>;
};

type TypedGlobals<
  TGlobals extends readonly GlobalConfig<any>[],
  TCollections extends readonly CollectionConfig<any>[],
  TBlocks extends readonly Block[],
  TPolicyNames extends string,
> = {
  [K in keyof TGlobals]: TGlobals[K] extends GlobalConfig<any>
    ? TypedGlobalForConfig<TGlobals[K], TCollections, TBlocks, TPolicyNames>
    : TGlobals[K];
};

type TypedAdminAuthConfig<
  TAdminAuth,
  TCollections extends readonly CollectionConfig<any>[],
> = TAdminAuth extends object
  ? Omit<TAdminAuth, "collectionSlug"> & {
      collectionSlug?: TypedReference<
        PropertyType<TAdminAuth, "collectionSlug">,
        AuthCollectionSlug<TCollections>,
        "auth collection slug"
      >;
    }
  : TAdminAuth;

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
export function defineCollection<
  const TSlug extends string,
  const TFields extends Field[],
  const TAdmin extends NonNullable<
    CollectionConfig<
      Prettify<
        { id: string } & InferDocShape<TFields> &
          SystemDocFields &
          AuthDocFields
      >
    >["admin"]
  > | undefined,
  const TConfig extends Omit<
    CollectionConfig<
      Prettify<
        { id: string } & InferDocShape<TFields> &
          SystemDocFields &
          AuthDocFields
      >
    >,
    "fields" | "auth" | "admin"
  > & {
    slug: TSlug;
    fields: TFields;
    auth: true | AuthConfig;
    admin?: TypedCollectionAdmin<
      TFields,
      Prettify<
        { id: string } & InferDocShape<TFields> & SystemDocFields & AuthDocFields
      >,
      TAdmin
    >;
  },
>(
  config: TConfig,
): TConfig;
// Overload 2: upload/media collection — infer fields + add system + upload fields
export function defineCollection<
  const TSlug extends string,
  const TFields extends Field[],
  const TAdmin extends NonNullable<
    CollectionConfig<
      Prettify<
        { id: string } & InferDocShape<TFields> &
          SystemDocFields &
          UploadDocFields
      >
    >["admin"]
  > | undefined,
  const TConfig extends Omit<
    CollectionConfig<
      Prettify<
        { id: string } & InferDocShape<TFields> &
          SystemDocFields &
          UploadDocFields
      >
    >,
    "fields" | "upload" | "admin"
  > & {
    slug: TSlug;
    fields: TFields;
    upload: true;
    admin?: TypedCollectionAdmin<
      TFields,
      Prettify<
        { id: string } & InferDocShape<TFields> & SystemDocFields & UploadDocFields
      >,
      TAdmin
    >;
  },
>(
  config: TConfig,
): TConfig;
// Overload 3: base collection — infer fields + add system fields
export function defineCollection<
  const TSlug extends string,
  const TFields extends Field[],
  const TAdmin extends NonNullable<
    CollectionConfig<
      Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>
    >["admin"]
  > | undefined,
  const TConfig extends Omit<
    CollectionConfig<
      Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>
    >,
    "fields" | "admin"
  > & {
    slug: TSlug;
    fields: TFields;
    admin?: TypedCollectionAdmin<
      TFields,
      Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>,
      TAdmin
    >;
  },
>(
  config: TConfig,
): TConfig;
// Overload 4: explicit TDoc
export function defineCollection<
  TDoc extends object,
  const TConfig extends CollectionConfig<TDoc>,
>(config: TConfig): TConfig;
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
export function defineGlobal<
  const TSlug extends string,
  const TFields extends Field[],
  const TConfig extends Omit<GlobalConfig<Prettify<InferDocShape<TFields>>>, "fields"> & {
    slug: TSlug;
    fields: TFields;
  },
>(config: TConfig): TConfig;
// Overload 2: explicit TDoc
export function defineGlobal<
  TDoc extends object,
  const TConfig extends GlobalConfig<TDoc>,
>(config: TConfig): TConfig;
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
export function defineConfig<
  TUser extends AuthenticatedUser = AuthenticatedUser,
  const TBlocks extends readonly Block[] = [],
  const TCollections extends readonly CollectionConfig<any>[] = [],
  const TGlobals extends readonly GlobalConfig<any>[] = [],
  const TAdminAuth extends DyrectedConfig<TUser>["adminAuth"] | undefined = undefined,
  const TPolicies extends
    | Record<
        string,
        AccessPolicyResolver<Record<string, unknown>, TUser> | string | boolean
      >
    | undefined = undefined,
>(
  config: Omit<
    DyrectedConfig<TUser>,
    "blocks" | "collections" | "globals" | "accessPolicies" | "adminAuth"
  > & {
    blocks?: TypedBlocksForConfig<
      TBlocks,
      TCollections,
      TBlocks,
      PolicyNames<TPolicies>
    >;
    collections: TypedCollections<
      TCollections,
      TCollections,
      TBlocks,
      PolicyNames<TPolicies>
    >;
    globals: TypedGlobals<
      TGlobals,
      TCollections,
      TBlocks,
      PolicyNames<TPolicies>
    >;
    accessPolicies?: TPolicies;
    adminAuth?: TypedAdminAuthConfig<TAdminAuth, TCollections>;
  },
): typeof config {
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
  return <const T extends Omit<FieldOfType<TType>, "type">>(
    field: T,
  ): T & { type: TType } => ({ ...field, type }) as T & { type: TType };
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

/**
 * Group fields under a named tab in the Admin edit form. Tabs are presentational
 * only: `defineTab` returns the given fields unchanged except that each one's
 * `admin.tab` is set to `label`, and the Admin panel renders fields that share a
 * tab name together under that tab. Spread the result into a collection, global,
 * or group `fields` array, and add one `defineTab` call per tab. Fields left
 * without a tab are collected into a leading tab named after the collection.
 *
 * ```ts
 * defineCollection({
 *   slug: 'pages',
 *   fields: [
 *     ...defineTab({
 *       label: 'Content',
 *       fields: [
 *         defineTextField({ name: 'title', required: true }),
 *         defineRichTextField({ name: 'body' }),
 *       ],
 *     }),
 *     ...defineTab({
 *       label: 'SEO',
 *       fields: [defineTextField({ name: 'metaTitle' })],
 *     }),
 *   ],
 * })
 * ```
 */
export function defineTab<const T extends readonly Field[]>(args: {
  /** Tab name shown in the Admin edit form's tab bar. */
  label: string;
  /** Fields to place under this tab; each field's `admin.tab` is set to `label`. */
  fields: T;
}): T {
  return args.fields.map((field) => ({
    ...field,
    admin: { ...(field.admin ?? {}), tab: args.label },
  })) as unknown as T;
}

export * from "./types/index.js";
export * from "./utils/config.js";
export * from "./utils/admin-auth.js";
export * from "./utils/parse-where.js";
export * from "./utils/parse-sort.js";
export * from "./utils/declarative-hooks.js";
export * from "./utils/jexl-helpers.js";
export * from "./utils/hooks.js";
export * from "./utils/openapi.js";
export * from "./workflows.js";
