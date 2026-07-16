---
"@dyrected/admin": patch
"@dyrected/core": patch
---

Fix workflow and draft handling across the admin UI and core collection APIs.

- stop showing the admin publishing status column for collections that only define a user `status` field
- show workflow state labels and colors consistently in admin list and edit views
- return published workflow documents correctly in public reads, including legacy entries without a materialized published snapshot
- materialize workflow metadata on update responses so the admin can keep draft and transition state in sync
- improve the example auth roles setup and docs so custom auth `roles` fields use the expected array-backed shape
