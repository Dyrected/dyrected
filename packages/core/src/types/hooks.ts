import type { DatabaseAdapter, ReadonlyDatabaseAdapter } from "./adapters.js";
import type { AuthenticatedUser, HookRequestContext } from "./request.js";
import type { FieldBeforeChangeHook } from "./schema-core.js";

export type DeclarativeHookExpression = string;

/**
 * @deprecated Use {@link FieldBeforeChangeHook} or `FieldAfterReadHook` instead.
 * This alias remains for backwards compatibility.
 */
export type FieldHook<TDoc extends object = Record<string, unknown>, TValue = unknown> = FieldBeforeChangeHook<
  TValue,
  TDoc
>;

/**
 * Runs before Dyrected queries the database for a list or single-document fetch.
 *
 * Return a new `where` query object to override or extend the current filter.
 * Return `undefined` (or nothing) to leave the query unchanged.
 */
export type CollectionBeforeReadHook = (args: {
  req: HookRequestContext;
  query?: Record<string, unknown>;
  user?: AuthenticatedUser;
  db: ReadonlyDatabaseAdapter;
}) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;

export type CollectionBeforeReadHookEntry =
  | CollectionBeforeReadHook
  | DeclarativeHookExpression;

/**
 * Runs after a document (or list of documents) is fetched from the database,
 * before the response is sent to the client.
 */
export type CollectionAfterReadHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  db: ReadonlyDatabaseAdapter;
}) => TDoc | Promise<TDoc>;

export type CollectionAfterReadHookEntry<
  TDoc extends object = Record<string, unknown>,
> = CollectionAfterReadHook<TDoc> | DeclarativeHookExpression;

/**
 * Runs **before** a document is created or updated in the database.
 */
export type CollectionBeforeChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  data: Partial<TDoc>;
  doc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "create" | "update";
  db: ReadonlyDatabaseAdapter;
}) => Partial<TDoc> | void | Promise<Partial<TDoc> | void>;

export type CollectionBeforeChangeHookEntry<
  TDoc extends object = Record<string, unknown>,
> = CollectionBeforeChangeHook<TDoc> | DeclarativeHookExpression;

/**
 * Runs **after** a document is created or updated in the database.
 */
export type CollectionAfterChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  previousDoc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "create" | "update";
  db: DatabaseAdapter;
}) => void | Promise<void>;

/**
 * Runs **before** a document is deleted from the database.
 */
export type CollectionBeforeDeleteHook<TDoc extends object = Record<string, unknown>> = (args: {
  id: string;
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  db: ReadonlyDatabaseAdapter;
}) => void | Promise<void>;

/**
 * Runs **after** a document has been deleted from the database.
 */
export type CollectionAfterDeleteHook<TDoc extends object = Record<string, unknown>> = (args: {
  id: string;
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  db: DatabaseAdapter;
}) => void | Promise<void>;

/** @see {@link CollectionBeforeReadHook} */
export type GlobalBeforeReadHook = CollectionBeforeReadHook;
export type GlobalBeforeReadHookEntry = CollectionBeforeReadHookEntry;

/**
 * Runs after the global document is fetched, before the response is sent.
 */
export type GlobalAfterReadHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  db: ReadonlyDatabaseAdapter;
}) => TDoc | Promise<TDoc>;

export type GlobalAfterReadHookEntry<
  TDoc extends object = Record<string, unknown>,
> = GlobalAfterReadHook<TDoc> | DeclarativeHookExpression;

/**
 * Runs before the global document is updated.
 * Operation is always `'update'` (globals cannot be created or deleted).
 */
export type GlobalBeforeChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  data: Partial<TDoc>;
  doc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
  db: ReadonlyDatabaseAdapter;
}) => Partial<TDoc> | void | Promise<Partial<TDoc> | void>;

export type GlobalBeforeChangeHookEntry<
  TDoc extends object = Record<string, unknown>,
> = GlobalBeforeChangeHook<TDoc> | DeclarativeHookExpression;

/**
 * Runs after the global document is updated. Side-effects only.
 */
export type GlobalAfterChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  previousDoc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
  db: DatabaseAdapter;
}) => void | Promise<void>;

/**
 * @deprecated Use the specific hook types instead:
 * `CollectionBeforeChangeHook`, `CollectionAfterReadHook`, etc.
 *
 * This broad type remains for backwards compatibility with the internal hook runner.
 */
export type HookFunction<TDoc extends object = Record<string, unknown>> = (args: {
  data?: Partial<TDoc>;
  doc?: TDoc;
  user?: AuthenticatedUser;
  req?: HookRequestContext;
  operation?: "create" | "update" | "delete";
  db?: DatabaseAdapter;
  [key: string]: unknown;
}) => unknown | Promise<unknown>;
