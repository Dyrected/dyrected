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

export function ClientDocsLayout({ children, tree }: { children: ReactNode; tree: any }) {
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
          root: (props) => <DocsSidebar tree={tree} {...props} />,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}
