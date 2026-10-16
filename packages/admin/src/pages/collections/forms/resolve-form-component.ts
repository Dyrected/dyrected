import type { FormShell } from "@dyrected/core";

interface FormComponentSlots {
  createForm?: string;
  editForm?: string;
  form?: string;
  formShell?: FormShell;
  formInDrawer?: boolean;
}

export interface ResolvedFormComponent {
  /** Registry key of the custom form, or `null` to render the built-in form. */
  key: string | null;
  shell: FormShell;
}

const VALID_SHELLS: readonly FormShell[] = ["full", "header", "none"];

/**
 * Picks the custom form for a screen: `createForm ?? form` when creating,
 * `editForm ?? form` when editing. A global is always edited, so it passes `"edit"`.
 *
 * An unknown `formShell` falls back to `full`, the shell that keeps Save and
 * navigation working. Config diagnostics report the typo.
 */
export function resolveFormComponent(
  slots: FormComponentSlots | undefined,
  mode: "create" | "edit",
  presentation: "page" | "drawer" = "page",
): ResolvedFormComponent {
  const shell = slots?.formShell && VALID_SHELLS.includes(slots.formShell) ? slots.formShell : "full";
  if (!slots) return { key: null, shell };
  if (presentation === "drawer" && slots.formInDrawer === false) return { key: null, shell };

  const key = (mode === "create" ? slots.createForm : slots.editForm) ?? slots.form;
  return { key: typeof key === "string" && key ? key : null, shell };
}
