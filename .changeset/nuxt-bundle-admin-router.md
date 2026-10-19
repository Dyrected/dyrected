---
"@dyrected/nuxt": patch
---

Production Nuxt builds no longer return a 500 on `/admin` with `ERR_MODULE_NOT_FOUND` for `react-router/dist/development/dom-export.mjs`.

**What was wrong**

`@dyrected/admin` lists `react-router-dom` as a peer dependency, so a server install decides which copy of it you get. On a server with no lockfile (for example when you deploy only one app out of a monorepo), Nitro could leave `react-router` as an external import and then not copy its files into `.output/server/node_modules`. The server started, then failed on the first request to any Admin route. Local builds with a lockfile bundled the router and never showed the problem.

**What changed**

`@dyrected/nuxt` now tells Nitro to bundle `react-router` and `react-router-dom` into the server build, so the result no longer depends on how your server lays out `node_modules`. You can remove this workaround from `nuxt.config.ts` if you added it:

```ts
nitro: {
  externals: { inline: [/^react-router(-dom)?($|\/)/] },
}
```

Rules you already have in `nitro.externals.inline` are kept.
