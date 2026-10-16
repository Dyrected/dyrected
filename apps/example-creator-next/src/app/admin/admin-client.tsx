"use client";

import { DyrectedAdmin } from "@dyrected/next/admin";
import { defineAdminComponents } from "@dyrected/react";
import { GuestHeadcountBanner, SeatingChart } from "@/admin-components/seating-chart";
import { OperationsDashboard } from "@/admin-components/operations-dashboard";
import { CheckInStation } from "@/admin-components/check-in-station";
import { GuestEditForm, WalkInForm } from "@/admin-components/guest-forms";

/**
 * Components are functions, so they cannot be passed from a server component.
 * This client wrapper registers them under the keys the config references.
 */
const components = defineAdminComponents({
  // `layout: "custom"` views name one of these in `component`.
  viewLayouts: {
    "guest-responses.seatingChart": SeatingChart,
  },
  // Slots on a view (`components.beforeViewContent`) name one of these.
  collectionView: {
    guestHeadcount: GuestHeadcountBanner,
  },
  // `admin.components.createForm` / `editForm` name one of these.
  forms: {
    "guest-responses.walkIn": WalkInForm,
    "guest-responses.edit": GuestEditForm,
  },
  // Custom admin pages name one of these in `definePage({ component: ... })`
  pages: {
    "ops.executiveHub": OperationsDashboard,
    "ops.checkInStation": CheckInStation,
  },
});

export function AdminClient(props: { baseUrl?: string; apiKey?: string; siteId?: string }) {
  return <DyrectedAdmin {...props} components={components} />;
}
