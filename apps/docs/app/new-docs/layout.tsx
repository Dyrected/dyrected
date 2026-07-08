import type { ReactNode } from 'react'
import Image from 'next/image'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar'
import { newDocsSource } from '@/app/source'
import { NewDocsSidebar } from '@/components/new-docs-sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={newDocsSource.pageTree}
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
        collapsible: false,
      }}
      slots={{
        sidebar: {
          provider: SidebarProvider,
          root: (props) => <NewDocsSidebar tree={newDocsSource.pageTree} {...props} />,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}
