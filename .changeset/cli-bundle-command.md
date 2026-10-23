---
"dyrected": minor
"@dyrected/core": minor
---

`dyrected bundle` builds a deployable bundle of your config and tells you, before you deploy, anything that would not run in Dyrected Cloud.

Run `npx dyrected bundle` and you get a folder named after a content hash, so identical source always gives an identical version. It contains `schema.json` (your config with every function replaced by a reference), `server.js` (one self-contained module exporting those functions, with a source map) and `manifest.json` (the version, the function ids and the compatibility report). Your database and storage adapters are left out on purpose, since Cloud supplies its own.

Use `npx dyrected bundle --check` in CI to run only the compatibility check. It fails the build, with a suggested fix for each problem, when your code or a dependency needs something Cloud does not provide: Node core modules such as `fs` or `net`, native addons, `process` APIs other than `process.env.KEY`, `eval`, or a bundle over 5 MB. `Buffer` use is reported as a warning.

`@dyrected/core/runtime` is a new, dependency-free entry point exporting the function-runtime types and `extractFunctionRefs`, so tooling can use them without loading the whole server.
