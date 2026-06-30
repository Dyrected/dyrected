import { recipes } from "./generated/recipes.js";
import { endpoints, references } from "./generated/references.js";
import { findRecipesByIntent as searchRecipes } from "./search.js";

export { recipes } from "./generated/recipes.js";
export { endpoints, references } from "./generated/references.js";
export { AI_RULES, SKILL, buildAiRules } from "./generated/ai.js";
export { GENERATE_CMS_PROMPT } from "./generated/prompts.js";
export type {
  EndpointReference,
  ExampleInventoryEntry,
  Recipe,
  RecipeCategory,
  RecipeMatch,
  ReferenceEntry,
  ReferenceKind,
  ReferenceMember,
} from "./types.js";

export function findRecipesByIntent(
  query: string,
  options?: { limit?: number; minimumScore?: number },
) {
  return searchRecipes(query, recipes, options);
}

export function getRecipe(id: string) {
  return recipes.find((recipe) => recipe.id === id);
}

export function getReference(id: string) {
  return references.find((reference) => reference.id === id);
}

export function getEndpoint(method: string, path: string) {
  return endpoints.find(
    (endpoint) =>
      endpoint.method === method.toUpperCase() && endpoint.path === path,
  );
}
