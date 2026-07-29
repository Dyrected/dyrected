import { notFound, redirect } from "next/navigation";
import {
  DOCS_DEFAULT_RUNTIME,
  resolveLegacyDocsRedirect,
} from "@/lib/docs-runtime";
import { isUnpublishedSlug, showUnpublished } from "@/lib/unpublished";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function LegacyDocsPage({ params }: Props) {
  const { slug } = await params;

  if (isUnpublishedSlug(slug) && !showUnpublished) notFound();

  const target = resolveLegacyDocsRedirect(slug, DOCS_DEFAULT_RUNTIME);
  if (!target) notFound();

  redirect(target);
}

export async function generateStaticParams() {
  return [];
}
