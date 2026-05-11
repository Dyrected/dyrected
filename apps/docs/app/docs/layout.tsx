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
          <Image
            src="/dyrected.svg"
            alt="Dyrected"
            width={120}
            height={28}
            priority
          />
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
