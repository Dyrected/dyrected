/**
 * Minimum HTTP request context passed to every server-side hook and resolver.
 *
 * The full Web Standard `Request` is available as `raw` when you need it, but
 * most hooks only need `query` (URL search parameters).
 */
export interface HookRequestContext {
  /** Parsed URL query-string parameters, e.g. `{ page: '2', search: 'hello' }`. */
  query: Record<string, string>;
  /** Incoming HTTP headers, lowercased. */
  headers: Record<string, string>;
  /** The raw Web Standard `Request` object. Useful for streaming or advanced header inspection. */
  raw?: Request;
}

/**
 * Base shape of an authenticated user as decoded from the JWT.
 *
 * The actual shape will include every field on your auth collection — this
 * interface only guarantees the properties that Dyrected always stamps on the
 * token. Extend it in your own codebase for stronger typing:
 *
 * @example
 * declare module '@dyrected/core' {
 *   interface AuthenticatedUser {
 *     role: 'admin' | 'editor'
 *     organizationId: string
 *   }
 * }
 */
export interface AuthenticatedUser {
  /** The user's document ID in the database. */
  sub: string;
  /** The user's email address. */
  email?: string;
  /** Slug of the collection this user was authenticated against. */
  collection: string;
  /** Array of role strings, if your auth collection has a `roles` field. */
  roles?: string[];
  /** Any additional fields from the auth collection document. */
  [key: string]: unknown;
}
