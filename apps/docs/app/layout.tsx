import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Dyrected Docs',
    default: 'Dyrected Docs',
  },
  description: 'Documentation for Dyrected — the AI-first headless CMS.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
