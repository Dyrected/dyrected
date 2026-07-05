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
