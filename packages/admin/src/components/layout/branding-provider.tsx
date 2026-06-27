import React, { useMemo } from "react";
import { useDyrected } from "../../providers/dyrected-context";

/**
 * Converts a color value (hex, named, or raw HSL string) to the raw HSL
 * triplet expected by our CSS variables, e.g. "38 92% 50%".
 */
function toRawHsl(color: string): string {
  if (!color) return "81 100% 59%"; // Signal Lime

  if (color.startsWith("#")) {
    let r = 0, g = 0, b = 0;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else if (color.length === 7) {
      r = parseInt(color.substring(1, 3), 16);
      g = parseInt(color.substring(3, 5), 16);
      b = parseInt(color.substring(5, 7), 16);
    }

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  const named: Record<string, string> = {
    amber:  "38 92% 50%",
    lime:   "81 100% 59%",
    violet: "259 100% 62%",
    green:  "142 76% 36%",
    blue:   "217 91% 60%",
    red:    "0 84% 60%",
    purple: "262 83% 58%",
    orange: "24 95% 53%",
  };

  return named[color.toLowerCase()] || color;
}

/**
 * Determines the best foreground color for text rendered on top of a given
 * primary background. Warm, saturated colours (yellows, ambers) are
 * perceptually bright even at moderate lightness and need dark text.
 */
function primaryForeground(hsl: string): string {
  const parts = hsl.split(" ");
  if (parts.length < 3) return "60 3% 6%";

  const hue = parseFloat(parts[0]);
  const saturation = parseFloat(parts[1]);
  const lightness = parseFloat(parts[2]);

  // Warm saturated colours (yellow → lime, hue 20–150°) at moderate lightness
  // are visually bright and need the dark near-black foreground.
  const isWarmBright =
    saturation > 50 &&
    lightness > 38 &&
    hue >= 20 &&
    hue <= 150;

  if (isWarmBright) return "60 3% 6%";  // warm near-black

  // Cool dark colours need white text; very pale tints need dark text.
  return lightness < 55 ? "0 0% 100%" : "60 3% 6%";
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { schemas } = useDyrected();
  const branding = schemas?.admin?.branding;

  const styleTag = useMemo(() => {
    const hasCustomPrimary = Boolean(branding?.primaryColor);
    const primaryHsl = toRawHsl(branding?.primaryColor || "#B6FF2E");
    const intelligenceHsl = hasCustomPrimary ? primaryHsl : "259 100% 62%";
    const fg = primaryForeground(primaryHsl);

    return (
      <style dangerouslySetInnerHTML={{ __html: `
        .dy-admin-ui {
          --primary: ${primaryHsl};
          --primary-foreground: ${fg};
          --intelligence: ${intelligenceHsl};
          --accent-foreground: ${intelligenceHsl};
          --sidebar-primary: ${primaryHsl};
          --sidebar-primary-foreground: ${fg};
          --sidebar-accent-foreground: ${intelligenceHsl};
          --sidebar-ring: ${intelligenceHsl};
          --ring: ${intelligenceHsl} / 0.24;
          ${branding?.fontSans ? `--font-sans: ${branding.fontSans};` : ""}
          ${branding?.fontSerif ? `--font-serif: ${branding.fontSerif};` : ""}
        }
      `}} />
    );
  }, [branding?.primaryColor, branding?.fontSans, branding?.fontSerif]);

  return (
    <>
      {styleTag}
      {children}
    </>
  );
}
