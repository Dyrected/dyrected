# Auth Strategy Brainstorm

Deciding between extending the Admin model or using separate collections for frontend users.

## Option 1: Extend Default Admin (`__admins`)
In this model, every "user" is a record in the system's core admin table.

### Pros
- **Simplified Relationships**: Any field pointing to a "User" (like `assignedTo`) always points to the same collection.
- **Unified Profile**: If a person is both an admin and a subscriber, they have one login.

### Cons
- **Security Concerns**: Mixing internal staff and external customers in one table increases the risk of privilege escalation bugs.
- **Schema Mess**: Staff need fields like `isSuperAdmin`, while customers need `stripeId`. The table becomes a "God Object" with many null values.
- **Privacy**: Internal metadata (admin notes, last IP) could accidentally be exposed to the frontend user API.

---

## Option 2: Separate Collections (Recommended)
Keep `__admins` for system staff and create developer-defined collections (e.g., `customers`, `members`) for frontend users.

### Pros
- **Hard Isolation**: A frontend user has no physical presence in the system that controls the database schema.
- **Tailored Schemas**: `members` can have fields that only make sense for them without bloating the admin user model.
- **Scalability**: You can easily add new types of users (e.g., `vendors`, `partners`) with completely different authentication requirements.

### Cons
- **Polymorphic Relationships**: If a document can be "owned" by an Admin OR a Customer, the relationship logic becomes slightly more complex.
- **Duplicate Logic**: Common auth traits (email verification, password reset) must be handled across multiple collections (though this is mitigated by Dyrected's `auth: true` abstraction).

## Conclusion / Path Forward
The **Separate Collections** approach aligns better with Dyrected's philosophy of modularity and security. We should prioritize this and provide helpers for "cross-collection" relationships if needed.
