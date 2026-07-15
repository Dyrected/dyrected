export type RecipeCategory =
  | "content-modeling"
  | "data-lifecycle"
  | "admin-experience"
  | "access-control"
  | "workflows"
  | "integrations";

export interface Recipe {
  /** Stable identifier used by JSON consumers and generated page paths. */
  id: string;
  title: string;
  description: string;
  problem: string;
  summary: string;
  category: RecipeCategory;
  /** Plain-language requests that should resolve to this recipe. */
  intents: string[];
  /** Dyrected APIs and concepts demonstrated by the recipe. */
  concepts: string[];
  /** Canonical docs pages that explain this pattern in full. */
  canonicalDocs: string[];
  /** Package names required in addition to @dyrected/core. */
  requires: string[];
  /** Whether the snippet is a validated recipe source in @dyrected/knowledge. */
  snippetStatus: "validated";
  /** Canonical TypeScript source, compiled and tested in this package. */
  source: string;
  docsPath: string;
}

export interface RecipeMatch {
  recipe: Recipe;
  score: number;
}

export type ReferenceKind =
  | "interface"
  | "type"
  | "class"
  | "function"
  | "constant";

export interface ReferenceMember {
  name: string;
  signature: string;
  description: string;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  kind: ReferenceKind;
  category:
    | "configuration"
    | "fields"
    | "hooks"
    | "adapters"
    | "sdk"
    | "workflows";
  sourcePackage: string;
  description: string;
  signature: string;
  members: ReferenceMember[];
}

export interface EndpointReference {
  id: string;
  method: string;
  path: string;
  summary: string;
  tags: string[];
  authenticated: boolean;
  parameters: Array<{
    name: string;
    in: string;
    required: boolean;
    description?: string;
  }>;
  responses: string[];
}

export interface ExampleInventoryEntry {
  id: string;
  page: string;
  language: string;
  classification:
    | "compiled-recipe"
    | "syntax-checked"
    | "parsed"
    | "command"
    | "illustrative";
  validation: string;
}
