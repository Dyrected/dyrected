---
"@dyrected/admin": patch
---

Use server-backed logout and clear revoked stored admin sessions

The admin provider still treated logout as a purely client-side action after Dyrected auth moved to revocable server-backed sessions. Logging out from the admin cleared local storage, but it did not call the server logout route, so the current session stayed valid until expiry. The provider also kept dead tokens in local storage when bootstrapping `me()` failed, which caused repeated failed auth requests on reload after a session had already been revoked.

The admin provider now calls the collection logout route before clearing local state, so admin logout actually revokes the current session. It also clears persisted auth state only on real stale-auth failures during bootstrap (`401` / `404`), so revoked or invalid stored sessions are cleaned up automatically without treating unrelated network errors as a logout.
