---
"@dyrected/core": patch
"@dyrected/admin": patch
---

**Type Safety: Enforce Required Field Properties**

Added compile-time type safety for field configuration to catch configuration errors at build time instead of runtime:

### Field Type Improvements:
- **JoinField**: `collection` and `on` are now required
- **RelationshipField**: `relationTo` is now required  
- **ImageField**: `relationTo` is now required
- **ObjectField**: `fields` is now required
- **ArrayField**: `fields` is now required
- **BlocksField**: Requires either `blocks` or `blockReferences`

### Action & Workflow Improvements:
- **ActionConfig**: Now enforces that either `mutation` or `handler` (or both) is provided via union type
- **ViewLayout Types**: Layout-specific types enforce required fields:
  - Kanban views require `groupBy`
  - Calendar views require `dateField`
  - Gantt views require `startDateField` and `endDateField`

### DefaultValue Type Safety:
- `defaultValue` now matches the field's value type (e.g., multiSelect requires `string[]`, not `string`)

### Collection Slug Inference (NEW):
- Added `ExtractCollectionSlugs<T>` helper type to extract valid collection slugs from config
- Added `defineTypedRelationshipField<ValidSlugs>()` - type-safe relationship fields
- Added `defineTypedImageField<ValidSlugs>()` - type-safe image fields  
- Added `defineTypedJoinField<ValidSlugs>()` - type-safe join fields
- These builders validate `relationTo` and `collection` against available slugs at compile time

```tsx
type ValidSlugs = ExtractCollectionSlugs<typeof collections>;

// ✅ Valid - 'posts' exists in collections
defineTypedRelationshipField<ValidSlugs>({
  name: 'author',
  relationTo: 'users',  // Type-checked!
})

// ❌ Invalid - 'potss' doesn't exist
defineTypedRelationshipField<ValidSlugs>({
  name: 'author', 
  relationTo: 'potss',  // TypeScript error!
})
```

### Documentation:
- Added guidance that workflow transition `from`/`to` fields should reference defined state names
- Clarified that select/multiSelect/radio fields should include options configuration

### Bug Fixes:
- Fixed `r.map is not a function` runtime error in admin collections by enforcing multiSelect defaultValue types
- Fixed `admins` and `investors` collections to use correct array-typed defaultValues

These changes improve developer experience by surfacing configuration issues at compile time through TypeScript's type system, reducing debugging time and preventing production issues.
