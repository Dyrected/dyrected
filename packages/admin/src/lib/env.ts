/**
 * True unless the host app is built for production.
 *
 * Use this instead of `import.meta.env.DEV` for anything that should depend on
 * the host's mode. Vite bakes `import.meta.env.*` in when the admin itself is
 * built, so there it is always `false` for a host app. `process.env.NODE_ENV`
 * is left alone when the admin is built and resolved by the host's bundler
 * (Next.js, Vite, Nuxt, webpack) at the host's build, which is what we want.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}
