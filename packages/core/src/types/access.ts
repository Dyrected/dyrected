import type { AuthenticatedUser, HookRequestContext } from "./request.js";

/**
 * A function that determines whether the current user can perform an operation.
 *
 * Return `true` to allow, `false` to deny.
 * Return a `where`-style object to allow access only to matching documents
 * (useful for multi-tenant setups where users can only see their own data).
 *
 * Can also be expressed as a Jexl expression **string** for simple role checks
 * that need to be serialised (e.g. stored in the database or sent to the Admin UI).
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Simple role check
 * access: {
 *   delete: ({ user }) => user?.roles?.includes('admin') ?? false,
 * }
 *
 * @example
 * // Row-level: users can only read their own documents
 * access: {
 *   read: ({ user }) => ({ owner: { equals: user?.sub } }),
 * }
 *
 * @example
 * // Jexl string — evaluated server-side
 * access: {
 *   update: "user.roles contains 'editor'",
 * }
 */
export type AccessFunction<TDoc extends object = Record<string, unknown>> = (args: {
  user: AuthenticatedUser | undefined;
  doc?: TDoc;
  data?: Partial<TDoc>;
  req: HookRequestContext;
}) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;
