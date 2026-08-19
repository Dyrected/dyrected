import type { Field } from "./schema-core.js";

/** Column span in the 12-column Detail View layout grid (1 to 12). */
export type DetailSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Visual display variants supported by DetailFieldRenderer.
 */
export type DisplayVariant =
  | "text"
  | "badge"
  | "code-badge"
  | "code"
  | "copyable"
  | "link"
  | "url"
  | "email"
  | "phone"
  | "currency"
  | "percent"
  | "progress"
  | "star"
  | "star-rating"
  | "boolean"
  | "date"
  | "datetime"
  | "time"
  | "relative"
  | "image"
  | "avatar"
  | "color"
  | "color-swatches"
  | "icon"
  | "key-value"
  | "table"
  | "tags"
  | "badges"
  | "json";

/**
 * Configuration options for rendering a field in a Detail View.
 */
export interface DisplayFieldOptions {
  /** Custom label overriding the field's schema label. */
  label?: string;
  /** When true, hides the field label entirely and renders only the value. */
  hideLabel?: boolean;
  /** Informational tooltip shown next to the label. */
  tooltip?: string;
  /** Grid column span across the 12-column grid. */
  span?: DetailSpan;
  /** Specific visual representation variant (e.g. 'badge', 'currency', 'star', 'copyable'). */
  display?: DisplayVariant;
  /** Preset format for numbers, dates, and currencies ('currency', 'date', 'datetime', 'relative', 'number', 'percent'). */
  format?: "currency" | "date" | "datetime" | "relative" | "number" | "percent" | string;
  /** ISO currency code (e.g. 'USD', 'EUR') when display or format is 'currency'. */
  currency?: string;
  /** Color mapping for badge and tag values (named palette, hex color, Tailwind class, or wildcard). */
  badgeColors?: Record<string, string>;
  /** Column header for object keys when display is 'key-value'. */
  keyLabel?: string;
  /** Column header for object values when display is 'key-value'. */
  valueLabel?: string;
  /** Custom placeholder text when the field value is null, undefined, or empty. */
  emptyText?: string;
  /** When true, hides this entire field item if the value is null or empty. */
  hideIfEmpty?: boolean;
  /**
   * When true, allows inline editing of this field in the Detail View
   * via an interactive toggle.
   */
  editable?: boolean;
  /**
   * Visibility condition for this field item.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   * When false or evaluating to falsy, this item is hidden in the Detail View.
   *
   * @example `visible: "doc.status == 'published'"`
   * @example `visible: false`
   */
  visible?: string | boolean;
}

/**
 * Declared field item in a Detail View.
 */
export interface DetailField {
  /** Identifies this item as a field. */
  type: "field";
  /** Field name or nested path in the document. */
  field: string;
  /** Display options for this field. */
  options?: DisplayFieldOptions;
}

/**
 * Configuration options for a Detail View section container.
 */
export interface DetailSectionOptions {
  /** Lucide icon name displayed in the section header. */
  icon?: string;
  /** Status or counter badge displayed beside the section title. */
  badge?: string;
  /** Color palette name or hex code for the section badge. */
  badgeColor?: string;
  /** Subtitle description displayed beneath the section title. */
  description?: string;
  /** Grid width of the section on the main 12-column layout. */
  span?: DetailSpan;
  /** Internal grid column count for child items. */
  columns?: number;
  /** When true, allows editors to collapse and expand the section. */
  collapsible?: boolean;
  /** Starts the section in collapsed state when collapsible is enabled. */
  collapsedByDefault?: boolean;
  /**
   * Visibility condition for this section.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   *
   * @example `visible: "user.roles != null and 'admin' in user.roles"`
   */
  visible?: string | boolean;
}

/**
 * Section container grouping fields and components in a Detail View.
 */
export interface DetailSection {
  /** Identifies this item as a section. */
  type: "section";
  /** Section heading title. */
  title: string;
  /** Child items rendered inside this section. */
  items: DetailItem[];
  /** Section container options. */
  options?: DetailSectionOptions;
}

/**
 * Configuration options for an individual tab in `displayTabs()`.
 */
