---
"@dyrected/admin": patch
---

Fix token-mode live preview never showing the draft

In `previewMode: "token"`, the preview pane minted a valid token but discarded it before it reached the iframe, so the frame kept loading published content and never reflected edits. The mint effect depended on the `data` object, so it re-ran on every parent render; its cleanup cancelled the in-flight mint, and the `if (cancelled) return` guard then skipped applying the token. The constant re-runs also cleared the debounce timer, so minting eventually stopped firing on edits.

The effect now depends on a stable serialized key of the draft instead of the object, so it only re-runs on a real edit — cancellation now means "the draft changed again," and a successful mint is applied to the iframe as intended.
