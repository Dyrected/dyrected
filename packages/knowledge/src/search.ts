import type { Recipe, RecipeMatch } from "./types.js";

const ignoredWords = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "in",
  "of",
  "the",
  "to",
  "with",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1 && !ignoredWords.has(token));
}

export function findRecipesByIntent(
  query: string,
  catalogue: readonly Recipe[],
  options: { limit?: number; minimumScore?: number } = {},
): RecipeMatch[] {
  const queryTokens = new Set(tokens(query));
  if (queryTokens.size === 0) return [];

  const minimumScore = options.minimumScore ?? 1;
  const matches = catalogue
    .map((recipe) => {
      const intentText = recipe.intents.join(" ").toLowerCase();
      const titleText = `${recipe.title} ${recipe.description}`.toLowerCase();
      const conceptText = recipe.concepts.join(" ").toLowerCase();
      let score = intentText.includes(query.toLowerCase()) ? 20 : 0;

      for (const token of queryTokens) {
        if (intentText.includes(token)) score += 5;
        if (titleText.includes(token)) score += 3;
        if (conceptText.includes(token)) score += 2;
      }

      return { recipe, score };
    })
    .filter((match) => match.score >= minimumScore)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.recipe.title.localeCompare(right.recipe.title),
    );

  return matches.slice(0, options.limit ?? 5);
}
