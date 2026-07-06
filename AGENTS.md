The goal is to always write production ready code, avoid patches unless there is absolutely no other way.

React state/effect safety:

- Do not call setState during render. Move route/page resets and other synchronization into guarded effects or event handlers.
- Do not mirror props into state unless the component needs a local draft. Prefer deriving values during render or with useMemo.
- Effects that set state must synchronize with an external system or a route/key transition, use stable dependencies, and guard no-op updates:

```ts
useEffect(() => {
  const next = readExternalValue()
  setState((prev) => isEqual(prev, next) ? prev : next)
}, [stableKey])
```

- Async effects must protect against stale results:

```ts
useEffect(() => {
  let cancelled = false
  load().then((next) => {
    if (cancelled) return
    setState((prev) => isEqual(prev, next) ? prev : next)
  })
  return () => { cancelled = true }
}, [stableKey])
```

- Do not put freshly-created objects, arrays, or callbacks in effect dependencies. Memoize them, move them inside the effect, or depend on primitive keys.
- When a state update can be repeated by navigation, polling, preferences, subscriptions, or storage events, use a functional setter and return the previous value when nothing changed.

Documentation voice:

- For Dyrected docs, default to a friendly practical instructor voice: warm, direct, and task-oriented.
- Write like a helpful peer who has already solved the problem and is guiding the reader through it.
- Assume the reader is capable but may be new to Dyrected or unsure about the next step.
- Prefer small sequential steps, plain English, visible outcomes, and short explanations after code blocks.
- Use reassurance sparingly but deliberately around likely confusion points, especially in getting-started and setup flows.
- Prioritize concrete working guidance over abstract theory; explain why a step exists before expanding into options.
- Keep the tone human and confidence-building, but do not become chatty, cute, or promotional.
- For docs work, consult `apps/docs/DOCS_PHILOSOPHY.md` and follow its voice and structure guidance in addition to these repo-wide rules.
