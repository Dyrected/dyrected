---
title: OpenAPI Specification
description: Technical API definitions for developers and AI.
---

Every Dyrected project automatically generates a comprehensive OpenAPI 3.0 specification based on your custom content model.

## Accessing the Spec

You can access your live OpenAPI specification at the following endpoint on your Dyrected instance:

```bash
GET /api/openapi.json
```

## Interactive Documentation

We also provide a built-in Swagger UI for interactive testing and exploration:

```bash
GET /api/docs
```

## Why OpenAPI?

- **AI Prompting:** Provide the URL to an AI agent (like ChatGPT or Cursor) so it can understand your data structures perfectly.
- **SDK Generation:** Use tools like `openapi-generator` to create typed clients for any programming language.
- **Validation:** Ensure your requests match the expected schema before they even reach your server.

> The OpenAPI spec is dynamically generated at runtime from your config — it updates automatically whenever you change your `dyrected.config.ts`.
