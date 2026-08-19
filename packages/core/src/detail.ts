import type {
  DetailComputed,
  DetailComputedOptions,
  ComputedHandler,
  DetailField,
  DetailGrid,
  DetailGridOptions,
  DetailItem,
  DetailRepeat,
  DetailRepeatOptions,
  DetailSchema,
  DetailSection,
  DetailSectionOptions,
  DetailTab,
  DetailTabOptions,
  DetailTabs,
  DetailTabsOptions,
  DetailDivider,
  DetailDividerOptions,
  DetailText,
  DetailTextOptions,
  DetailCustom,
  DetailCustomOptions,
  DisplayFieldOptions,
} from "./types/detail.js";
import type { Field } from "./types/index.js";
import { evaluateJexl, evaluateJexlSync } from "./utils/jexl-helpers.js";

/**
 * Normalizes a DetailItem (which may be a shorthand string) into a standard DetailItem object.
 *
 * @example `normalizeDetailItem('title')` => `{ type: 'field', field: 'title' }`
 */
export function normalizeDetailItem(item: DetailItem): Exclude<DetailItem, string> {
  if (typeof item === "string") {
    return {
      type: "field",
      field: item,
    };
  }
  return item;
}

/**
 * Creates a section container in a Detail View layout.
 *
 * @example
 * ```ts
 * displaySection('Product Information', [
 *   displayField('name', { span: 8 }),
 *   displayField('sku', { span: 4 }),
 * ], { span: 8, icon: 'package' })
 * ```
 */
export function displaySection(title: string, items: DetailItem[], options?: DetailSectionOptions): DetailSection {
  return {
    type: "section",
    title,
    items,
    options,
  };
}

/**
 * Creates a single tab entry for use within `displayTabs()`.
 */
export function displayTab(label: string, items: DetailItem[], options?: DetailTabOptions): DetailTab {
  return {
    type: "tab",
    label,
    items,
    options,
  };
}

/**
 * Creates a tabbed container in a Detail View layout.
 *
 * @example
 * ```ts
 * displayTabs([
 *   displayTab('Specifications', [displayField('specs')]),
 *   displayTab('Reviews', [displayRepeat('reviews', [...])], { badge: '3' }),
 * ])
 * ```
 */
export function displayTabs(tabs: DetailTab[], options?: DetailTabsOptions): DetailTabs {
  return {
    type: "tabs",
    tabs,
    options,
  };
}

/**
 * Creates a multi-column grid layout inside a section or detail schema.
 *
 * @example
 * ```ts
 * displayGrid(2, [
 *   displayField('firstName'),
 *   displayField('lastName'),
 * ])
 * ```
 */
export function displayGrid(columns: number, items: DetailItem[], options?: DetailGridOptions): DetailGrid {
  return {
    type: "grid",
    columns,
    items,
    options,
  };
}

/**
 * Declares a field for presentation in a Detail View.
 *
 * @example
 * ```ts
 * displayField('status', { display: 'badge', badgeColors: { active: 'emerald' } })
 * displayField('author.name', { label: 'Written By' })
 * displayField('specs', { display: 'key-value', keyLabel: 'Spec', valueLabel: 'Detail' })
 * ```
 */
export function displayField(fieldName: string, options?: DisplayFieldOptions): DetailField {
  return {
    type: "field",
    field: fieldName,
    options,
  };
}

/**
 * Renders an array/repeated field using a delegated display schema.
 * Supports `'table'`, `'cards'`, and `'list'` layouts.
 *
 * @example
 * ```ts
 * displayRepeat('items', [
 *   displayField('product'),
 *   displayField('quantity'),
 *   displayField('price'),
 * ], { layout: 'table' })
 * ```
 */
export function displayRepeat(fieldName: string, items: DetailItem[], options?: DetailRepeatOptions): DetailRepeat {
  return {
    type: "repeat",
    field: fieldName,
    items,
    options,
  };
}

