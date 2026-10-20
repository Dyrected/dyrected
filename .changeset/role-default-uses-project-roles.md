---
"@dyrected/admin": patch
---

The "Publish as Role Default" dropdown in the navigation editor now lists your project's own roles instead of four fixed names.

**What was wrong**

The dropdown only offered `admin`, `editor`, `operator` and `compliance`, so you could not publish a menu for a role like `external`, `finance` or `field_ops` from the admin.

**What changed**

- The roles come from the role field on your auth collection: the field named `roles` or `role`, or a select marked `admin.inviteRole`. Plain string options and `{ label, value }` options both work, and the first role is selected by default.
- If the role field has no fixed options (for example a free-text or JSON field), the dropdown becomes a text box where you type the role name. **Publish** stays disabled until you enter one.
