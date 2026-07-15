import { getRecipe } from '@/lib/knowledge'

interface RecipeExampleProps {
  id: string
}

export function RecipeExample({ id }: RecipeExampleProps) {
  const recipe = getRecipe(id)

  if (!recipe) {
    throw new Error(`Unknown recipe example: ${id}`)
  }

  if (recipe.snippetStatus !== 'validated') {
    throw new Error(`Recipe example is not validated: ${id}`)
  }

  return (
    <pre className="language-ts" data-language="ts">
      {recipe.source}
    </pre>
  )
}
