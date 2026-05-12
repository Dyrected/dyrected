"use client";

import React from "react";
import { AdminUI, type AdminUIProps } from "@dyrected/admin";

export function DyrectedAdmin(props: AdminUIProps) {
  const baseUrl = props.baseUrl || process.env.NEXT_PUBLIC_DYRECTED_URL || "/dyrected";
  const apiKey = props.apiKey || process.env.NEXT_PUBLIC_DYRECTED_API_KEY;

  return <AdminUI {...props} baseUrl={baseUrl} apiKey={apiKey} />;
}
