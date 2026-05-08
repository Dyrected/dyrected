import React, { useMemo } from "react";
import { useDyrected } from "../../providers/dyrected-provider";

/**
 * Converts various color formats to the raw HSL string (H S L) 
 * expected by our CSS variables.
 */
function toRawHsl(color: string): string {
  if (!color) return "239 84% 67%"; // Default blue
  
  // Simple hex to HSL conversion (v1)
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
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; 
    } else {
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

  // Handle some common names or pass-through raw HSL
  const named: Record<string, string> = {
    "green": "142 76% 36%",
    "blue": "217 91% 60%",
    "red": "0 84% 60%",
    "purple": "262 83% 58%",
    "orange": "24 95% 53%",
  };

  return named[color.toLowerCase()] || color;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { schemas } = useDyrected();
  const branding = schemas?.admin?.branding;

  const styleTag = useMemo(() => {
    if (!branding?.primaryColor) return null;
    const hsl = toRawHsl(branding.primaryColor);
    
    return (
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-ui {
          --primary: ${hsl};
          --sidebar-primary: ${hsl};
          --sidebar-accent-foreground: ${hsl};
          --sidebar-ring: ${hsl};
          --ring: ${hsl} / 0.1;
        }
      `}} />
    );
  }, [branding?.primaryColor]);

  return (
    <>
      {styleTag}
      {children}
    </>
  );
}