export interface DetailTabOptions {
  /** Lucide icon name displayed inside the tab trigger. */
  icon?: string;
  /** Counter or status badge rendered next to the tab label. */
  badge?: string;
  /** Color palette name or hex code for the tab badge. */
  badgeColor?: string;
  /**
   * Visibility condition for this individual tab.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

/**
 * Single tab entry inside a tabbed container.
 */
export interface DetailTab {
  /** Identifies this item as a tab. */
  type: "tab";
  /** Tab label shown in the tab bar. */
  label: string;
  /** Child items rendered when this tab is active. */
  items: DetailItem[];
  /** Tab options. */
  options?: DetailTabOptions;
}

/**
 * Configuration options for a tabbed container.
 */
export interface DetailTabsOptions {
  /** Grid width of the tabs container on the main layout. */
  span?: DetailSpan;
  /** Label of the tab that should be active on initial render. */
  defaultTab?: string;
  /**
   * Visibility condition for this tab container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

/**
 * Tabbed navigation container in a Detail View layout.
 */
export interface DetailTabs {
  /** Identifies this item as a tab container. */
  type: "tabs";
  /** List of tabs in this container. */
  tabs: DetailTab[];
  /** Tab container options. */
  options?: DetailTabsOptions;
}

/**
 * Configuration options for a sub-grid container.
 */
export interface DetailGridOptions {
  /** Grid width of the sub-grid container in the surrounding layout. */
  span?: DetailSpan;
  /**
   * Visibility condition for this grid container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

/**
 * Multi-column sub-grid layout inside a section or tab.
 */
export interface DetailGrid {
  /** Identifies this item as a grid. */
  type: "grid";
  /** Number of balanced columns in this grid. */
  columns: number;
  /** Child items rendered across the grid columns. */
  items: DetailItem[];
  /** Grid container options. */
  options?: DetailGridOptions;
}

/**
 * Configuration options for a repeated array field.
 */
export interface DetailRepeatOptions {
  /** Layout style for repeated items: 'table', 'cards', or 'list'. */
  layout?: "table" | "cards" | "list";
  /** Message shown when the repeated array is empty. */
  emptyText?: string;
  /** Grid width of the repeated container. */
  span?: DetailSpan;
  /**
   * Visibility condition for this repeat container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  /** Field name in each row to use as the card header title (e.g. 'title', 'key', 'name'). */
  useAsTitle?: string;
  /** Field name in each row to use as the card header title (alias for useAsTitle). */
  titleField?: string;
  /** Static card title prefix or template (e.g. 'Category' or 'Card #{index}'). */
  title?: string;
  /** Optional icon name for card header. */
  icon?: string;
  /** Number of grid columns for cards layout (1, 2, 3, or 4; defaults to 3). */
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Delegated repeated array field item in a Detail View.
 */
export interface DetailRepeat {
  /** Identifies this item as a repeat container. */
  type: "repeat";
  /** Array field name in the document. */
  field: string;
  /** Item template schemas rendered for each element in the array. */
  items: DetailItem[];
  /** Repeat options. */
  options?: DetailRepeatOptions;
}

/**
 * Async or synchronous handler function calculating a computed metric.
 */
export type ComputedHandler<TDoc = any> = (context: { doc: TDoc; user?: any; db?: any }) => any | Promise<any>;

/**
 * Configuration options for a computed value card.
 */
export interface DetailComputedOptions<TDoc = any> {
  /** Unique identifier for the computed metric. */
  id?: string;
  /** JEXL expression string evaluated against `{ doc, user }`. */
  expression?: string;
  /** Async or sync function receiving `{ doc, user, db }` returning the computed value. */
  handler?: ComputedHandler<TDoc>;
  /** Grid width for the computed card. */
  span?: DetailSpan;
  /** Formatting preset for the computed value ('currency', 'percent', 'number', 'date'). */
  format?: string;
  /** Currency code when format is 'currency'. */
  currency?: string;
  /**
   * Visibility condition for this computed card.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

/**
 * Computed KPI or metric card in a Detail View.
 */
export interface DetailComputed<TDoc = any> {
  /** Identifies this item as a computed value. */
  type: "computed";
  /** Unique computed identifier. */
  id?: string;
  /** Human-readable card label. */
  label: string;
  /** JEXL evaluation string. */
  expression?: string;
  /** Computed function handler. */
  handler?: ComputedHandler<TDoc>;
  /** Computed options. */
  options?: DetailComputedOptions<TDoc>;
}

/**
 * Configuration options for a horizontal divider line.
 */
export interface DetailDividerOptions {
  /** Grid span in the surrounding layout. */
  span?: DetailSpan;
  /**
   * Visibility condition for this divider.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  /** Vertical margin spacing around the divider line. */
  spacing?: "sm" | "md" | "lg" | "none";
}

/**
 * Horizontal divider line in a Detail View layout.
 */
export interface DetailDivider {
  /** Identifies this item as a divider. */
  type: "divider";
  /** Divider options. */
  options?: DetailDividerOptions;
}

/**
 * Configuration options for a static text or callout block.
 */
export interface DetailTextOptions {
  /** Grid width in the 12-column layout. */
  span?: DetailSpan;
  /**
   * Visibility condition for this text block.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  /** Typography and alert styling variant ('body', 'heading', 'subheading', 'muted', 'caption', 'callout', 'info', 'warning'). */
  variant?: "body" | "heading" | "subheading" | "muted" | "caption" | "callout" | "info" | "warning";
  /** Custom CSS or Tailwind classes applied to the text wrapper. */
  className?: string;
}

/**
 * Static text, heading, callout, or notice block in a Detail View.
 */
export interface DetailText {
  /** Identifies this item as a text block. */
  type: "text";
  /** Text or markdown content. */
  content: string;
  /** Text options. */
  options?: DetailTextOptions;
}

/**
 * Configuration options for a custom React component slot.
 */
export interface DetailCustomOptions<TDoc = any> {
  /** Grid span in the 12-column layout. */
  span?: DetailSpan;
  /**
   * Visibility condition for this custom component.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  /** Static or initial props passed into the custom component. */
  props?: Record<string, any>;
  /** Inline render function receiving `{ doc, user }` (Self-hosted React runtimes). */
  render?: (context: { doc: TDoc; user?: any; [key: string]: any }) => any;
}

/**
 * Custom React component slot mounted in a Detail View.
 */
export interface DetailCustom<TDoc = any> {
  /** Identifies this item as a custom component. */
  type: "custom";
  /** Registered custom component name. */
  name: string;
  /** Custom component options. */
  options?: DetailCustomOptions<TDoc>;
}

/**
 * Union of all valid item types in a Detail View schema.
 */
export type DetailItem<TDoc = any> =
  | DetailSection
  | DetailTabs
  | DetailGrid
  | DetailField
  | DetailRepeat
  | DetailComputed<TDoc>
  | DetailDivider
  | DetailText
  | DetailCustom<TDoc>
  | string;

/**
 * Detail View layout schema definition for a collection or global.
 */
export type DetailSchema<TDoc = any> = DetailItem<TDoc>[];
