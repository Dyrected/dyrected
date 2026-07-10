"use client";

import dynamic from "next/dynamic";
import type { DyrectedAdminProps } from "@dyrected/react/admin";

const LazyDyrectedAdmin = dynamic(
  () => import("@dyrected/react/admin").then((mod) => mod.DyrectedAdmin),
  {
    ssr: false,
    loading: () => (
      <div className="dy-p-8 dy-text-center dy-text-muted-foreground dy-text-xs dy-font-medium">
        Loading admin panel...
      </div>
    ),
  }
);

export function DyrectedAdmin(props: DyrectedAdminProps) {
  const baseUrl = props.baseUrl || process.env.NEXT_PUBLIC_DYRECTED_URL || "/dyrected";
  const apiKey = props.apiKey || process.env.NEXT_PUBLIC_DYRECTED_API_KEY;
  const siteId = props.siteId || process.env.NEXT_PUBLIC_DYRECTED_SITE_ID;

  return <LazyDyrectedAdmin {...props} baseUrl={baseUrl} apiKey={apiKey} siteId={siteId} />;
}
