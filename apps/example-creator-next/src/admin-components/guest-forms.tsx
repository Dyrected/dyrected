"use client";

import { useState } from "react";
import {
  DyrectedDefaultForm,
  DyrectedField,
  useAdminNotify,
  useDocumentForm,
  type AdminFormComponentProps,
} from "@dyrected/react";

/*
 * Styling: same rule as the seating chart. The admin's CSS variables hold bare HSL
 * values, so `hsl(var(--card))` follows the admin's own light and dark theme.
 */

const panel =
  "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-[hsl(var(--card-foreground))] shadow-sm";
const primaryButton =
  "rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50";

/**
 * `createForm` for `guest-responses`, used with `formShell: "header"`.
 *
 * A guest turns up at the door who never sent an RSVP. The desk needs three
 * inputs and one button, not the full RSVP form. The button saves the record
 * as attending and already checked in, through the same create path (access
 * rules, hooks, validation) the default form uses.
 */
export function WalkInForm({ presentation }: AdminFormComponentProps) {
  const { submit, form, permissions, cancel } = useDocumentForm();
  const notify = useAdminNotify();
  const [saving, setSaving] = useState(false);
  const name = typeof form.values.name === "string" ? form.values.name : "";

  async function registerAndCheckIn() {
    setSaving(true);
    // The three overrides are not typed into any field; they are what "walk-in" means.
    const result = await submit({
      overrides: { attending: true, checkedIn: true, checkedInAt: new Date().toISOString() },
      // A drawer is closed by whoever opened it, and a page goes back to the list.
      redirect: "list",
      silent: true,
    });
    setSaving(false);

    if (result.ok) {
      notify.success(`${name || "Guest"} registered and checked in`);
    } else {
      // Field errors are already shown under their inputs; this covers the rest.
      notify.error(result.errors.name ?? result.errors._form ?? "Could not register this guest");
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Walk-in guest</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          For someone who arrived without an RSVP. They are saved as attending and checked in.
        </p>
      </header>

      <div className={`${panel} flex flex-col gap-4`}>
        <DyrectedField path="name" />
        <DyrectedField path="email" />
        <DyrectedField path="guestCount" />
      </div>

      <div className="flex items-center justify-end gap-2">
        {presentation === "page" ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))]"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          className={primaryButton}
          disabled={saving || !permissions.canCreate}
          onClick={() => void registerAndCheckIn()}
        >
          {saving ? "Registering…" : "Register and check in"}
        </button>
      </div>
    </div>
  );
}

/**
 * `editForm` for `guest-responses`, under the same `formShell: "header"`.
 *
 * It keeps the whole default form and adds an arrival card above it. The check-in
 * fields are left out of the body because the card owns them. The `header` shell
 * leaves saving to the form, so it ends with its own Save button.
 */
export function GuestEditForm() {
  const { document, submit, permissions, form } = useDocumentForm();
  const notify = useAdminNotify();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await submit({ silent: true });
    setSaving(false);
    if (result.ok) notify.success("Guest saved");
    else notify.error(Object.values(result.errors)[0] ?? "Could not save this guest");
  }

  const checkedIn = Boolean(document?.checkedIn);
  const arrival = document?.checkedInAt ? new Date(String(document.checkedInAt)).toLocaleString() : null;

  async function toggleCheckIn() {
    setSaving(true);
    const result = await submit({
      overrides: checkedIn
        ? { checkedIn: false, checkedInAt: null }
        : { checkedIn: true, checkedInAt: new Date().toISOString() },
      redirect: "stay",
      silent: true,
    });
    setSaving(false);
    if (result.ok) notify.success(checkedIn ? "Check-in undone" : "Checked in");
    else notify.error(Object.values(result.errors)[0] ?? "Could not update the check-in");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={`${panel} flex items-center justify-between gap-4`}>
        <div>
          <p className="text-sm font-semibold">{checkedIn ? "Arrived" : "Not arrived yet"}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {checkedIn && arrival ? `Checked in ${arrival}` : "Check them in when they reach the door."}
          </p>
        </div>
        <button
          type="button"
          className={primaryButton}
          disabled={saving || !permissions.canUpdate}
          onClick={() => void toggleCheckIn()}
        >
          {checkedIn ? "Undo check-in" : "Check in"}
        </button>
      </section>

      <DyrectedDefaultForm exclude={["checkedIn", "checkedInAt"]} />

      <div className="flex justify-end">
        <button
          type="button"
          className={primaryButton}
          disabled={saving || !form.isDirty || !permissions.canUpdate}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
