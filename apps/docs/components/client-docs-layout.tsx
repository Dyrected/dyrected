'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar'
import { NewDocsSidebar } from '@/components/new-docs-sidebar'

export function ClientDocsLayout({ children, tree }: { children: ReactNode; tree: any }) {
  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: (
          <span className="flex items-center">
            <Image
              className="brand-logo-light"
              src="/dyrected.svg"
              alt="Dyrected"
              width={120}
              height={28}
              priority
            />
            <span className="brand-logo-dark" aria-label="Dyrected">
              dyrected <i className="brand-logo-accent" aria-hidden="true" />
            </span>
          </span>
        ),
      }}
      sidebar={{
        banner: null,
      }}
      slots={{
        sidebar: {
          provider: SidebarProvider,
          root: (props) => <NewDocsSidebar tree={tree} {...props} />,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}
