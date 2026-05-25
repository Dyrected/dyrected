"use client";

import dynamic from "next/dynamic";
import type { AdminUIProps } from "@dyrected/admin";

const LazyAdminUI = dynamic(
  () => import("@dyrected/admin").then((mod) => mod.AdminUI),
  {
    ssr: false,
    loading: () => (
      <div className="dy-p-8 dy-text-center dy-text-muted-foreground dy-text-xs dy-font-medium">
        Loading admin panel...
      </div>
    ),
  }
);

export function DyrectedAdmin(props: AdminUIProps) {
  const baseUrl = props.baseUrl || process.env.NEXT_PUBLIC_DYRECTED_URL || "/dyrected";
  const apiKey = props.apiKey || process.env.NEXT_PUBLIC_DYRECTED_API_KEY;

  return <LazyAdminUI {...props} baseUrl={baseUrl} apiKey={apiKey} />;
}
