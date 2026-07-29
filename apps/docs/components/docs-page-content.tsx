import { readFile } from "node:fs/promises";
import Image from "next/image";
import Link from "fumadocs-core/link";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Steps, Step } from "fumadocs-ui/components/steps";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { Files, File, Folder } from "fumadocs-ui/components/files";
import { ArrowUpRight } from "lucide-react";
import { CopyPageButton } from "@/components/copy-page-button";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import { SetupWizard } from "@/components/setup-wizard";
import { Note, Warning } from "@/components/callouts";
import { Mermaid } from "@/components/mermaid";
import { RecipeExample } from "@/components/recipe-example";
import { CloudOnly, SelfHostedOnly } from "@/components/runtime-content";
import {
  RuntimeAwareLink,
  RuntimeLinkScope,
} from "@/components/runtime-link-scope";
import { SafeScriptTag } from "@/components/safe-script-tag";
import type { DocsSiteRuntime } from "@/lib/docs-runtime";

export function CloudRailCard() {
  return (
    <div className="mt-4 rounded-2xl border border-fd-border bg-linear-to-br from-fd-card via-fd-card to-fd-muted/55 p-4 shadow-[0_18px_46px_-42px_var(--surface-shadow)]">
      <div className="mt-2 mb-4 inline-flex items-center gap-1.5">
        <Image
          className="dark:hidden"
          src="/dyrected.svg"
          alt="Dyrected"
          width={100}
          height={24}
        />
        <Image
          className="hidden dark:block"
          src="/dyrected-dark.svg"
          alt="Dyrected"
          width={100}
          height={24}
        />
        <span className="text-sm font-semibold uppercase tracking-[0.16em]">| Cloud</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold leading-5 text-fd-foreground">
          Get your backend ready in minutes
        </h3>
        <p className="text-sm leading-5 text-fd-muted-foreground">
          Use a managed database, storage, APIs, and admin dashboard without setting up the infrastructure yourself.
        </p>
      </div>
      <Link
        target="__blank"
        href="https://app.dyrected.com"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent)] px-3 py-2 text-sm font-medium text-[color:var(--accent-foreground)] transition-transform transition-colors hover:bg-[color:var(--accent-hover)] hover:-translate-y-px"
      >
        Set Up My Backend
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export async function DocsPageContent({
  page,
  runtime,
}: {
  page: any;
  runtime: DocsSiteRuntime;
}) {
  const MDX = page.data.body;
  const rawContent = page.absolutePath
    ? await readFile(page.absolutePath, "utf-8").catch(() => "")
    : "";

  return (
    <DocsPage
      toc={page.data.toc as any}
      full={page.data.full}
      lastUpdate={page.data.lastModified}
      tableOfContent={{
        footer: <CloudRailCard />,
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <DocsTitle style={{ fontFamily: "var(--font-display, serif)", fontWeight: 500 }}>
            {page.data.title}
          </DocsTitle>
          <DocsDescription style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
            {page.data.description}
          </DocsDescription>
        </div>
        <CopyPageButton content={rawContent} />
      </div>
      <DocsBody style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
        <RuntimeLinkScope runtime={runtime}>
          <MDX
            components={{
              ...defaultMdxComponents,
              a: RuntimeAwareLink,
              Tab,
              Tabs,
              Steps,
              Step,
              Accordion,
              Accordions,
              TypeTable,
              Files,
              File,
              Folder,
              CopyPromptButton,
              SetupWizard,
              Note,
              Warning,
              Mermaid,
              RecipeExample,
              CloudOnly,
              SelfHostedOnly,
              script: SafeScriptTag,
            }}
          />
        </RuntimeLinkScope>
      </DocsBody>
    </DocsPage>
  );
}
