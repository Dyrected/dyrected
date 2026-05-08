import config from './dyrected.config'

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
    ...config,
    apiBase: '/api/dyrected',
  }
})
