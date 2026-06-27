import type { Block, Field } from "./schema-core.js";

export type Prettify<T> = { [K in keyof T]: T[K] };

type FieldValueType<F extends Field> = F["type"] extends
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "icon"
  | "date"
  | "datetime"
  | "time"
  | "select"
  | "radio"
  ? string
  : F["type"] extends "number"
    ? number
    : F["type"] extends "boolean"
      ? boolean
      : F["type"] extends "multiSelect"
        ? string[]
        : F["type"] extends "relationship"
          ? F extends { hasMany: true }
            ? string[]
            : string
          : F["type"] extends "image"
            ? F extends { hasMany: true }
              ? string[]
              : string
            : F["type"] extends "richText" | "json"
              ? Record<string, unknown>
              : F["type"] extends "object"
                ? F extends { fields: infer SF extends readonly Field[] }
                  ? Prettify<InferDocShape<SF>>
                  : Record<string, unknown>
                : F["type"] extends "array"
                  ? F extends { fields: infer SF extends readonly Field[] }
                    ? Array<Prettify<InferDocShape<SF>>>
                    : unknown[]
                  : F["type"] extends "blocks"
                    ? F extends { blocks: infer B extends readonly Block[] }
                      ? Array<InferBlocksUnion<B>>
                      : Array<{ blockType: string } & Record<string, unknown>>
                    : unknown;

type InferBlocksUnion<Blocks extends readonly Block[]> = Blocks extends readonly [
  infer B extends Block,
  ...infer Rest extends readonly Block[],
]
  ? B["fields"] extends readonly Field[]
    ? ({ blockType: B["slug"] } & Prettify<InferDocShape<B["fields"]>>) | InferBlocksUnion<Rest>
    : ({ blockType: B["slug"] } & Record<string, unknown>) | InferBlocksUnion<Rest>
  : never;

type InferFieldEntry<F extends Field> = F extends {
  type: "row";
  fields: infer SF extends readonly Field[];
}
  ? InferDocShape<SF>
  : F extends { type: "join" }
    ? Record<never, never>
    : F extends { name: infer N extends string; required: true }
      ? { [K in N]: FieldValueType<F> }
      : F extends { name: infer N extends string }
        ? { [K in N]?: FieldValueType<F> }
        : Record<never, never>;

export type InferDocShape<Fields extends readonly Field[]> = Fields extends readonly []
  ? Record<never, never>
  : Fields extends readonly [infer Head extends Field, ...infer Tail extends readonly Field[]]
    ? InferFieldEntry<Head> & InferDocShape<Tail>
    : Record<string, unknown>;

export type SystemDocFields = {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type AuthDocFields = {
  email: string;
  password?: string;
  roles?: string[];
};

export type UploadDocFields = {
  filename: string;
  filesize?: number;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  blurhash?: string;
  sizes?: Record<string, { filename?: string; url?: string; width?: number; height?: number }>;
};
