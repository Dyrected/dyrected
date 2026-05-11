import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-4 py-24">
      <h1 className="text-4xl font-bold tracking-tight">Dyrected Docs</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        The AI-first headless CMS. Open source, framework-agnostic, and built for developers.
      </p>
      <div className="flex gap-3">
        <Link
          href="/docs/getting-started/introduction"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 transition-opacity"
        >
          Get Started
        </Link>
        <Link
          href="/docs/reference/rest-api"
          className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          API Reference
        </Link>
      </div>
    </main>
  )
}
