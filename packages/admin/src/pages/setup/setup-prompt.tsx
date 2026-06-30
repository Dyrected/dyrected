import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  Copy,
  Sparkles,
} from "lucide-react";
import { GENERATE_CMS_PROMPT } from "@dyrected/knowledge";
import { Button } from "../../components/ui/button";

export interface SetupPromptConfig {
  siteName?: string;
  siteId?: string;
  apiKey?: string;
  baseUrl?: string;
  isSelfHosted?: boolean;
  existingSite?: boolean;
  defaultTechStack?: string;
}

export interface SetupPromptProps {
  config: SetupPromptConfig;
}

const GUIDE_URL = "https://www.dyrected.com/guide";
const DOCS_URL = "https://docs.dyrected.com";

const steps = [
  {
    title: "Paste the prompt into your AI builder",
    body: "Use the same AI builder that owns the website code — Lovable, Bolt, v0, Cursor, Replit, Windsurf, or any other.",
  },
  {
    title: "Review and approve the content list",
    body: "The AI sends back a plain list of everything on your site a client could edit. Correct anything missing or wrong, then say \"approved\".",
  },
  {
    title: "Give your Dyrected details when asked",
    body: "The prompt tells the AI to wait until the install stage before asking. Have your Site ID, API key, and Base URL ready.",
  },
  {
    title: "Test one edit, then invite the client",
    body: "Change a piece of content in Dyrected and confirm it appears on the website. If it looks right, the site is ready for the client.",
  },
];

function normalizeTechStack(techStack?: string): string | undefined {
  if (!techStack) return undefined;
  if (techStack === "next") return "nextjs";
  if (techStack === "nuxtjs") return "nuxt";
  return techStack.toLowerCase();
}

export function buildGuideUrl(config: SetupPromptConfig): string {
  const url = new URL(GUIDE_URL);
  const stack = normalizeTechStack(config.defaultTechStack);

  url.searchParams.set("source", "admin");
  if (stack) url.searchParams.set("stack", stack);
  if (config.siteId) url.searchParams.set("siteId", config.siteId);
  if (config.baseUrl) url.searchParams.set("endpoint", config.baseUrl);

  return url.toString();
}

