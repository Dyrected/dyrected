"use client";

import { DyrectedAdmin } from "@dyrected/next/admin";
import { defineAdminComponents } from "@dyrected/react";
import { GuestHeadcountBanner, SeatingChart } from "@/admin-components/seating-chart";
import { OperationsDashboard } from "@/admin-components/operations-dashboard";

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
  // Custom admin pages name one of these in `definePage({ component: ... })`
  pages: {
    "ops.executiveHub": OperationsDashboard,
  },
});

export function AdminClient(props: { baseUrl?: string; apiKey?: string; siteId?: string }) {
  return <DyrectedAdmin {...props} components={components} />;
}
