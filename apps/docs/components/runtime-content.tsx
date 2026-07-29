"use client";

import type { PropsWithChildren } from "react";
import { useActiveDocsRuntime } from "@/components/runtime-link-scope";

export function CloudOnly({ children }: PropsWithChildren) {
  const runtime = useActiveDocsRuntime();

  if (runtime !== "cloud") return null;
  return <>{children}</>;
}

export function SelfHostedOnly({ children }: PropsWithChildren) {
  const runtime = useActiveDocsRuntime();

  if (runtime !== "self-hosted") return null;
  return <>{children}</>;
}
