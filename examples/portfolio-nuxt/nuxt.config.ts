// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  devServer: {
    port: 3008
  },
  modules: [
    '@dyrected/nuxt'
  ],
  dyrected: {
    apiBase: process.env.DYRECTED_API_URL || '/api/dyrected',
    apiKey: process.env.DYRECTED_API_KEY,
    siteId: process.env.DYRECTED_SITE_ID,
  }
})
