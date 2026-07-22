import type { AdminConfig } from "@dyrected/core"

type ThemeScale = Record<string, string>

const fontSans = '"Geist", ui-sans-serif, system-ui, sans-serif'
const fontSerif = '"Fraunces", ui-serif, Georgia, serif'

const lightTokens: ThemeScale = {
  background: "77.14 100% 98.97%",
  foreground: "60 3% 6%",
  card: "0 0% 100%",
  "card-foreground": "60 3% 6%",
  popover: "0 0% 100%",
  "popover-foreground": "60 3% 6%",
  primary: "81 100% 59%",
  "primary-foreground": "60 3% 6%",
  intelligence: "259 100% 62%",
  "intelligence-foreground": "0 0% 100%",
  secondary: "259 100% 96%",
  "secondary-foreground": "60 3% 6%",
  muted: "81 100% 93%",
  "muted-foreground": "254 6% 40%",
  accent: "259 100% 96%",
  "accent-foreground": "259 100% 62%",
  destructive: "0 84% 60%",
  "destructive-foreground": "0 0% 100%",
  border: "256 51% 90%",
  input: "256 51% 90%",
  ring: "259 100% 62%",
  radius: "0.5rem",
}

const darkTokens: ThemeScale = {
  background: "240 10% 4%",
  foreground: "78 38% 95%",
  card: "240 8% 7%",
  "card-foreground": "78 38% 95%",
  popover: "240 8% 7%",
  "popover-foreground": "78 38% 95%",
  primary: "81 100% 59%",
  "primary-foreground": "60 3% 6%",
  intelligence: "259 100% 70%",
  "intelligence-foreground": "0 0% 100%",
  secondary: "259 45% 15%",
  "secondary-foreground": "266 82% 92%",
  muted: "240 7% 13%",
  "muted-foreground": "252 9% 68%",
  accent: "259 44% 16%",
  "accent-foreground": "266 82% 88%",
  destructive: "0 72% 58%",
  "destructive-foreground": "0 0% 100%",
  border: "256 20% 21%",
  input: "256 20% 21%",
  ring: "259 100% 70%",
}

function toCssVariables(tokens: ThemeScale): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n")
}

export const exampleSaasTheme = {
  fonts: {
    sans: fontSans,
    serif: fontSerif,
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Geist:wght@400;500;600;700&display=swap",
  },
  tokens: {
    light: lightTokens,
    dark: darkTokens,
  },
  adminBranding: {
    logoText: "SnackTrack CMS",
    primaryColor: lightTokens.primary,
    accentColor: lightTokens.intelligence,
    fontSans,
    fontSerif,
  } satisfies NonNullable<AdminConfig["branding"]>,
}

export const exampleSaasThemeCss = `
:root {
${toCssVariables(exampleSaasTheme.tokens.light)}
  --font-sans: ${exampleSaasTheme.fonts.sans};
  --font-serif: ${exampleSaasTheme.fonts.serif};
}

.dark {
${toCssVariables(exampleSaasTheme.tokens.dark)}
}

html {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-sans);
  scroll-behavior: smooth;
  color-scheme: light;
  transition: background-color 0.2s ease, color 0.2s ease;
}

html.dark {
  color-scheme: dark;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  letter-spacing: 0;
}
`.trim()
