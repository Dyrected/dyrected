import type { Field } from "./schema-core.js";
export type DetailSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

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

export interface DisplayFieldOptions {
  label?: string;
  hideLabel?: boolean;
  tooltip?: string;
  span?: DetailSpan;
  display?: DisplayVariant;
  format?: "currency" | "date" | "datetime" | "relative" | "number" | "percent" | string;
  currency?: string;
  badgeColors?: Record<string, string>;
  keyLabel?: string;
  valueLabel?: string;
  emptyText?: string;
  hideIfEmpty?: boolean;
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

export interface DetailField {
  type: "field";
  field: string;
  options?: DisplayFieldOptions;
}

export interface DetailSectionOptions {
  icon?: string;
  description?: string;
  span?: DetailSpan;
  columns?: number;
  collapsible?: boolean;
  collapsedByDefault?: boolean;
  /**
   * Visibility condition for this section.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   *
   * @example `visible: "user.roles != null and 'admin' in user.roles"`
   */
  visible?: string | boolean;
}

export interface DetailSection {
  type: "section";
  title: string;
  items: DetailItem[];
  options?: DetailSectionOptions;
}

export interface DetailTabOptions {
  icon?: string;
  badge?: string;
  badgeColor?: string;
  /**
   * Visibility condition for this individual tab.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

export interface DetailTab {
  type: "tab";
  label: string;
  items: DetailItem[];
  options?: DetailTabOptions;
}

export interface DetailTabsOptions {
  span?: DetailSpan;
  defaultTab?: string;
  /**
   * Visibility condition for this tab container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

export interface DetailTabs {
  type: "tabs";
  tabs: DetailTab[];
  options?: DetailTabsOptions;
}

export interface DetailGridOptions {
  span?: DetailSpan;
  /**
   * Visibility condition for this grid container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

export interface DetailGrid {
  type: "grid";
  columns: number;
  items: DetailItem[];
  options?: DetailGridOptions;
}

export interface DetailRepeatOptions {
  layout?: "table" | "cards" | "list";
  emptyText?: string;
  span?: DetailSpan;
  /**
   * Visibility condition for this repeat container.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  /** Field name in each row to use as the card header title (e.g. 'title', 'key', 'name') */
  useAsTitle?: string;
  /** Field name in each row to use as the card header title (alias for useAsTitle) */
  titleField?: string;
  /** Static card title prefix or template (e.g. 'Category' or 'Card #{index}') */
  title?: string;
  /** Optional icon name for card header */
  icon?: string;
  /** Number of grid columns for cards layout (1, 2, 3, or 4; defaults to 3) */
  columns?: 1 | 2 | 3 | 4;
}

export interface DetailRepeat {
  type: "repeat";
  field: string;
  items: DetailItem[];
  options?: DetailRepeatOptions;
}

export type ComputedHandler<TDoc = any> = (context: { doc: TDoc; user?: any; db?: any }) => any | Promise<any>;

export interface DetailComputedOptions<TDoc = any> {
  id?: string;
  expression?: string;
  handler?: ComputedHandler<TDoc>;
  span?: DetailSpan;
  format?: string;
  currency?: string;
  /**
   * Visibility condition for this computed card.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
}

export interface DetailComputed<TDoc = any> {
  type: "computed";
  id?: string;
  label: string;
  expression?: string;
  handler?: ComputedHandler<TDoc>;
  options?: DetailComputedOptions<TDoc>;
}

export interface DetailDividerOptions {
  span?: DetailSpan;
  /**
   * Visibility condition for this divider.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  spacing?: "sm" | "md" | "lg" | "none";
}

export interface DetailDivider {
  type: "divider";
  options?: DetailDividerOptions;
}

export interface DetailTextOptions {
  span?: DetailSpan;
  /**
   * Visibility condition for this text block.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  variant?:
    | "body"
    | "heading"
    | "subheading"
    | "muted"
    | "caption"
    | "callout"
    | "info"
    | "warning";
  className?: string;
}

export interface DetailText {
  type: "text";
  content: string;
  options?: DetailTextOptions;
}

export interface DetailCustomOptions<TDoc = any> {
  span?: DetailSpan;
  /**
   * Visibility condition for this custom component.
   * Can be a boolean or a JEXL expression evaluated against `{ doc, user }`.
   */
  visible?: string | boolean;
  props?: Record<string, any>;
  render?: (context: { doc: TDoc; user?: any; [key: string]: any }) => any;
}

export interface DetailCustom<TDoc = any> {
  type: "custom";
  name: string;
  options?: DetailCustomOptions<TDoc>;
}

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

export type DetailSchema<TDoc = any> = DetailItem<TDoc>[];
