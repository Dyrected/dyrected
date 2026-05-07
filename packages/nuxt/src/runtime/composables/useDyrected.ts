import { createClient } from '@dyrected/sdk';
// @ts-ignore
import { useRuntimeConfig } from '#app';

export const useDyrected = () => {
  const config = useRuntimeConfig().public.dyrected;
  
  const client = createClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
  });

  return client;
};

export const useDyrectedDoc = (collection: string, slug: string, options?: { depth?: number }) => {
  const client = useDyrected();
  return client.collection(collection).findOne(slug, options);
};
