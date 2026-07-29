import recipesJson from "@dyrected/knowledge/recipes.json";
import type { Recipe } from "@dyrected/knowledge";

export {
  endpoints,
  findRecipesByIntent,
  getEndpoint,
  getReference,
  references,
} from "@dyrected/knowledge";
export type {
  EndpointReference,
  ExampleInventoryEntry,
  Recipe,
  RecipeCategory,
  RecipeMatch,
  ReferenceEntry,
} from "@dyrected/knowledge";

export type RuntimeRecipe = Recipe & {
  runtime: "shared" | "cloud" | "self-hosted" | "variant";
  runtimeNotes?: string;
};

export const recipes = recipesJson as readonly RuntimeRecipe[];

export function getRecipe(id: string) {
  return recipes.find((recipe) => recipe.id === id);
}
