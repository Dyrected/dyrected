"use client";

import Link from "fumadocs-core/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type PropsWithChildren,
} from "react";
import {
  getRuntimeAwareDocsHref,
  getRuntimeFromPathname,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";

const RuntimeLinkContext = createContext<DocsSiteRuntime | undefined>(undefined);

export function RuntimeLinkScope({
  runtime,
  children,
}: PropsWithChildren<{ runtime?: DocsSiteRuntime }>) {
  return (
    <RuntimeLinkContext.Provider value={runtime}>
      {children}
    </RuntimeLinkContext.Provider>
  );
}

export function useActiveDocsRuntime() {
  const scopedRuntime = useContext(RuntimeLinkContext);
  const pathname = usePathname();

  return scopedRuntime ?? (pathname ? getRuntimeFromPathname(pathname) : undefined);
}

export function useRuntimeAwareHref(href?: string) {
  const runtime = useActiveDocsRuntime();
  if (!href || !runtime) return href;

  return getRuntimeAwareDocsHref(href, runtime);
}

export function RuntimeAwareLink({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const resolvedHref = useRuntimeAwareHref(href);
  if (!href) return <a {...props} />;

  return <Link href={resolvedHref ?? href} {...props} />;
}
