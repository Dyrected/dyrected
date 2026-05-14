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
import { generateAIPrompt, generateFreshSetupPrompt, type SetupPromptConfig } from "@dyrected/core";

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
    <div className="max-w-4xl mx-auto space-y-8 py-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3 w-3" />
          Integration Guide
        </div>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-5xl text-foreground">
          Connect Your Application
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {isFresh 
            ? "Get a conversational walkthrough to set up Dyrected from scratch."
            : "Use the AI prompt below to set up your frontend automatically, or follow the steps manually."}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Site Credentials */}
        <section className="rounded-2xl border bg-card overflow-hidden shadow-xl">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Site Credentials
            </h3>
          </div>
          <div className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Site ID", value: config.siteId, id: "siteId" },
                { label: "API Key", value: config.apiKey, id: "apiKey" },
                { label: "Base URL", value: config.baseUrl, id: "baseUrl" },
              ].map((item) => (
                <div key={item.id} className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    {item.label}
                  </label>
                  <div className="relative group">
                    <div className="p-3 pr-10 rounded-lg bg-muted text-sm font-mono truncate border border-transparent group-hover:border-primary/20 transition-all">
                      {item.value}
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value || "", item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground"
                    >
                      {copied === item.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Prompt */}
        <section className="rounded-2xl border bg-white overflow-hidden shadow-xl ring-1 ring-primary/20">
          <div className="p-6 border-b bg-primary/5 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                AI Integration Prompt
              </h3>
              <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                {(["next", "nuxt", "react", "vue"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                      activeTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "next" ? "Next.js" : tab === "nuxt" ? "Nuxt.js" : tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setIsFresh(false)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                    !isFresh
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Existing Project
                </button>
                <button
                  onClick={() => setIsFresh(true)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                    isFresh
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Fresh Installation
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Copy and paste this into your AI developer to handle everything automatically
              </p>
            </div>
            <Button
              onClick={() => copyToClipboard(promptText, "ai-developer")}
              className="relative overflow-hidden group shrink-0"
            >
              <div className="flex items-center gap-2">
                {copied === "ai-developer" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied === "ai-developer" ? "Copied!" : "Copy Full Prompt"}
              </div>
            </Button>
          </div>
          <div className="p-6 bg-slate-950 text-slate-300 font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <pre className="whitespace-pre-wrap">{promptText}</pre>
          </div>
        </section>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" asChild>
          <a
            href={`${config.baseUrl}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Terminal className="h-4 w-4" />
            API Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
