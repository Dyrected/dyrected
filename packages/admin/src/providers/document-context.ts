import { createContext } from "react";
import type { DyrectedFormHookResult } from "../public/contracts";

/** A document as returned by the Dyrected API. */
export type FormDocument = Record<string, any>;

/** Where a record goes after `submit()` succeeds. `false` and `"stay"` both stay on the form. */
export type SubmitRedirect = "edit" | "list" | "stay" | false;

/** Options for {@link DocumentFormApi.submit}. */
export interface SubmitOptions {
  /**
   * Values merged over the form's values for this call only. They are validated like
   * any other value, and the server's access rules still apply to every field.
   */
  overrides?: Record<string, unknown>;
  /**
   * Where to go after a successful save. Defaults to `"edit"` when creating
   * (the new record's edit screen) and `"stay"` when editing. Ignored in a drawer,
   * where the caller's `onSuccess` decides what happens next.
   */
  redirect?: SubmitRedirect;
  /** Skip the success and error toasts, for forms that report the outcome themselves. */
  silent?: boolean;
}

/** What `submit()` resolves to. It never rejects: failures come back as `{ ok: false }`. */
export type SubmitResult =
  | { ok: true; doc: FormDocument }
  | {
      ok: false;
      /** Field path to message. Includes both validation and server errors. */
      errors: Record<string, string>;
      /** The API error, when the server refused the save. */
      error?: Error;
    };

/** Everything the page knows about the document, provided to a custom form. */
export interface DocumentContextValue {
  mode: "create" | "edit";
  /** The collection schema (or the global's schema). */
  collection: Record<string, any>;
  /** The saved document. `undefined` when creating, or while an edit is loading. */
  document: FormDocument | undefined;
  isLoadingDocument: boolean;
  /** Where the form is shown. */
  presentation: "page" | "drawer";
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
  urls: { list: string; edit?: string };
  submit(options?: SubmitOptions): Promise<SubmitResult>;
  cancel(): void;
}

/** The API `useDocumentForm()` returns: document state plus the form controller. */
export interface DocumentFormApi extends Omit<DocumentContextValue, "presentation"> {
  /** Where the form is shown: a full page or a drawer. */
  presentation: "page" | "drawer";
  /** Values, errors, `setValue` and the rest of the form. Same as `useDyrectedForm()`. */
  form: DyrectedFormHookResult;
}

export const DYRECTED_DOCUMENT_KEY = Symbol.for("dyrected.document");

/** Provided by the create and edit pages (and the relationship drawer) around a custom form. */
export const DocumentContext = createContext<DocumentContextValue | null>(null);