/**
 * Renders a computed value calculated from document and user context.
 *
 * @example
 * ```ts
 * displayComputed('Reading Time', 'math.ceil(doc.wordCount / 200) + " min"')
 * displayComputed('Total', ({ doc }) => `$${doc.price * doc.quantity}`)
 * ```
 */
export function displayComputed<TDoc = any>(
  label: string,
  expressionOrOptionsOrHandler: string | DetailComputedOptions<TDoc> | ComputedHandler<TDoc>,
  options?: DetailComputedOptions<TDoc>,
): DetailComputed<TDoc> {
  let expression: string | undefined;
  let handler: ComputedHandler<TDoc> | undefined;
  let finalOptions: DetailComputedOptions<TDoc> | undefined = options;

  if (typeof expressionOrOptionsOrHandler === "string") {
    expression = expressionOrOptionsOrHandler;
  } else if (typeof expressionOrOptionsOrHandler === "function") {
    handler = expressionOrOptionsOrHandler;
  } else if (expressionOrOptionsOrHandler && typeof expressionOrOptionsOrHandler === "object") {
    expression = expressionOrOptionsOrHandler.expression;
    handler = expressionOrOptionsOrHandler.handler;
    finalOptions = {
      ...expressionOrOptionsOrHandler,
      ...options,
    };
  }

  const id =
    finalOptions?.id ||
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_");

  return {
    type: "computed",
    id,
    label,
    expression,
    handler,
    options: finalOptions,
  };
}

/**
 * Creates a horizontal divider line in a Detail View layout.
 *
 * @example
 * ```ts
 * displayDivider({ spacing: 'md' })
 * ```
 */
export function displayDivider(options?: DetailDividerOptions): DetailDivider {
  return {
    type: "divider",
    options,
  };
}

/**
 * Renders static text, heading, callout, or information notice in a Detail View layout.
 *
 * @example
 * ```ts
 * displayText('Please note this action is permanent.', { variant: 'warning' })
 * displayText('Overview Notes', { variant: 'heading' })
 * ```
 */
export function displayText(content: string, options?: DetailTextOptions): DetailText {
  return {
    type: "text",
    content,
    options,
  };
}

/**
 * Renders a custom React component registered by name in the Admin panel.
 *
 * @example
 * ```ts
 * displayCustom('AnalyticsChart', { props: { timeframe: '30d' } })
 * ```
 */
export function displayCustom<TDoc = any>(name: string, options?: DetailCustomOptions<TDoc>): DetailCustom<TDoc> {
  return {
    type: "custom",
    name,
    options,
  };
}

/**
 * Alias for `displayCustom` to render a custom component in a Detail View layout.
 */
export function displayCustomComponent<TDoc = any>(
  name: string,
  options?: DetailCustomOptions<TDoc>,
): DetailCustom<TDoc> {
  return displayCustom(name, options);
}

/**
 * Evaluates server-side computed functions and JEXL expressions from a detail schema
 * and attaches them to `doc._meta.computed`.
 */
export async function evaluateDetailComputed(
  detail: DetailSchema | boolean | undefined,
  doc: any,
  user: any,
  db: any,
): Promise<any> {
  if (!doc || !detail || !Array.isArray(detail)) {
    return doc;
  }

  const computedItems: Array<{
    id: string;
    label: string;
    expression?: string;
    handler?: any;
  }> = [];

  const extractComputed = (items: any[]) => {
    for (const rawItem of items) {
      if (!rawItem) continue;
      const item = normalizeDetailItem(rawItem);
      if (item.type === "computed") {
        const id = item.id || item.label?.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        if (id) {
          computedItems.push({
            id,
            label: item.label,
            expression: item.expression,
            handler: item.handler,
          });
        }
      } else if (item.type === "section" || item.type === "grid" || item.type === "repeat") {
        if (item.items && Array.isArray(item.items)) {
          extractComputed(item.items);
        }
      } else if (item.type === "tabs" && item.tabs && Array.isArray(item.tabs)) {
        for (const tab of item.tabs) {
          if (tab.items) extractComputed(tab.items);
        }
      }
    }
  };

  extractComputed(detail);

  if (computedItems.length === 0) return doc;

  const evaluated: Record<string, any> = {};
  for (const item of computedItems) {
    try {
      if (typeof item.handler === "function") {
        evaluated[item.id] = await item.handler({ doc, user, db });
      } else if (item.expression) {
        evaluated[item.id] = await evaluateJexl(item.expression, { doc, user });
      }
    } catch (_err) {
      evaluated[item.id] = null;
    }
  }

  return {
    ...doc,
    _meta: {
      ...(doc._meta || {}),
      computed: evaluated,
    },
  };
}

