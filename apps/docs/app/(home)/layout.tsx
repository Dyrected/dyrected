import type { ReactNode } from 'react'
import Image from 'next/image'
import { HomeLayout } from 'fumadocs-ui/layouts/home'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
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
    >
      <div className="flex min-h-screen flex-col relative overflow-hidden">
        {/* Directed-paths atmosphere: thin orthogonal connectors at very low opacity */}
        <div
          className="absolute inset-0 -z-10 h-full w-full"
          style={{
            background: '#FBFFF1',
            backgroundImage: `
              linear-gradient(to right, rgba(182,255,46,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(124,61,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Lime glow — top center, ties to action color */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 -z-10 h-[400px] w-[600px] rounded-full blur-[120px]"
          style={{ background: 'rgba(182,255,46,0.12)' }}
        />
        {/* Violet glow — offset right, intelligence color */}
        <div
          className="absolute right-0 top-40 -z-10 h-[300px] w-[400px] rounded-full blur-[100px]"
          style={{ background: 'rgba(124,61,255,0.08)' }}
        />
        {children}
      </div>
    </HomeLayout>
  )
}
