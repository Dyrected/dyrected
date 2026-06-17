import type { ReactNode } from 'react'
import Image from 'next/image'
import { HomeLayout } from 'fumadocs-ui/layouts/home'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
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
    >
      <div className="flex min-h-screen flex-col relative overflow-hidden">
        {/* Directed-paths atmosphere: thin orthogonal connectors at very low opacity */}
        <div className="docs-atmosphere absolute inset-0 -z-10 h-full w-full" />
        {/* Lime glow — top center, ties to action color */}
        <div
          className="docs-glow-lime absolute left-1/2 -translate-x-1/2 top-0 -z-10 h-[400px] w-[600px] rounded-full blur-[120px]"
        />
        {/* Violet glow — offset right, intelligence color */}
        <div
          className="docs-glow-violet absolute right-0 top-40 -z-10 h-[300px] w-[400px] rounded-full blur-[100px]"
        />
        {children}
      </div>
    </HomeLayout>
  )
}
