'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar'
import { DocsSidebar } from '@/components/docs-sidebar'
import type { DocsSiteRuntime } from '@/lib/docs-runtime'

export function ClientDocsLayout({
  children,
  tree,
  runtime,
}: {
  children: ReactNode
  tree: any
  runtime: DocsSiteRuntime
}) {
  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: (
          <span className="flex items-center">
            <Image
              className="dark:hidden"
              src="/dyrected.svg"
              alt="Dyrected"
              width={110}
              height={28}
              priority
            />
            <Image
              className="hidden dark:block"
              src="/dyrected-dark.svg"
              alt="Dyrected"
              width={110}
              height={28}
              priority
            />
          </span>
        ),
      }}
      sidebar={{
        banner: null,
      }}
      slots={{
        sidebar: {
          provider: SidebarProvider,
          root: (props) => <DocsSidebar tree={tree} runtime={runtime} {...props} />,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}
