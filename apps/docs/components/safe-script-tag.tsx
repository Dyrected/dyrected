import type { ReactNode } from 'react'

export function SafeScriptTag({ children }: { children?: ReactNode }) {
  return <template data-docs-script="true">{children}</template>
}
