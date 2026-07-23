---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
---

Improve auth invitations across admin, core, and SDK.

- add a professional invite dialog in admin with copyable invite URLs and role selection for new invites
- support invite acceptance directly from admin invite links
- pre-create pending invited users in auth collections so they appear in admin lists before acceptance
- let invite emails use clickable acceptance URLs with stronger email-client-safe HTML and visible link fallbacks
