import { redirect } from "next/navigation";
import { DOCS_DEFAULT_RUNTIME } from "@/lib/docs-runtime";

export default async function LegacyDocsCatchAllRedirect({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = (slug ?? []).join("/");
  redirect(`/docs/${DOCS_DEFAULT_RUNTIME}/${path}`);
}
