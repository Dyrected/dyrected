# GraphQL API Architecture Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/core` (server), `@dyrected/sdk` (client)  
**Inspiration:** Directus GraphQL Engine, Payload GraphQL, Apollo/Yoga Schema Stitching  

---

## 1. Overview & Motivation

Dyrected provides a powerful, REST-based HTTP API and an in-process Server API for managing collections and singletons (globals). While REST is ideal for standard CRUD operations, modern frontends, mobile applications, and multi-platform consumers often benefit significantly from **GraphQL**:

1. **Selective Field Fetching (No Over-fetching):** Clients request only the exact fields required by the active UI view, reducing payload size and network bandwidth.
2. **Deep Relationship Traversal in a Single Roundtrip:** Rather than coordinating multiple REST requests or tuning query-level depth parameters, clients define the exact relational graph they need in a single query.
3. **Strict Type Safety & Code Generation:** Native support for schema introspection allows automatic TypeScript type generation via `@graphql-codegen` on the frontend.
4. **Interactive Playground & Tooling:** Instant developer productivity via embedded GraphQL Playground / Apollo Sandbox / Yoga GraphiQL.
5. **Directus & Headless CMS Parity:** Directus and Payload CMS offer first-class dual REST/GraphQL interfaces. Providing GraphQL in Dyrected brings complete API parity and architectural flexibility.

---

## 2. Core Concepts & Endpoints

Dyrected's GraphQL API is mounted alongside the REST API:

- **GraphQL Endpoint:** `POST /api/graphql`
- **Interactive Explorer (Dev Mode):** `GET /api/graphql` (GraphiQL / Yoga Studio)

```
                       ┌───────────────────────────────┐
                       │       Incoming Request        │
                       └───────────────┬───────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
         POST /api/collections/*               POST /api/graphql
             (REST Controller)                (GraphQL Server/Yoga)
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │     CollectionService &       │
                       │        GlobalService          │
                       │  (Access, Hooks, Workflows,   │
                       │     Validation, Adapters)     │
                       └───────────────────────────────┘
```

The GraphQL layer acts strictly as a **transport adapter**. It never bypasses access control, field hooks, workflow draft materialization, or database sanitization.

---

## 3. Dynamic Schema Generation

On server boot (or whenever dynamic collections are synced), Dyrected dynamically constructs the GraphQL `GraphQLSchema` from the `DyrectedConfig` definition.

### 3.1 Type Generation from Collections

For each collection in `config.collections` (e.g. `posts`):

- **Object Type (`Post`):** Generated with scalar fields mapped from Dyrected field definitions:
  - `text`, `textarea`, `email`, `select` $\rightarrow$ `String`
  - `number` $\rightarrow$ `Float` or `Int`
  - `checkbox` $\rightarrow$ `Boolean`
  - `json`, `dynamic-block` $\rightarrow$ `JSON` (custom scalar)
  - `date`, `datetime` $\rightarrow$ `DateTime` (ISO string scalar)
  - `relationship` $\rightarrow$ Target collection object type or list of object types
- **Input Types:**
  - `PostInput`: for create and update mutations
  - `PostWhereInput`: nested filtering predicates matching Dyrected's `WhereClause`
  - `PostSortInput`: sorting criteria (`field: ASC | DESC`)
- **Connection / List Types (`PostConnection` / `PostPaginated`):**
  ```graphql
  type PostConnection {
    docs: [Post!]!
    totalDocs: Int!
    limit: Int!
    page: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }
  ```

### 3.2 Type Generation from Globals

For each global singleton in `config.globals` (e.g. `pricing`, `site-settings`):

- **Object Type (`PricingGlobal`, `SiteSettingsGlobal`):** Generated fields matching singleton schema.
- **Input Type (`PricingGlobalInput`):** For singleton update mutations.

---

## 4. GraphQL Query & Mutation Schema Example

Given a sample `dyrected.config.ts`:

```ts
export default defineConfig({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'textarea' },
        { name: 'author', type: 'relationship', relationTo: 'users' },
      ],
    },
  ],
  globals: [
    {
      slug: 'pricing',
      fields: [
        { name: 'monthlyPlan', type: 'number' },
        { name: 'yearlyPlan', type: 'number' },
        { name: 'currency', type: 'text' },
      ],
    },
  ],
})
```

The generated GraphQL schema:

```graphql
scalar JSON
scalar DateTime

type Query {
  # Collections
  posts(
    where: PostWhereInput
    limit: Int
    page: Int
    sort: String
    depth: Int
  ): PostConnection!
  
  post(id: ID!, depth: Int): Post
  
  postsCount(where: PostWhereInput): Int!

  # Globals
  pricing(depth: Int): PricingGlobal!
}

type Mutation {
  # Collection Mutations
  createPost(data: PostInput!, draft: Boolean): Post!
  updatePost(id: ID!, data: PostInput!, draft: Boolean): Post!
  deletePost(id: ID!): DeleteResult!
  deleteManyPosts(where: PostWhereInput!): DeleteManyResult!

  # Global Mutations
  updatePricing(data: PricingGlobalInput!): PricingGlobal!
}

type Post {
  id: ID!
  title: String!
  content: String
  author: User
  createdAt: DateTime!
  updatedAt: DateTime!
}

input PostWhereInput {
  title: StringFilterInput
  createdAt: DateFilterInput
  AND: [PostWhereInput!]
  OR: [PostWhereInput!]
}

input StringFilterInput {
  equals: String
  not_equals: String
  contains: String
  in: [String!]
  not_in: [String!]
  exists: Boolean
}
```

---

## 5. Execution Pipeline & Security

1. **Authentication:**  
   The GraphQL handler extracts the Bearer token / session cookie using Dyrected's standard `authMiddleware`. The authenticated `user` is attached to GraphQL `context`.

2. **Access Control:**  
   - Resolvers invoke `resolveCollectionAccess` and `applyFieldReadAccess`.
   - Unauthorized fields are returned as `null` or excluded from the response payload, consistent with GraphQL specs.
   - If an entire query/mutation is forbidden, an error is appended to `errors`.

3. **Field Hooks & Lifecycles:**  
   - `beforeRead` and `afterRead` hooks execute during resolver field resolution.
   - `beforeValidate`, `beforeChange`, and `afterChange` execute during mutations.

4. **Batching & N+1 Prevention:**  
   - Nested relationship fields leverage **DataLoader** to batch relational database queries across documents in a single GraphQL tick.

5. **Query Complexity & Depth Limits:**  
   - Configurable `maxDepth` (e.g. 8 levels) and `maxComplexity` to prevent denial-of-service via recursive circular relationship queries.

---

## 6. Implementation Plan

### Phase 1: Core Engine Integration
- Add lightweight GraphQL execution library (e.g. `@graphql-yoga` or `graphql-js` with Hono adapter).
- Build schema generator `packages/core/src/graphql/schema-builder.ts` converting `CollectionConfig[]` and `GlobalConfig[]` to AST.

### Phase 2: Query & Mutation Resolvers
- Wire query resolvers to `CollectionService` and `GlobalService`.
- Wire mutations (`create`, `update`, `delete`, `updateGlobal`).
- Integrate DataLoader for batched relational lookups.

### Phase 3: Client SDK Support
- Add `client.graphql(query, variables)` helper in `@dyrected/sdk`.
- Document schema export CLI (`dyrected generate:graphql-schema`) for frontend CI/CD.
