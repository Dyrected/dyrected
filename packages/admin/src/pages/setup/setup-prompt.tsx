import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
  const guideUrl = buildGuideUrl(config);
  const stack = normalizeTechStack(config.defaultTechStack);

  return (
    <div className="dy-mx-auto dy-max-w-5xl dy-py-6 lg:dy-py-10">
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
                  Let the guide do the heavy lifting.
                </h1>
                <p className="dy-max-w-xl dy-text-base dy-leading-7 dy-text-muted-foreground sm:dy-text-lg">
                  Get a guided path tailored to your project, whether you are building with an AI coding tool or wiring up the SDK yourself.
                </p>
              </div>
            </div>

            <div className="dy-flex dy-flex-col dy-gap-3 sm:dy-flex-row sm:dy-items-center">
              <Button asChild size="lg" className="dy-h-12 dy-bg-primary dy-px-6 dy-text-primary-foreground hover:dy-bg-primary/90">
                <a href={guideUrl} target="_blank" rel="noopener noreferrer">
                  <Compass className="dy-h-4 dy-w-4" />
                  Open guided setup
                  <ArrowUpRight className="dy-h-4 dy-w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost" className="dy-h-12 dy-text-card-foreground hover:dy-bg-muted hover:dy-text-card-foreground">
                <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="dy-h-4 dy-w-4" />
                  Browse developer docs
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
              <div className="dy-mt-5 dy-flex dy-items-start dy-gap-2 dy-border-t dy-border-border dy-pt-4 dy-text-xs dy-leading-5 dy-text-muted-foreground">
                <ShieldCheck className="dy-mt-0.5 dy-h-4 dy-w-4 dy-shrink-0 dy-text-primary" />
                API keys and authentication tokens never leave this admin page.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="dy-grid dy-gap-4 dy-px-1 dy-pt-5 md:dy-grid-cols-2">
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
            <h2 className="dy-font-semibold dy-text-card-foreground">Building with AI?</h2>
            <p className="dy-mt-1 dy-text-sm dy-leading-6 dy-text-muted-foreground">
              The guide gives your coding agent the right context and walks you through each decision.
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
            <h2 className="dy-font-semibold dy-text-card-foreground">Need implementation detail?</h2>
            <p className="dy-mt-1 dy-text-sm dy-leading-6 dy-text-muted-foreground">
              Use the docs for SDK APIs, framework integrations, configuration, and production reference.
            </p>
          </div>
          <ArrowUpRight className="dy-h-4 dy-w-4 dy-text-muted-foreground dy-transition-transform group-hover:dy-translate-x-0.5 group-hover:dy--translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}
