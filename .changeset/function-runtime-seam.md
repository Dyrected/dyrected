---
"@dyrected/core": minor
---

Every function Dyrected calls on your behalf (hooks, access rules, action handlers, tasks, computed values and option resolvers) now goes through one seam, `config.functionRuntime`. Nothing changes for a normal app: leave it unset and your functions are called in-process exactly as before.

**For platform builders**

- **Run config functions somewhere else.** Set `functionRuntime` to an object with an `invoke(fn, args, ctx)` method. `ctx.surface` says where the call comes from (`collection.beforeChange`, `access`, `action`, `task`, and so on) and `ctx.path` names the function, so a runtime can apply per-surface limits and label its logs. Ordering, error mapping and access semantics stay identical because the dispatcher is the same one self-hosted apps use.
- **Split a config into data and functions.** `extractFunctionRefs(config)` returns a JSON-serialisable schema in which each function is replaced by `{ $fn: "<path>" }`, plus a map of the functions themselves. `hydrateFunctionRefs` puts them back. A hook, access rule or action handler may be a `FunctionRef` anywhere a function is allowed; the runtime resolves it.
- **Budget errors that clients can match on.** `FunctionTimeoutError` answers `504` with code `FUNCTION_TIMEOUT` and names the function. `FunctionLimitError` covers memory, output size and egress.

**A conformance suite you can run against any runtime**

`@dyrected/core/conformance` exports `conformanceCases`, `runConformance` and a small `ConformanceHarness` interface. Each case is a config plus scripted requests, asserting the same responses and database state wherever the config runs. Core runs the suite against the in-process runtime; a hosting platform runs it against its own. `InMemoryAdapter`, the database the suite runs on, is exported from the same entry point.
