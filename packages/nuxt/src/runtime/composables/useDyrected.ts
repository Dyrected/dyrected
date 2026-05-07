import { createClient } from '@dyrected/sdk';
// @ts-ignore
import { useRuntimeConfig } from '#app';

export const useDyrected = () => {
  const config = useRuntimeConfig().public.dyrected;
  
  const client = createClient({
    baseUrl: config.baseUrl,
  });

  return client;
};
