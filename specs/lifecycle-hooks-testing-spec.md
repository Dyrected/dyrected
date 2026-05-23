# Specification: Lifecycle Hooks Testing Plan (Core & Admin UI)

This specification outlines the testing architecture, validation scenarios, and test templates to verify both **Backend Database Hooks** (`packages/core`) and **Frontend Interactive UI Hooks** (`packages/admin`).

---

## 1. Objectives

- **Backend Reliability:** Ensure database hooks trigger in the correct sequence, pass modified data, and abort operations gracefully on errors.
- **Frontend Responsiveness:** Validate that client-side UI hooks react immediately to user input, receive the correct form context, and guard against circular reference loops.
- **Unified Test Automation:** Define standard testing environments for both Vitest (Node.js/Hono) and Vitest/Testing-Library (React/jsdom).

---

## 2. Backend Hook Testing Strategy (packages/core)

Backend hooks are evaluated during CRUD operations. We verify them by spawning a test server instance with spy functions registered on collections.

### 2.1 Core Test Scenarios
1. **Trigger Sequence:** Verify `beforeChange` runs before DB writes and `afterChange` runs after commit.
2. **Sequential Chaining:** Ensure that if multiple hooks are present, Hook 2 receives the transformed output of Hook 1.
3. **Execution Context:** Confirm hooks receive `{ data, originalDoc, user, req, operation }`.
4. **Operation Abort & Database Safety:** Verify that if a `beforeDelete` or `beforeChange` hook throws an error:
   - The operation is aborted.
   - The database adapter write method is never executed.
   - A `400` or `500` status code is returned.

### 2.2 Backend Test Template

```typescript
// packages/core/src/__tests__/hooks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryAdapter } from './mocks.js';
import { defineCollection } from '../index.js';

describe('Backend hooks verification', () => {
  let app: any;
  let db: InMemoryAdapter;
  
  const beforeChangeSpy = vi.fn(({ data }) => ({ ...data, suffix: 'processed' }));
  const afterChangeSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    db = new InMemoryAdapter();
    
    const posts = defineCollection({
      slug: 'posts',
      hooks: {
        beforeChange: [beforeChangeSpy],
        afterChange: [afterChangeSpy],
      },
      fields: [{ name: 'title', type: 'text', required: true }]
    });

    app = createApp({ collections: [posts], db, secret: 'test' });
  });

  it('should run beforeChange and transform data before database write', async () => {
    const res = await app.request('/api/collections/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A New Post' })
    });

    expect(res.status).toBe(201);
    expect(beforeChangeSpy).toHaveBeenCalled();
    
    const dbDocs = await db.find({ collection: 'posts' });
    expect(dbDocs.docs[0].suffix).toBe('processed');
    expect(afterChangeSpy).toHaveBeenCalled();
  });
});
```

---

## 3. Frontend UI Hook Testing Strategy (packages/admin)

Frontend UI hooks (`admin.hooks.onChange`) are evaluated in the browser as the user fills out forms. We verify them using React Testing Library to simulate user typing and interactions.

### 3.1 UI Test Scenarios
1. **Interactive Triggering:** Typing in Field A immediately executes `onChange` for Field B and updates Field B's value in the DOM.
2. **Context Integrity:** Verify the UI hook function receives `{ value, siblingData, setValue }`.
3. **Circular Reference Guard:** Confirm that if Field A updates Field B, and Field B's update triggers Field A, the engine detects and halts circular updates (prevents infinite render loops).
4. **Conditional Availability:** Ensure hooks do not execute or throw errors on hidden or unmounted fields.

### 3.2 Frontend UI Test Template

```tsx
// packages/admin/src/components/forms/__tests__/ui-hooks.test.tsx
import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormEngine } from '../form-engine';

describe('Frontend UI Hooks Reactivity', () => {
  it('should dynamically update slug field when title changes', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn(({ value }) => {
      return value.toLowerCase().replace(/\s+/g, '-');
    });

    const fields = [
      { name: 'title', type: 'text', label: 'Title' },
      {
        name: 'slug',
        type: 'text',
        label: 'Slug',
        admin: {
          hooks: {
            onChange: onChangeSpy
          }
        }
      }
    ];

    render(
      <FormEngine
        collection="posts"
        fields={fields}
        onSubmit={() => {}}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const slugInput = screen.getByLabelText('Slug') as HTMLInputElement;

    // Simulate typing in Title
    await user.type(titleInput, 'My First Post');

    // Assert that the onChange hook was evaluated and updated the slug value
    expect(onChangeSpy).toHaveBeenCalled();
    expect(slugInput.value).toBe('my-first-post');
  });
});
```
