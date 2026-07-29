import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { runtimeSource } from "@/app/source";
import { ClientDocsLayout } from "@/components/client-docs-layout";
import { isDocsSiteRuntime } from "@/lib/docs-runtime";
import { prepareTree } from "@/lib/unpublished";

interface Props {
  children: ReactNode;
  params: Promise<{ runtime: string }>;
}

export default async function RuntimeDocsLayout({ children, params }: Props) {
  const { runtime } = await params;
  if (!isDocsSiteRuntime(runtime)) notFound();

  const source = runtimeSource.getSource(runtime);

  return (
    <ClientDocsLayout tree={prepareTree(source.pageTree)} runtime={runtime}>
      {children}
    </ClientDocsLayout>
  );
}
