import { ReactNode } from 'react'
import { Callout } from 'fumadocs-ui/components/callout'

export function Note({ children }: { children: ReactNode }) {
  return <Callout type="info">{children}</Callout>
}

export function Warning({ children }: { children: ReactNode }) {
  return <Callout type="warning">{children}</Callout>
}
