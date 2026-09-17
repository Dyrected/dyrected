import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import { RuntimeSearchDialog } from '@/components/search-dialog'
import './globals.css'

const dmSans = { variable: '' }
const fraunces = { variable: '' }

export const metadata: Metadata = {
  title: {
    template: '%s | Dyrected Docs',
    default: 'Dyrected Docs',
  },
  description: 'Documentation for Dyrected — the AI-first headless CMS.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable}`}
      style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <RootProvider search={{ SearchDialog: RuntimeSearchDialog }}>{children}</RootProvider>
      </body>
    </html>
  )
}
