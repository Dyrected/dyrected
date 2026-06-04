---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
---

Minor improvements

- move Admin UI to @dyrected/react, add DyrectedMedia components, and introduce withDyrected Next.js config for dependency resolution.
- consolidate React components in @dyrected/react, re-export from @dyrected/next, and add Next.js config wrapper
- remove restrictive vertical scroll constraints across block builder, edit page, and media components
- add password reset flow with token handling and UI views
- add time picker field and image cropping functionality to media picker
- enable image cropping, add clipboard file paste to media manager, and add support for date range pickers.
