---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
---

Improve admin safety and auth onboarding across admin, core, and SDK.

- add a professional invite dialog in admin with copyable invite URLs and role selection for new invites
- support invite acceptance directly from admin invite links
- pre-create pending invited users in auth collections so they appear in admin lists before acceptance
- let invite and reset emails use clickable URLs with stronger email-client-safe HTML and visible link fallbacks
- expand dashboard "Needs attention" checks with backend health and invite-related signals
- replace browser delete alerts with admin dialogs, including typed confirmation before deleting auth users
