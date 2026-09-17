'use client';

import { usePathname } from 'next/navigation';
import DefaultSearchDialog, {
  type DefaultSearchDialogProps,
} from 'fumadocs-ui/components/dialog/search-default';

/**
 * Runtime-aware static search dialog. Downloads the prebuilt Orama index
 * for the current docs runtime (`/api/search/cloud` or
 * `/api/search/self-hosted`) once, then answers every keystroke locally —
 * no per-keystroke API round-trips.
 */
export function RuntimeSearchDialog(props: Omit<DefaultSearchDialogProps, 'api' | 'type'>) {
  const pathname = usePathname();
  const runtime = pathname?.startsWith('/docs/self-hosted') ? 'self-hosted' : 'cloud';

  return <DefaultSearchDialog {...props} type="static" api={`/api/search/${runtime}`} />;
}
