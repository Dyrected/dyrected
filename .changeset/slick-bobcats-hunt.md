---
"@dyrected/admin": patch
"@dyrected/core": patch
---

feat: implement join field backend population and fix frontend display

Backend:
- Populate join fields in API responses (find/findOne) with related docs
- Add configurable `limit` property to join field type (default 10)
- Include `collection`, `on`, and `limit` in schema endpoint serialization
- Skip join population at depth > 0 to prevent infinite recursion

Frontend:
- Read backend-populated join data via useWatch instead of separate API calls
- Fix "Create new" button route from /create to /new
- Pre-fill relationship fields from URL query params on new entry creation
- Include join field data in form default values for display

Other:
- Add CSV export to collection list page
- Add functional access control tests
- Update collection/global controller hooks
