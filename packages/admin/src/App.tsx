/**
 * Dev-only entry point (used by main.tsx / vite dev server).
 * For production embedding use `AdminUI` from `@dyrected/admin`.
 *
 * Credentials here are local dev defaults — override with env vars
 * or a .env.local file:
 *   VITE_API_URL=http://localhost:3000
 *   VITE_API_KEY=your_api_key
 *   VITE_SITE_ID=your_site_id
 */
import { AdminStandalone } from "./index";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const apiKey = import.meta.env.VITE_API_KEY ?? "";
const siteId = import.meta.env.VITE_SITE_ID ?? undefined;

export default function App() {
  return (
    <AdminStandalone
      baseUrl={apiUrl}
      apiKey={apiKey}
      siteId={siteId}
    />
  );
}
