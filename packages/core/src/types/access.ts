import type { AuthenticatedUser, HookRequestContext } from "./request.js";

export interface AccessFunctionArgs<TDoc extends object = Record<string, unknown>> {
  user: AuthenticatedUser | undefined;
  doc?: TDoc;
  data?: Partial<TDoc>;
  req: HookRequestContext;
}

export interface NamedAccessPolicy<TDoc extends object = Record<string, unknown>> {
  policy: string;
  params?: Record<string, unknown>;
}

export type AccessResult = boolean | Record<string, unknown>;

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
export type AccessFunction<TDoc extends object = Record<string, unknown>> = (
  args: AccessFunctionArgs<TDoc>,
) => AccessResult | Promise<AccessResult>;

export type AccessRule<TDoc extends object = Record<string, unknown>> =
  | boolean
  | string
  | AccessFunction<TDoc>
  | NamedAccessPolicy<TDoc>;

export type AccessPolicyResolver<TDoc extends object = Record<string, unknown>> = (
  args: AccessFunctionArgs<TDoc> & { params?: Record<string, unknown> },
) => AccessResult | Promise<AccessResult>;
