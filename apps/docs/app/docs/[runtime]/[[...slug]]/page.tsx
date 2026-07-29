import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { runtimeSource } from "@/app/source";
import { DocsPageContent } from "@/components/docs-page-content";
import {
  getRuntimePageUrl,
  getRuntimeOverviewUrl,
  isDocsSiteRuntime,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";
import { isUnpublishedSlug, showUnpublished } from "@/lib/unpublished";

interface Props {
  params: Promise<{ runtime: string; slug?: string[] }>;
}

function assertRuntime(runtime: string): DocsSiteRuntime {
  if (!isDocsSiteRuntime(runtime)) notFound();
  return runtime;
}

export default async function RuntimeDocsPage({ params }: Props) {
  const { runtime, slug } = await params;
  const siteRuntime = assertRuntime(runtime);

  if (!slug || slug.length === 0) {
    redirect(getRuntimeOverviewUrl(siteRuntime));
  }

  if (isUnpublishedSlug(slug) && !showUnpublished) notFound();

  const source = runtimeSource.getSource(siteRuntime);
  const page = source.getPage(slug);
  if (!page) notFound();

  return <DocsPageContent page={page} runtime={siteRuntime} />;
}

export async function generateStaticParams() {
  return [
    ...runtimeSource
      .generateParams("cloud")
      .map((param) => ({ runtime: "cloud" as const, slug: param.slug })),
    ...runtimeSource
      .generateParams("self-hosted")
      .map((param) => ({ runtime: "self-hosted" as const, slug: param.slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { runtime, slug } = await params;
  const siteRuntime = assertRuntime(runtime);

  if (!slug || slug.length === 0) {
    return {
      alternates: {
        canonical: getRuntimeOverviewUrl(siteRuntime),
      },
    };
  }

  if (isUnpublishedSlug(slug) && !showUnpublished) notFound();

  const source = runtimeSource.getSource(siteRuntime);
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: getRuntimePageUrl(page.slugs.join("/"), siteRuntime),
    },
  };
}
