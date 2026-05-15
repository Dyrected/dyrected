import { defineNuxtPlugin, useRuntimeConfig, useRequestFetch } from '#app'
import { createClient } from '@dyrected/sdk'
import { DYRECTED_CLIENT_KEY } from '@dyrected/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.dyrected
  const fetcher = useRequestFetch()

  const client = createClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
    fetch: fetcher as any,
  })

  // Provide the client to the Vue app using the key from @dyrected/vue
  nuxtApp.vueApp.provide(DYRECTED_CLIENT_KEY, client)

  return {
    provide: {
      dyrected: client
    }
  }
})
