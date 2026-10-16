import { useState } from "react";
import {
  defineBooleanField,
  defineCollection,
  defineDateTimeField,
  defineNumberField,
  defineTextField,
} from "@dyrected/core";
import { DyrectedField, defineAdminComponents, useAdminNotify, useDocumentForm } from "@dyrected/react";

export const GuestResponses = defineCollection({
  slug: "guest-responses",
  labels: { singular: "Guest response", plural: "Guest responses" },
  admin: {
    useAsTitle: "name",
    components: {
      // Used when creating. Editing keeps the built-in form.
      createForm: "guest-responses.walkIn",
      // The form brings its own button, so Dyrected keeps only the header.
      formShell: "header",
    },
  },
  fields: [
    defineTextField({ name: "name", label: "Full name", required: true }),
    defineTextField({ name: "email", label: "Email" }),
    defineNumberField({ name: "guestCount", label: "Plus-ones", defaultValue: 0 }),
    defineBooleanField({ name: "attending", label: "Attending", defaultValue: false }),
    defineBooleanField({ name: "checkedIn", label: "Checked in", defaultValue: false }),
    defineDateTimeField({ name: "checkedInAt", label: "Checked in at" }),
  ],
});

export function WalkInForm() {
  const { submit, permissions, cancel } = useDocumentForm();
  const notify = useAdminNotify();
  const [saving, setSaving] = useState(false);

  async function registerAndCheckIn() {
    setSaving(true);
    const result = await submit({
      // Values the editor never types: they are what "walk-in" means.
      overrides: { attending: true, checkedIn: true, checkedInAt: new Date().toISOString() },
      redirect: "list",
      silent: true,
    });
    setSaving(false);

    if (result.ok) {
      notify.success("Guest registered and checked in");
    } else {
      notify.error(result.errors.name ?? result.errors._form ?? "Could not register this guest");
    }
  }

  return (
    <div>
      <h2>Walk-in guest</h2>
      <DyrectedField path="name" />
      <DyrectedField path="email" />
      <DyrectedField path="guestCount" />

      <button type="button" onClick={cancel}>
        Cancel
      </button>
      <button type="button" disabled={saving || !permissions.canCreate} onClick={() => void registerAndCheckIn()}>
        {saving ? "Registering…" : "Register and check in"}
      </button>
    </div>
  );
}

// Registered on <DyrectedAdmin components={components} /> under the key the config uses.
export const components = defineAdminComponents({
  forms: { "guest-responses.walkIn": WalkInForm },
});
