export interface SetupPromptConfig {
    siteName?: string;
    siteId?: string;
    apiKey?: string;
    baseUrl?: string;
    isSelfHosted?: boolean;
}
export declare function generateAIPrompt(activeTab: "next" | "nuxt" | "react" | "vue", config: SetupPromptConfig): string;
