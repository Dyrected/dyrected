import { useContext } from "react";
import { DocumentContext, type DocumentFormApi } from "../providers/document-context";
import { useDyrectedForm } from "./use-dyrected-form";

export type {
  DocumentFormApi,
  SubmitOptions,
  SubmitResult,
  SubmitRedirect,
} from "../providers/document-context";

/** Merges the document-level state with the form controller. Shared with the Vue bridge. */
export function buildDocumentFormApi(
  context: NonNullable<React.ContextType<typeof DocumentContext>>,
  form: DocumentFormApi["form"],
): DocumentFormApi {
  return { ...context, form };
}

/**
 * State and operations for the create or edit form a custom form component is mounted in.
 *
 * It composes `useDyrectedForm()` (values, errors, `setValue`) with document-level
 * concerns: the saved document, permissions, and `submit()`, which uses the same
 * save path as the built-in form.
 *
 * @experimental
 * @example
 * function ScanForm() {
 *   const { submit } = useDocumentForm();
 *   const rsvp = useField("rsvpRecord");
 *   // rsvp.setValue(id); await submit({ redirect: "stay" });
 * }
 */
export function useDocumentForm(): DocumentFormApi {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error(
      "useDocumentForm() can only be used inside a custom create or edit form registered under `components.forms`.",
    );
  }
  const form = useDyrectedForm();
  return buildDocumentFormApi(context, form);
}
