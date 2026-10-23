---
"dyrected": minor
---

`dyrected deploy` builds your config, checks it will run in Dyrected Cloud, uploads it, and makes it live. `dyrected secrets` manages the values your deployed functions read as `process.env.NAME`.

Run `npx dyrected deploy` with `DYRECTED_API_KEY` and `DYRECTED_SITE_ID` set (the same two variables `sync:schema` uses). Cloud loads the bundle in its sandbox before activating it, so a bundle that cannot start is rejected and your current code keeps running. Uploading identical code again simply makes it live again, which is also how you roll back.

`npx dyrected secrets set STRIPE_KEY sk_live_...` stores a value encrypted at rest. Values are write-only: you can set, list (names only) and delete them, but never read them back. Pipe a value in with `--stdin` to keep it out of your shell history.
