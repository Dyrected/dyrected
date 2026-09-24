---
"@dyrected/sdk": minor
---

`client.collection(slug).transition(id, name, opts)` now accepts an optional `input` object. It is sent with the transition request and passed to the transition's server-side `onTransition` handler, for example an amount the handler needs to act on.
