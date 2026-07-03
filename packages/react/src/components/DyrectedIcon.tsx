import React from 'react';
import { icons, type LucideProps } from 'lucide-react';
import type { AdminIconName } from '@dyrected/core';

export interface DyrectedIconProps extends Omit<LucideProps, 'name'> {
  /**
   * The value of an `icon` field — a Lucide icon name such as
   * `"ChartNoAxesCombined"` or `"BellRing"`.
   */
  name: AdminIconName | (string & {}) | null | undefined;
  /**
   * Icon name to render when `name` is missing or not a known icon.
   * Renders nothing when omitted and `name` cannot be resolved.
   */
  fallback?: AdminIconName;
}

const iconMap = icons as Record<string, React.ComponentType<LucideProps>>;

/**
 * Renders a Dyrected `icon` field value as a Lucide icon.
 *
 * The `icon` field type stores the *name* of a Lucide icon (not SVG markup),
 * so pass that value straight through:
 *
 * ```tsx
 * <DyrectedIcon name={feature.icon} className="w-6 h-6" />
 * ```
 *
 * Standard Lucide props (`size`, `color`, `strokeWidth`, `className`, …) are
 * forwarded to the underlying icon.
 */
export function DyrectedIcon({ name, fallback, ...props }: DyrectedIconProps) {
  const Icon =
    (typeof name === 'string' ? iconMap[name] : undefined) ??
    (fallback ? iconMap[fallback] : undefined);

  if (!Icon) return null;

  return <Icon {...props} />;
}
