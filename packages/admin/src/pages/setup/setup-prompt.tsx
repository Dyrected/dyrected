import { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { generateAIPrompt, generateFreshSetupPrompt, type SetupPromptConfig } from "@dyrected/sdk";

export type { SetupPromptConfig };

export interface SetupPromptProps {
  config: SetupPromptConfig;
}

export function SetupPromptUI({ config }: SetupPromptProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isFresh, setIsFresh] = useState(false);
  const [activeTab, setActiveTab] = useState<"next" | "nuxt" | "react" | "vue">("next");

  const promptText = isFresh 
    ? generateFreshSetupPrompt(activeTab, config)
    : generateAIPrompt(activeTab, config);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="dy-max-w-4xl dy-mx-auto dy-space-y-8 dy-py-8 dy-animate-in dy-slide-in-from-bottom-4 dy-duration-700">
      <div className="dy-text-center dy-space-y-4">
        <div className="dy-inline-flex dy-items-center dy-gap-2 dy-px-3 dy-py-1 dy-rounded-full dy-bg-primary/10 dy-text-primary dy-text-xs dy-font-bold dy-uppercase dy-tracking-wider dy-mb-2">
          <Sparkles className="dy-h-3 dy-w-3" />
          Integration Guide
        </div>
        <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight lg:dy-text-5xl dy-text-foreground">
          Connect Your Application
        </h1>
        <p className="dy-text-lg dy-text-muted-foreground dy-max-w-2xl dy-mx-auto">
          {isFresh 
            ? "Get a conversational walkthrough to set up Dyrected from scratch."
            : "Use the AI prompt below to set up your frontend automatically, or follow the steps manually."}
        </p>
      </div>

      <div className="dy-grid dy-gap-6">
        {/* Site Credentials */}
        <section className="dy-rounded-2xl dy-border dy-bg-card dy-overflow-hidden dy-shadow-xl">
          <div className="dy-p-4 dy-border-b dy-bg-muted/30">
            <h3 className="dy-text-lg dy-font-semibold dy-flex dy-items-center dy-gap-2">
              <ShieldCheck className="dy-h-5 dy-w-5 dy-text-primary" />
              Site Credentials
            </h3>
          </div>
          <div className="dy-p-4">
            <div className="dy-grid dy-gap-4 sm:dy-grid-cols-2 lg:dy-grid-cols-3">
              {[
                { label: "Site ID", value: config.siteId, id: "siteId" },
                { label: "API Key", value: config.apiKey, id: "apiKey" },
                { label: "Base URL", value: config.baseUrl, id: "baseUrl" },
              ].map((item) => (
                <div key={item.id} className="dy-space-y-2">
                  <label className="dy-text-xs dy-font-bold dy-text-muted-foreground dy-uppercase">
                    {item.label}
                  </label>
                  <div className="dy-relative dy-group">
                    <div className="dy-p-3 dy-pr-10 dy-rounded-lg dy-bg-muted dy-text-sm dy-font-mono dy-truncate dy-border dy-border-transparent dy-group-hover:dy-border-primary/20 dy-transition-all">
                      {item.value}
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value || "", item.id)}
                      className="dy-absolute dy-right-2 dy-top-1/2 dy--translate-y-1/2 dy-p-1.5 dy-rounded-md hover:dy-bg-background dy-transition-colors dy-text-muted-foreground"
                    >
                      {copied === item.id ? (
                        <Check className="dy-h-4 dy-w-4 dy-text-green-500" />
                      ) : (
                        <Copy className="dy-h-4 dy-w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Prompt */}
        <section className="dy-rounded-2xl dy-border dy-bg-white dy-overflow-hidden dy-shadow-xl dy-ring-1 dy-ring-primary/20">
          <div className="dy-p-6 dy-border-b dy-bg-primary/5 dy-flex dy-items-center dy-justify-between dy-gap-4 dy-flex-wrap">
            <div className="dy-space-y-3">
              <h3 className="dy-text-lg dy-font-semibold dy-flex dy-items-center dy-gap-2">
                <Sparkles className="dy-h-5 dy-w-5 dy-text-primary dy-animate-pulse" />
                AI Integration Prompt
              </h3>
              <div className="dy-flex dy-gap-2 dy-bg-muted/50 dy-p-1 dy-rounded-lg dy-w-fit">
                {(["next", "nuxt", "react", "vue"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "dy-px-4 dy-py-1.5 dy-rounded-md dy-text-xs dy-font-medium dy-transition-all dy-capitalize",
                      activeTab === tab
                        ? "dy-bg-background dy-text-foreground dy-shadow-sm"
                        : "dy-text-muted-foreground hover:dy-text-foreground"
                    )}
                  >
                    {tab === "next" ? "Next.js" : tab === "nuxt" ? "Nuxt.js" : tab}
                  </button>
                ))}
              </div>
              <div className="dy-flex dy-gap-2 dy-bg-muted/50 dy-p-1 dy-rounded-lg dy-w-fit">
                <button
                  onClick={() => setIsFresh(false)}
                  className={cn(
                    "dy-px-4 dy-py-1.5 dy-rounded-md dy-text-xs dy-font-medium dy-transition-all",
                    !isFresh
                      ? "dy-bg-background dy-text-foreground dy-shadow-sm"
                      : "dy-text-muted-foreground hover:dy-text-foreground"
                  )}
                >
                  Existing Project
                </button>
                <button
                  onClick={() => setIsFresh(true)}
                  className={cn(
                    "dy-px-4 dy-py-1.5 dy-rounded-md dy-text-xs dy-font-medium dy-transition-all",
                    isFresh
                      ? "dy-bg-background dy-text-foreground dy-shadow-sm"
                      : "dy-text-muted-foreground hover:dy-text-foreground"
                  )}
                >
                  Fresh Installation
                </button>
              </div>
              <p className="dy-text-sm dy-text-muted-foreground">
                Copy and paste this into your AI developer to handle everything automatically
              </p>
            </div>
            <Button
              onClick={() => copyToClipboard(promptText, "ai-developer")}
              className="dy-relative dy-overflow-hidden dy-group dy-shrink-0"
            >
              <div className="dy-flex dy-items-center dy-gap-2">
                {copied === "ai-developer" ? (
                  <Check className="dy-h-4 dy-w-4" />
                ) : (
                  <Copy className="dy-h-4 dy-w-4" />
                )}
                {copied === "ai-developer" ? "Copied!" : "Copy Full Prompt"}
              </div>
            </Button>
          </div>
          <div className="dy-p-6 dy-bg-slate-950 dy-text-slate-300 dy-font-mono dy-text-xs dy-leading-relaxed dy-max-h-[400px] dy-overflow-y-auto dy-scrollbar-thin dy-scrollbar-thumb-white/10">
            <pre className="dy-whitespace-pre-wrap">{promptText}</pre>
          </div>
        </section>
      </div>

      <div className="dy-flex dy-justify-center dy-gap-4 dy-pt-4">
        <Button variant="outline" asChild>
          <a
            href={`${config.baseUrl}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="dy-flex dy-items-center dy-gap-2"
          >
            <Terminal className="dy-h-4 dy-w-4" />
            API Documentation
            <ExternalLink className="dy-h-3 dy-w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
