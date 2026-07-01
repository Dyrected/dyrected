import { useState, useEffect } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { buildGuideUrl, buildPrompt } from "./utils";

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

const DOCS_URL = "https://docs.dyrected.com";

const steps = [
  "Paste the prompt into your AI builder — the same one that owns the website code.",
  "Review the content list the AI sends back. Correct anything missing or wrong, then say \"approved\".",
  "Your Dyrected credentials are already in the prompt. Give them to the AI when it asks at Stage 4.",
  "Test one real edit in Dyrected. If the change appears on the website, invite the client.",
];

const stepsNoCredentials = [
  "Paste the prompt into your AI builder — the same one that owns the website code.",
  "Review the content list the AI sends back. Correct anything missing or wrong, then say \"approved\".",
  "When the AI reaches Stage 4, it will ask for your Site ID, Site API key, and Base URL.",
  "Test one real edit in Dyrected. If the change appears on the website, invite the client.",
];

export function SetupPromptUI({ config }: SetupPromptProps) {
  const [copied, setCopied] = useState(false);
  const guideUrl = buildGuideUrl(config);
  const hasCredentials = !!(config.siteId && config.apiKey && config.baseUrl);
  const guideSteps = hasCredentials ? steps : stepsNoCredentials;
  const promptText = buildPrompt(config);

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const currentVersion = (import.meta.env as Record<string, string | undefined>).DYRECTED_VERSION || "0.0.0";
  const [latestVersion, setLatestVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dyrected_latest_release");
  });

  useEffect(() => {
    if (!latestVersion) {
      fetch("https://registry.npmjs.org/@dyrected/core/latest")
        .then((r) => r.json())
        .then((data) => {
          if (data?.version) {
            setLatestVersion(data.version);
            localStorage.setItem("dyrected_latest_release", data.version);
            localStorage.setItem("dyrected_latest_release_timestamp", String(Date.now()));
          }
        })
        .catch(() => {});
    }
  }, [latestVersion]);

  const hasUpdate = latestVersion && latestVersion !== currentVersion && (() => {
    const lParts = latestVersion.split(".").map(Number);
    const cParts = currentVersion.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  })();

  return (
    <div className="dy-mx-auto dy-max-w-3xl dy-space-y-10 dy-px-4 dy-py-8">
      {/* Version and Updates */}
      <div className="dy-rounded-xl dy-border dy-border-border dy-bg-muted/30 dy-p-5 dy-space-y-3">
        <h2 className="dy-text-sm dy-font-semibold dy-text-foreground">
          System Info & Updates
        </h2>
        <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center dy-justify-between dy-gap-4 dy-text-xs">
          <div className="dy-space-y-1">
            <p className="dy-text-muted-foreground">
              Current version: <span className="dy-font-mono dy-font-semibold dy-text-foreground">v{currentVersion}</span>
            </p>
            {latestVersion && (
              <p className="dy-text-muted-foreground">
                Latest release: <span className="dy-font-mono dy-font-semibold dy-text-foreground">v{latestVersion}</span>
              </p>
            )}
          </div>

          {hasUpdate ? (
            <div className="dy-flex dy-flex-col dy-items-start sm:dy-items-end dy-gap-1.5">
              <div className="dy-flex dy-items-center dy-gap-2">
                <span className="dy-inline-flex dy-items-center dy-gap-1 dy-rounded-full dy-bg-primary/10 dy-px-2.5 dy-py-0.5 dy-text-[11px] dy-font-medium dy-text-primary">
                  Update available!
                </span>
                <a
                  href="https://github.com/Dyrected/dyrected/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dy-inline-flex dy-items-center dy-gap-1 dy-text-[11px] dy-text-primary dy-underline-offset-4 hover:dy-underline"
                >
                  View changelog
                  <ArrowUpRight className="dy-h-3 dy-w-3" />
                </a>
              </div>
              <p className="dy-text-muted-foreground">
                Run <code className="dy-bg-black/5 dark:dy-bg-white/5 dy-px-1 dy-py-0.5 dy-rounded dy-font-mono">npx dyrected upgrade</code> to update.
              </p>
            </div>
          ) : (
            <span className="dy-inline-flex dy-items-center dy-gap-1 dy-rounded-full dy-bg-green-500/10 dy-px-2.5 dy-py-0.5 dy-text-[11px] dy-font-medium dy-text-green-600 dark:dy-text-green-400">
              Up to date
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="dy-space-y-2">
        <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight dy-text-foreground">
          Set up Dyrected
        </h1>
        <p className="dy-text-sm dy-leading-6 dy-text-muted-foreground">
          Copy the prompt below and paste it into your AI builder. It handles the setup in stages.
        </p>
      </div>

      {/* Steps */}
      <ol className="dy-space-y-3">
        {guideSteps.map((step, index) => (
          <li key={index} className="dy-flex dy-gap-3 dy-text-sm">
            <span className="dy-flex dy-h-6 dy-w-6 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-full dy-bg-muted dy-text-xs dy-font-semibold dy-tabular-nums dy-text-foreground">
              {index + 1}
            </span>
            <span className="dy-leading-6 dy-text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>

      {/* Prompt card */}
      <div className="dy-overflow-hidden dy-rounded-xl dy-border dy-border-border dy-bg-card">
        {/* Bar */}
        <div className="dy-flex dy-items-center dy-justify-between dy-gap-4 dy-border-b dy-border-border dy-px-4 dy-py-3">
          <div>
            <p className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-[0.12em] dy-text-muted-foreground">
              Dyrected setup prompt
            </p>
            {hasCredentials && (
              <p className="dy-mt-0.5 dy-text-xs dy-text-muted-foreground">
                Credentials pre-filled for {config.siteName || config.siteId}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="dy-inline-flex dy-items-center dy-gap-1.5 dy-rounded-lg dy-border dy-border-border dy-bg-background dy-px-3 dy-py-1.5 dy-text-xs dy-font-semibold dy-text-foreground dy-transition-colors hover:dy-bg-muted"
          >
            {copied ? (
              <Check className="dy-h-3.5 dy-w-3.5 dy-text-primary" />
            ) : (
              <Copy className="dy-h-3.5 dy-w-3.5" />
            )}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>

        {/* Prompt text */}
        <pre className="dy-max-h-64 dy-overflow-y-auto dy-p-4 dy-text-[11px] dy-leading-5 dy-text-muted-foreground">
          <code>{promptText}</code>
        </pre>

        {/* Footer note */}
        <div className="dy-border-t dy-border-border dy-px-4 dy-py-3">
          <p className="dy-text-xs dy-text-muted-foreground">
            Paste this into the AI builder or code agent that can edit the website code.
            {!hasCredentials && " The prompt will ask for your Dyrected details at the right stage."}
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="dy-flex dy-flex-col dy-gap-2 sm:dy-flex-row">
        <a
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-muted-foreground dy-underline-offset-4 hover:dy-text-foreground hover:dy-underline"
        >
          Full guide
          <ArrowUpRight className="dy-h-3.5 dy-w-3.5" />
        </a>
        <span className="dy-hidden dy-text-muted-foreground sm:dy-inline" aria-hidden="true">·</span>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-sm dy-text-muted-foreground dy-underline-offset-4 hover:dy-text-foreground hover:dy-underline"
        >
          Developer docs
          <ArrowUpRight className="dy-h-3.5 dy-w-3.5" />
        </a>
      </div>
    </div>
  );
}
