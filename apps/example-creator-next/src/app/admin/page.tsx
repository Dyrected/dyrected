import { DyrectedAdmin } from "@dyrected/next/admin";
import "@dyrected/next/styles";

export const metadata = {
  title: "Admin | AweStudio",
};

export default function AdminPage() {
  const baseUrl = process.env.NEXT_PUBLIC_DYRECTED_URL;
  const siteId = process.env.NEXT_PUBLIC_DYRECTED_SITE_ID;
  const publicApiKey = process.env.NEXT_PUBLIC_DYRECTED_API_KEY;

  if (!baseUrl || !siteId || !publicApiKey) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-slate-950">
        <div className="mx-auto max-w-2xl border border-slate-200 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dyrected Admin
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Admin embed requires a public site key.</h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            The live secret key is configured for server-only content reads. Add a browser-safe
            Dyrected public key as NEXT_PUBLIC_DYRECTED_API_KEY to enable the embedded admin.
          </p>
        </div>
      </main>
    );
  }

  return <DyrectedAdmin baseUrl={baseUrl} apiKey={publicApiKey} siteId={siteId} />;
}