export function SetupPromptUI({ config }: SetupPromptProps) {
  const [copied, setCopied] = useState(false);
  const guideUrl = buildGuideUrl(config);
  const stack = normalizeTechStack(config.defaultTechStack);

  async function copyPrompt() {
    await navigator.clipboard.writeText(GENERATE_CMS_PROMPT);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="dy-mx-auto dy-max-w-5xl dy-py-6 lg:dy-py-10">
      {/* Prompt copy card */}
      <section className="dy-relative dy-overflow-hidden dy-rounded-[28px] dy-border dy-border-border dy-bg-card dy-text-card-foreground dy-shadow-2xl">
        <div className="dy-absolute dy-inset-y-0 dy-right-0 dy-w-1/3 dy-bg-primary" aria-hidden="true" />
        <div
          className="dy-absolute dy-inset-y-0 dy-right-[12%] dy-w-40 dy-skew-x-[-12deg] dy-bg-card"
          aria-hidden="true"
        />

        <div className="dy-relative dy-grid dy-min-h-[340px] dy-gap-10 dy-p-7 sm:dy-p-10 lg:dy-grid-cols-[1.35fr_0.65fr] lg:dy-p-12">
          <div className="dy-flex dy-flex-col dy-justify-between dy-gap-12">
            <div className="dy-space-y-6">
              <div className="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-full dy-border dy-border-border dy-bg-muted/60 dy-px-3 dy-py-1.5 dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-[0.14em] dy-text-muted-foreground">
                <Sparkles className="dy-h-3.5 dy-w-3.5 dy-text-primary" />
                Dyrected setup
              </div>

              <div className="dy-max-w-2xl dy-space-y-4">
                <h1 className="dy-font-serif dy-text-4xl dy-font-bold dy-leading-[0.98] dy-tracking-tight sm:dy-text-5xl lg:dy-text-6xl">
                  Copy the prompt. Paste. Done.
                </h1>
                <p className="dy-max-w-xl dy-text-base dy-leading-7 dy-text-muted-foreground sm:dy-text-lg">
                  Copy the setup prompt below and paste it into the AI builder that owns your website code. It handles the rest.
                </p>
              </div>
            </div>

            <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row sm:dy-items-center">
              <Button
                size="lg"
                className="dy-h-12 dy-bg-primary dy-px-6 dy-text-primary-foreground hover:dy-bg-primary/90"
                onClick={copyPrompt}
              >
                {copied ? (
                  <Check className="dy-h-4 dy-w-4" />
                ) : (
                  <Copy className="dy-h-4 dy-w-4" />
                )}
                {copied ? "Copied!" : "Copy setup prompt"}
              </Button>
              <Button asChild size="lg" variant="ghost" className="dy-h-12 dy-text-card-foreground hover:dy-bg-muted hover:dy-text-card-foreground">
                <a href={guideUrl} target="_blank" rel="noopener noreferrer">
                  Full guide
                  <ArrowUpRight className="dy-h-4 dy-w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="dy-relative dy-flex dy-items-end lg:dy-justify-end">
            <div className="dy-w-full dy-max-w-sm dy-rounded-2xl dy-border dy-border-border dy-bg-background/90 dy-p-5 dy-text-foreground dy-shadow-lg dy-backdrop-blur-sm">
              <div className="dy-mb-5 dy-flex dy-items-center dy-justify-between">
                <span className="dy-text-xs dy-font-bold dy-uppercase dy-tracking-[0.12em] dy-text-muted-foreground">
                  Context included
                </span>
                <Code2 className="dy-h-4 dy-w-4 dy-text-primary" />
              </div>
              <dl className="dy-space-y-4 dy-text-sm">
                <div className="dy-flex dy-items-center dy-justify-between dy-gap-4">
                  <dt className="dy-text-muted-foreground">Tech stack</dt>
                  <dd className="dy-font-mono dy-font-semibold dy-text-foreground">{stack ?? "Choose in guide"}</dd>
                </div>
                <div className="dy-flex dy-items-center dy-justify-between dy-gap-4">
                  <dt className="dy-text-muted-foreground">Site</dt>
                  <dd className="dy-max-w-[180px] dy-truncate dy-font-mono dy-font-semibold dy-text-foreground">
                    {config.siteId || "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Short guide */}
      <div className="dy-px-1 dy-pt-8">
        <h2 className="dy-mb-5 dy-text-sm dy-font-bold dy-uppercase dy-tracking-[0.12em] dy-text-muted-foreground">
          What to do next
        </h2>
        <ol className="dy-grid dy-gap-4 md:dy-grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="dy-flex dy-items-start dy-gap-4 dy-rounded-xl dy-border dy-bg-card dy-p-5"
            >
              <span className="dy-flex dy-h-7 dy-w-7 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-full dy-bg-primary/15 dy-text-xs dy-font-bold dy-tabular-nums dy-text-foreground">
                {index + 1}
              </span>
              <div className="dy-min-w-0">
                <h3 className="dy-font-semibold dy-text-card-foreground">{step.title}</h3>
                <p className="dy-mt-1 dy-text-sm dy-leading-6 dy-text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer links */}
      <div className="dy-grid dy-gap-4 dy-px-1 dy-pt-4 md:dy-grid-cols-2">
        <a
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-group dy-flex dy-items-start dy-gap-4 dy-rounded-xl dy-border dy-bg-card dy-p-5 dy-transition-colors hover:dy-border-primary/60 hover:dy-bg-primary/[0.04] focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring"
        >
          <div className="dy-rounded-lg dy-bg-primary/15 dy-p-2.5 dy-text-foreground">
            <Sparkles className="dy-h-5 dy-w-5" />
          </div>
          <div className="dy-min-w-0 dy-flex-1">
            <h2 className="dy-font-semibold dy-text-card-foreground">Need more detail?</h2>
            <p className="dy-mt-1 dy-text-sm dy-leading-6 dy-text-muted-foreground">
              The full guide walks through each decision with examples for AI-built websites.
            </p>
          </div>
          <ArrowUpRight className="dy-h-4 dy-w-4 dy-text-muted-foreground dy-transition-transform group-hover:dy-translate-x-0.5 group-hover:dy--translate-y-0.5" />
        </a>

        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-group dy-flex dy-items-start dy-gap-4 dy-rounded-xl dy-border dy-bg-card dy-p-5 dy-transition-colors hover:dy-border-foreground/30 hover:dy-bg-muted/40 focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring"
        >
          <div className="dy-rounded-lg dy-bg-muted dy-p-2.5 dy-text-foreground">
            <BookOpen className="dy-h-5 dy-w-5" />
          </div>
          <div className="dy-min-w-0 dy-flex-1">
            <h2 className="dy-font-semibold dy-text-card-foreground">Developer docs</h2>
            <p className="dy-mt-1 dy-text-sm dy-leading-6 dy-text-muted-foreground">
              SDK APIs, framework integrations, configuration, and production reference.
            </p>
          </div>
          <ArrowUpRight className="dy-h-4 dy-w-4 dy-text-muted-foreground dy-transition-transform group-hover:dy-translate-x-0.5 group-hover:dy--translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}
