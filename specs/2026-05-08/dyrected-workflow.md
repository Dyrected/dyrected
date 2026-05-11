# Dyrected Developer Workflow

This document describes the recommended workflow for building, testing, and integrating Dyrected into your applications.

---

## 1. Development Modes

### A. Embedded Mode (Next.js / Nuxt)

This is the fastest workflow. The Dyrected API runs inside your framework's dev server.

1.  Run your app: `pnpm dev`.
2.  The API is live at `/dyrected`.
3.  The Admin UI is live at `/cms` (or wherever you mounted it).
4.  **Testing**: You can test your SDK calls directly in your components. They hit the same process.

### B. Standalone Mode (Cloud or Separate Server)

Use this when building SPAs (React/Vue/Vite) or when you want a centralized CMS for multiple apps.

1.  Run Dyrected standalone: `pnpm --filter @dyrected/core dev`.
2.  The API is live at `localhost:4000`.
3.  **Testing**: Initialize your SDK with the local URL:
    ```ts
    const dyrected = createClient({ endpoint: "http://localhost:4000/api" });
    ```

---

## 2. The "Type-Safe" Cycle

Whenever you change your content model in `dyrected.config.ts`, follow this cycle:

1.  **Modify Config**: Add a field or collection to `dyrected.config.ts`.
2.  **Generate Types**: Run `pnpm dyrected generate:types`. This creates `dyrected-types.d.ts`.
3.  **Develop**: Your IDE and the `@dyrected/sdk` now have full autocomplete for the new fields.

---

## 3. Testing with the SDK

To test your implementation without a browser, you can use a simple node script or a Vitest suite.

```ts
// tests/cms.test.ts
import { createClient } from "@dyrected/sdk";

const sdk = createClient({
  endpoint: "http://localhost:3000/dyrected",
  apiKey: process.env.DYRECTED_API_KEY,
});

async function test() {
  const posts = await sdk.collections.find("posts");
  console.log(`Found ${posts.totalDocs} posts`);
}
```

---

## 4. Monorepo Examples

The Dyrected monorepo includes a set of "Starter Templates" in the `examples/` directory. These serve as both documentation and integration tests.

| Directory                | Framework    | Strategy                       |
| ------------------------ | ------------ | ------------------------------ |
| `examples/next-embedded` | Next.js      | Embedded (Self-hosted)         |
| `examples/nuxt-embedded` | Nuxt         | Embedded (Self-hosted)         |
| `examples/react-cloud`   | React + Vite | Cloud-Connected (External API) |
| `examples/vue-cloud`     | Vue + Vite   | Cloud-Connected (External API) |

### How to use examples:

1.  `cd examples/next-embedded`
2.  `pnpm install`
3.  `pnpm dev`
4.  Navigate to `localhost:3000/cms` to see the pre-configured admin.

---

## 5. Continuous Integration (CI)

In your CI pipeline, ensure you run the type generator before your build step:

```yaml
steps:
  - run: pnpm install
  - run: pnpm dyrected generate:types
  - run: pnpm build
```
