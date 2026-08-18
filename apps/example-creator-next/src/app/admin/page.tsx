import { DyrectedAdmin } from "@dyrected/next/admin";
import "@dyrected/next/styles";

export const metadata = {
  title: "Admin | AweStudio",
};

export default function AdminPage() {
  const baseUrl = process.env.NEXT_PUBLIC_DYRECTED_URL;
  const siteId = process.env.NEXT_PUBLIC_DYRECTED_SITE_ID;
  const publicApiKey = process.env.NEXT_PUBLIC_DYRECTED_API_KEY;

  return <DyrectedAdmin baseUrl={baseUrl} apiKey={publicApiKey} siteId={siteId} />;
}
