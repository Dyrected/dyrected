# Payload Docs Navigation Reference

This file records the Payload docs sidebar structure from inspected serialized page data.

- Primary source of truth:
  - `/Users/busola/.codex/attachments/9b62f657-7673-431d-9b7f-3ffbf3e09767/pasted-text.txt`
  - this contains the serialized `topics` array used by the docs page
- Secondary supporting source:
  - `/Users/busola/.codex/attachments/dd9a1472-a5f5-40c0-99e7-a61688785995/pasted-text.txt`
  - this confirms the rendered accordion DOM structure
- Date reviewed: `2026-07-07`

## Conclusion

Yes. This second attachment helps a lot more.

The first pasted file proved the rendered accordion layout and top-level order.
This second pasted file exposes the actual serialized navigation data, which includes:

1. group labels
2. topic order
3. topic slugs
4. every child doc item
5. child item order

That makes it the authoritative source for mirroring Payload's docs nav.

## Navigation shape

Payload's docs nav is a grouped accordion with these top-level groups:

1. Basics
2. Managing Data
3. Features
4. Ecosystem
5. Deployment

Each group contains topics. Each topic contains ordered docs.

## Exact structure

### Basics

#### Getting Started

1. What is Payload?
2. Use Cases
3. Concepts
4. Installation

#### Configuration

1. Overview
2. Collections
3. Globals
4. I18n
5. Localization
6. Environment Variables

#### Database

1. Overview
2. Migrations
3. Transactions
4. Indexes
5. MongoDB
6. Postgres
7. SQLite

#### Fields

1. Overview
2. Array
3. Blocks
4. Checkbox
5. JSON
6. Code
7. Collapsible
8. Date
9. Email
10. Group
11. Number
12. Point
13. Radio Group
14. Relationship
15. Rich Text
16. Join
17. Row
18. Select
19. Tabs
20. Text
21. Textarea
22. UI
23. Upload

#### Access Control

1. Overview
2. Collections
3. Globals
4. Fields

#### Hooks

1. Overview
2. Collections
3. Globals
4. Fields
5. Context

### Managing Data

#### Local API

1. Overview
2. Outside Next.js
3. Server Functions
4. Access Control

#### REST API

1. Overview

#### GraphQL

1. Overview
2. Custom Queries and Mutations
3. GraphQL Schema

#### Queries

1. Overview
2. Sort
3. Select
4. Depth
5. Pagination

### Features

#### Admin

1. Overview
2. Preview
3. Custom Admin Panel Location
4. Document Locking
5. Accessibility
6. React Hooks
7. Customizing CSS
8. Preferences
9. Metadata

#### Custom Components

1. Overview
2. Root Components
3. Custom Providers
4. Customizing Views
5. Dashboard
6. Document Views
7. Edit View
8. List View

#### Authentication

1. Overview
2. Operations
3. Email Verification
4. JWT Strategy
5. Cookie Strategy
6. API Key Strategy
7. Custom Strategies
8. Token Data

#### Rich Text

1. Overview
2. Converters
3. Converting JSX
4. Converting HTML
5. Converting Markdown
6. Converting Plaintext
7. Official Features
8. Blocks
9. Custom Features
10. Rendering On Demand
11. Views
12. Migration
13. Slate (legacy)

#### Live Preview

1. Overview
2. Frontend
3. Server-side
4. Client-side

#### Versions

1. Overview
2. Drafts
3. Autosave

#### Upload

1. Overview
2. Storage Adapters

#### Folders

1. Overview

#### Email

1. Overview

#### Jobs Queue

1. Overview
2. Quick Start Example
3. Tasks
4. Workflows
5. Jobs
6. Queues
7. Schedules

#### Query Presets

1. Overview

#### Trash

1. Overview

#### Troubleshooting

1. Troubleshooting

#### TypeScript

1. Overview
2. Generating Types
3. TypeScript Plugin

### Ecosystem

#### Plugins

1. Overview
2. Build Your Own
3. Advanced Plugin API
4. Form Builder
5. Import Export
6. MCP
7. Multi-Tenant
8. Nested Docs
9. Redirects
10. Search
11. Sentry
12. SEO
13. Stripe

#### Ecommerce

1. Overview
2. Plugin
3. Frontend
4. Payment Adapters
5. Advanced

#### Examples

1. Overview

#### Integrations

1. Vercel Content Link

### Deployment

#### Production

1. Building without a DB connection
2. Deployment
3. Preventing Abuse

#### Performance

1. Overview

## Best-fit data model

