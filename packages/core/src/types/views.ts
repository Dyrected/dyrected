import type { Field } from "./schema-core.js";
import type { AccessRule } from "./access.js";
import type { AggregateOperation } from "./aggregate.js";

export type ViewLayout = 'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards';

export type ActionType = 'row' | 'bulk' | 'header';

export interface ViewMetric {
  label: string;
  aggregate?: AggregateOperation;
  aggregates?: Record<string, AggregateOperation>;
  transform?: string;
  expression?: string;
  format?: 'currency' | 'number' | 'percent' | string;
  currency?: string;
}

export interface ViewConfig {
  slug: string;
  label: string;
  icon?: string;
  layout?: ViewLayout;
  filter?: Record<string, any> | string;
  groupBy?: string;
  dateField?: string;
  startDateField?: string;
  endDateField?: string;
  columns?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  actions?: ActionConfig[];
  metrics?: ViewMetric[];
  access?: AccessConfig;
}

export interface ActionConfig {
  name: string;
  label: string;
  icon?: string;
  type?: ActionType;
  confirm?: string;
  fields?: Field[];
  mutation?: Record<string, any>;
  handler?: (context: ActionContext) => Promise<any>;
  access?: AccessConfig;
}

export interface ActionContext {
  doc: Record<string, unknown>;
  docs: Record<string, unknown>[];
  user: Record<string, unknown> | null;
  input: Record<string, unknown>;
  collection: Record<string, unknown>;
}

export interface AccessConfig {
  read?: AccessRule<any>;
  create?: AccessRule<any>;
  update?: AccessRule<any>;
  delete?: AccessRule<any>;
}

export interface DefineViewOptions {
  slug: string;
  label: string;
  icon?: string;
  layout?: ViewLayout;
  filter?: Record<string, any> | string;
  groupBy?: string;
  dateField?: string;
  startDateField?: string;
  endDateField?: string;
  columns?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  actions?: ActionConfig[];
  metrics?: ViewMetric[];
  access?: AccessConfig;
}

export interface DefineActionOptions {
  name: string;
  label: string;
  icon?: string;
  type?: ActionType;
  confirm?: string;
  fields?: Field[];
  mutation?: Record<string, any>;
  handler?: (context: ActionContext) => Promise<any>;
  access?: AccessConfig;
}

export function defineView(config: DefineViewOptions): ViewConfig {
  return {
    slug: config.slug,
    label: config.label,
    icon: config.icon,
    layout: config.layout ?? 'table',
    filter: config.filter,
    groupBy: config.groupBy,
    dateField: config.dateField,
    startDateField: config.startDateField,
    endDateField: config.endDateField,
    columns: config.columns,
    sort: config.sort,
    actions: config.actions,
    metrics: config.metrics,
    access: config.access,
  };
}

export function defineAction(config: DefineActionOptions): ActionConfig {
  return {
    name: config.name,
    label: config.label,
    icon: config.icon,
    type: config.type ?? 'row',
    confirm: config.confirm,
    fields: config.fields,
    mutation: config.mutation,
    handler: config.handler,
    access: config.access,
  };
}