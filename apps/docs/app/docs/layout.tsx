import type { ReactNode } from 'react'
import Image from 'next/image'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/app/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
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
    >
      {children}
    </DocsLayout>
  )
}
