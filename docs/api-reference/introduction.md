---
title: API Introduction
description: Overview of the Dyrected REST and SDK APIs.
---

Dyrected provides multiple ways to interact with your data, whether you're building a frontend, a backend service, or an automated script.

## Core API Principles

- **RESTful:** Our HTTP API follows standard REST conventions.
- **JSON-First:** All request and response bodies are JSON.
- **Predictable:** Slugs used in your config are directly reflected in the API paths.

## Authentication

Dyrected supports two primary authentication methods:

1. **Site API Keys:** Used for programmatic access from your server-side code. Pass this in the `x-api-key` header.
2. **JWT Tokens:** Used for user authentication in the Admin UI and client-side apps. Pass this in the `Authorization: Bearer <token>` header.

## Choosing Your Path

- **Using Next.js or Nuxt?** Use the built-in composables and `baseDb` adapter for the best experience.
- **Building a custom client?** Use the REST API endpoints or our auto-generated OpenAPI spec.
- **AI Agent?** Point your agent to the OpenAPI spec for instant integration capabilities.
