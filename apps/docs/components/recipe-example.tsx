import { getRecipe } from '@/lib/knowledge'
import type { DocsSiteRuntime } from '@/lib/docs-runtime'

interface RecipeExampleProps {
  id: string
  runtime?: DocsSiteRuntime
}

function recipeSupportsRuntime(
  recipeRuntime: "shared" | "cloud" | "self-hosted" | "variant",
  siteRuntime: DocsSiteRuntime,
) {
  switch (recipeRuntime) {
    case "shared":
    case "variant":
      return true
    case "cloud":
      return siteRuntime === "cloud"
    case "self-hosted":
      return siteRuntime === "self-hosted"
  }
}

export function RecipeExample({ id, runtime }: RecipeExampleProps) {
  const recipe = getRecipe(id)

  if (!recipe) {
    throw new Error(`Unknown recipe example: ${id}`)
  }

  if (recipe.snippetStatus !== 'validated') {
    throw new Error(`Recipe example is not validated: ${id}`)
  }

  if (runtime && !recipeSupportsRuntime(recipe.runtime, runtime)) {
    return null
  }

  return (
    <pre className="language-ts" data-language="ts">
      {recipe.source}
    </pre>
  )
}