const SENSITIVE_DETAIL_FIELDS = new Set([
  "password",
  "salt",
  "resetPasswordToken",
  "resetPasswordExpires",
  "loginAttempts",
  "lockUntil",
  "apiKey",
  "secret",
]);

/**
 * Generates an automatic default 12-column Detail View schema for a collection or global
 * when no explicit `detail` configuration is provided.
 */
export function generateDefaultDetailSchema(schema: {
  fields?: Field[];
  labels?: { singular?: string; plural?: string };
  label?: string;
  slug?: string;
}): DetailSchema {
  const fields = schema.fields || [];

  // Group fields into main content fields vs sidebar metadata fields
  const sidebarFieldTypes = new Set(["select", "radio", "boolean", "date", "datetime", "relationship"]);

  const mainFields: DetailItem[] = [];
  const sidebarFields: DetailItem[] = [];

  for (const field of fields) {
    if (!field.name) continue;
    if (SENSITIVE_DETAIL_FIELDS.has(field.name)) continue;
    if ((field as any).hidden) continue;
    if (field.admin?.hidden) continue;

    const isSidebar = sidebarFieldTypes.has(field.type) && field.type !== "relationship" && !field.hasMany;

    if (isSidebar && sidebarFields.length < 5) {
      sidebarFields.push(
        displayField(field.name, {
          span: 12,
          display: field.type === "select" || field.type === "radio" ? "badge" : undefined,
        }),
      );
    } else {
      const span =
        field.type === "richText" ||
        field.type === "blocks" ||
        field.type === "textarea" ||
        field.type === "array" ||
        field.type === "json" ||
        field.type === "object"
          ? 12
          : 6;

      mainFields.push(
        displayField(field.name, {
          span,
        }),
      );
    }
  }

  const sections: DetailItem[] = [];

  const mainTitle = schema.labels?.singular || schema.label || "Details";

  if (sidebarFields.length > 0) {
    sections.push(
      displaySection(mainTitle, mainFields, {
        span: 8,
      }),
    );
    sections.push(
      displaySection("Overview", sidebarFields, {
        span: 4,
      }),
    );
  } else {
    sections.push(
      displaySection(mainTitle, mainFields, {
        span: 12,
      }),
    );
  }

  return sections;
}

/**
 * Evaluates whether a detail item should be visible based on its `options.visible` rule.
 * Supports boolean values or JEXL expressions evaluated against `{ doc, user }`.
 * Works consistently for top-level and nested detail items.
 *
 * @example
 * ```ts
 * isDetailItemVisible(displayField('secret', { visible: false }), doc, user) // false
 * isDetailItemVisible(displayField('publishedAt', { visible: "doc.status == 'published'" }), doc, user)
 * ```
 */
export function isDetailItemVisible(item: DetailItem, doc: any, user?: any): boolean {
  if (!item) return true;
  const it = normalizeDetailItem(item);
  const visible = (it as any).options?.visible;
  if (visible === undefined || visible === null) return true;
  if (typeof visible === "boolean") return visible;
  if (typeof visible === "string") {
    if (visible.trim().length === 0) return true;
    try {
      return Boolean(evaluateJexlSync(visible, { doc, user }));
    } catch {
      return true;
    }
  }
  return true;
}
