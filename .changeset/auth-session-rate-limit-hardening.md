---
"@dyrected/core": patch
---

Add built-in API rate limiting, proxy-aware client IP resolution, and revocable auth sessions

Dyrected auth and request protection were missing three production layers that Payload already treats as part of the core server contract: app-level request throttling, correct client-IP handling behind proxies, and a way to revoke JWT sessions immediately instead of waiting for expiry.

`createDyrectedApp` now mounts an in-process API rate limiter with Payload-style defaults for `/api` routes, including configurable `max`, `window`, `paths`, `skip`, and `trustProxy` options. Client IP resolution now understands common provider headers and trusted `X-Forwarded-For` chains so production deployments behind a reverse proxy count the right caller instead of the proxy hop.

Auth collections also move from purely stateless login tokens to JWTs backed by hidden `__auth_sessions` records. New tokens carry a session id, auth middleware validates that the backing session is still active, logout can revoke the current session immediately, `?allSessions=true` can revoke every session for the account, and password reset / password change now invalidate active sessions as a security boundary. Refreshing a token keeps the same underlying session instead of creating a second one silently.

The docs and OpenAPI surface were updated to match the new behavior, especially around built-in rate limiting, trusted proxy setup, logout semantics, and session revocation.
