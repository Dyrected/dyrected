---
"@dyrected/core": minor
"@dyrected/nuxt": minor
---

Add a background task runner and Nuxt import aliases. `defineTask` and `createTaskRunner` (exported from `@dyrected/core`) run cron-scheduled jobs from the `tasks` config, with a per-task database lock so each scheduled run happens once across instances, a `lockTimeout` that aborts overrunning runs, and `runDue()` for platform crons. `@dyrected/nuxt` registers `#dyrected` and `#dyrected/server` aliases anchored to the project root (fixing `~` resolving to `app/` in Nuxt 4), can start the runner with the new `runTasks` option, and no longer blocks dev server boot while validating the config.
