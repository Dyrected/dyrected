import type { DyrectedClient } from "@dyrected/sdk";
import { useOptionalDyrected } from "../providers/dyrected-context";

/**
 * The SDK client the admin itself uses, already signed in as the current
 * editor. Use it in custom pages, layouts and fields to read or write
 * documents with exactly that editor's permissions.
 *
 * This is not the same as `useDyrected()` from `@dyrected/react`, which gives
 * your public site's client and needs its own provider.
 *
 * @experimental
 */
export function useAdminClient(): DyrectedClient {
  const context = useOptionalDyrected();
  if (!context?.client) {
    throw new Error(
      "useAdminClient() must be used inside a component rendered by the Dyrected admin, after the editor has signed in.",
    );
  }
  return context.client;
}
