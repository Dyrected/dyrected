import type { CSSProperties } from "react";

export const WORKFLOW_BADGE_COLORS: Record<string, string> = {
  success:
    "dy-bg-green-100 dy-text-green-700 dy-border-green-200 dark:dy-bg-green-600 dark:dy-text-green-300 dark:dy-border-green-500/30",
  warning:
    "dy-bg-amber-100 dy-text-amber-700 dy-border-amber-200 dark:dy-bg-amber-600 dark:dy-text-amber-300 dark:dy-border-amber-500/30",
  danger:
    "dy-bg-red-100 dy-text-red-700 dy-border-red-200 dark:dy-bg-red-600 dark:dy-text-red-300 dark:dy-border-red-500/30",
  info: "dy-bg-blue-100 dy-text-blue-700 dy-border-blue-200 dark:dy-bg-blue-600 dark:dy-text-blue-300 dark:dy-border-blue-500/30",
  neutral:
    "dy-bg-muted dy-text-muted-foreground dy-border-border dark:dy-bg-muted/60 dark:dy-text-foreground/80 dark:dy-border-border/80",
};

export function getWorkflowBadgePresentation(color?: string): {
  className: string;
  style?: CSSProperties;
} {
  if (!color) {
    return {
      className: WORKFLOW_BADGE_COLORS.neutral,
      style: undefined,
    };
  }

  const preset = WORKFLOW_BADGE_COLORS[color];
  if (preset) {
    return {
      className: preset,
      style: undefined,
    };
  }

  return {
    className: "",
    style: {
      color,
      borderColor: `color-mix(in srgb, ${color} 32%, white)`,
      backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
    },
  };
}
