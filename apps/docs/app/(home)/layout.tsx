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
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/5 blur-[100px]" />
        </div>
        {children}
      </div>
    </HomeLayout>
  )
}