```ts
const documentationNav = [
  {
    group: 'Basics',
    topics: [
      {
        title: 'Getting Started',
        slug: 'getting-started',
        items: ['What is Payload?', 'Use Cases', 'Concepts', 'Installation'],
      },
      {
        title: 'Configuration',
        slug: 'configuration',
        items: ['Overview', 'Collections', 'Globals', 'I18n', 'Localization', 'Environment Variables'],
      },
      {
        title: 'Database',
        slug: 'database',
        items: ['Overview', 'Migrations', 'Transactions', 'Indexes', 'MongoDB', 'Postgres', 'SQLite'],
      },
      {
        title: 'Fields',
        slug: 'fields',
        items: ['Overview', 'Array', 'Blocks', 'Checkbox', 'JSON', 'Code', 'Collapsible', 'Date', 'Email', 'Group', 'Number', 'Point', 'Radio Group', 'Relationship', 'Rich Text', 'Join', 'Row', 'Select', 'Tabs', 'Text', 'Textarea', 'UI', 'Upload'],
      },
      {
        title: 'Access Control',
        slug: 'access-control',
        items: ['Overview', 'Collections', 'Globals', 'Fields'],
      },
      {
        title: 'Hooks',
        slug: 'hooks',
        items: ['Overview', 'Collections', 'Globals', 'Fields', 'Context'],
      },
    ],
  },
  {
    group: 'Managing Data',
    topics: [
      {
        title: 'Local API',
        slug: 'local-api',
        items: ['Overview', 'Outside Next.js', 'Server Functions', 'Access Control'],
      },
      {
        title: 'REST API',
        slug: 'rest-api',
        items: ['Overview'],
      },
      {
        title: 'GraphQL',
        slug: 'graphql',
        items: ['Overview', 'Custom Queries and Mutations', 'GraphQL Schema'],
      },
      {
        title: 'Queries',
        slug: 'queries',
        items: ['Overview', 'Sort', 'Select', 'Depth', 'Pagination'],
      },
    ],
  },
  {
    group: 'Features',
    topics: [
      {
        title: 'Admin',
        slug: 'admin',
        items: ['Overview', 'Preview', 'Custom Admin Panel Location', 'Document Locking', 'Accessibility', 'React Hooks', 'Customizing CSS', 'Preferences', 'Metadata'],
      },
      {
        title: 'Custom Components',
        slug: 'custom-components',
        items: ['Overview', 'Root Components', 'Custom Providers', 'Customizing Views', 'Dashboard', 'Document Views', 'Edit View', 'List View'],
      },
      {
        title: 'Authentication',
        slug: 'authentication',
        items: ['Overview', 'Operations', 'Email Verification', 'JWT Strategy', 'Cookie Strategy', 'API Key Strategy', 'Custom Strategies', 'Token Data'],
      },
      {
        title: 'Rich Text',
        slug: 'rich-text',
        items: ['Overview', 'Converters', 'Converting JSX', 'Converting HTML', 'Converting Markdown', 'Converting Plaintext', 'Official Features', 'Blocks', 'Custom Features', 'Rendering On Demand', 'Views', 'Migration', 'Slate (legacy)'],
      },
      {
        title: 'Live Preview',
        slug: 'live-preview',
        items: ['Overview', 'Frontend', 'Server-side', 'Client-side'],
      },
      {
        title: 'Versions',
        slug: 'versions',
        items: ['Overview', 'Drafts', 'Autosave'],
      },
      {
        title: 'Upload',
        slug: 'upload',
        items: ['Overview', 'Storage Adapters'],
      },
      {
        title: 'Folders',
        slug: 'folders',
        items: ['Overview'],
      },
      {
        title: 'Email',
        slug: 'email',
        items: ['Overview'],
      },
      {
        title: 'Jobs Queue',
        slug: 'jobs-queue',
        items: ['Overview', 'Quick Start Example', 'Tasks', 'Workflows', 'Jobs', 'Queues', 'Schedules'],
      },
      {
        title: 'Query Presets',
        slug: 'query-presets',
        items: ['Overview'],
      },
      {
        title: 'Trash',
        slug: 'trash',
        items: ['Overview'],
      },
      {
        title: 'Troubleshooting',
        slug: 'troubleshooting',
        items: ['Troubleshooting'],
      },
      {
        title: 'TypeScript',
        slug: 'typescript',
        items: ['Overview', 'Generating Types', 'TypeScript Plugin'],
      },
    ],
  },
  {
    group: 'Ecosystem',
    topics: [
      {
        title: 'Plugins',
        slug: 'plugins',
        items: ['Overview', 'Build Your Own', 'Advanced Plugin API', 'Form Builder', 'Import Export', 'MCP', 'Multi-Tenant', 'Nested Docs', 'Redirects', 'Search', 'Sentry', 'SEO', 'Stripe'],
      },
      {
        title: 'Ecommerce',
        slug: 'ecommerce',
        items: ['Overview', 'Plugin', 'Frontend', 'Payment Adapters', 'Advanced'],
      },
      {
        title: 'Examples',
        slug: 'examples',
        items: ['Overview'],
      },
      {
        title: 'Integrations',
        slug: 'integrations',
        items: ['Vercel Content Link'],
      },
    ],
  },
  {
    group: 'Deployment',
    topics: [
      {
        title: 'Production',
        slug: 'production',
        items: ['Building without a DB connection', 'Deployment', 'Preventing Abuse'],
      },
      {
        title: 'Performance',
        slug: 'performance',
        items: ['Overview'],
      },
    ],
  },
]
```

## Confidence

- High confidence:
  - group labels
  - topic order
  - child item order
  - child labels
  - topic slugs
  - accordion-based information architecture

This is now strong enough to use as the mirror reference for reorganizing Dyrected docs navigation.
