# Dyrected Docs Navigation Proposal

This file defines the new Dyrected documentation navigation structure.

It is based on Payload's top-level grouping model, with one intentional addition:

1. Basics
2. Quick Start Guides
3. Managing Data
4. Features
5. Ecosystem
6. Deployment

The key decision is that `Quick Start Guides` becomes a first-class top-level group instead of being buried under `Basics` or `Getting Started`.

Date: `2026-07-08`

## Reference model

Payload's top-level groups are:

1. Basics
2. Managing Data
3. Features
4. Ecosystem
5. Deployment

Dyrected should keep that overall shape, but insert `Quick Start Guides` between `Basics` and `Managing Data`.

## Sidebar behavior

- top-level groups are always visible
- each group contains accordion topics
- opening one topic closes sibling topics in the same group
- pages appear only when a topic is expanded

This should feel very close to Payload's docs navigation.

## Proposed top-level groups

1. Basics
2. Quick Start Guides
3. Managing Data
4. Features
5. Ecosystem
6. Deployment

## Exact proposed structure

### Basics

#### Getting Started

1. What is Dyrected?
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

### Quick Start Guides

#### Coding Agents & AI App Builders

1. Setting Up Your Cloud Site
2. Add dyrected skill to your agent
3. Using the dyrected prompt

#### Next.js Quick Start

1. Overview
2. Setting Up Your Cloud Site
3. Installing Dyrected
4. Defining a Schema
5. Setting Up Initial Data
6. Displaying Content in Next.js
7. Inviting Editors


#### Nuxt.js Quick Start

1. Overview
2. Setting Up Your Cloud Site
3. Installing Dyrected
4. Defining a Schema
5. Setting Up Initial Data
6. Displaying Content in Vue.js
7. Inviting Editors

#### Vue.js Quick Start

1. Setting Up Your Cloud Site
2. Installing Dyrected
3. Defining a Schema
4. Setting Up Initial Data
5. Displaying Content in Vue.js
6. Inviting Editors

#### React.js Quick Start

1. Setting Up Your Cloud Site
2. Installing Dyrected
3. Defining a Schema
4. Setting Up Initial Data
5. Displaying Content in React
6. Inviting Editors

### Managing Data

#### SDK API

1. Overview
2. Sort
3. Filter
4. Depth
5. Pagination

#### REST API

1. Overview

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

## Why this structure works

- It keeps Payload's top-level mental model intact.
- It adds one Dyrected-specific entry group for onboarding by user type and framework.
- It avoids introducing extra top-level groups for concerns that Payload already contains successfully inside `Basics`, `Managing Data`, or `Features`.
- It gives quickstarts enough prominence to become a primary entry path instead of a side topic.

## Best-fit data model

```ts
type DocumentationPage = {
  title: string
  slug: string
}

type DocumentationTopic = {
  title: string
  slug: string
  pages: DocumentationPage[]
}

type DocumentationGroup = {
  title: string
  slug: string
  topics: DocumentationTopic[]
}

type DocumentationNav = DocumentationGroup[]
```

## Example nav shape

```ts
const documentationNav: DocumentationNav = [
  {
    title: 'Basics',
    slug: 'basics',
    topics: [
      {
        title: 'Getting Started',
        slug: 'getting-started',
        pages: [
          { title: 'What is Dyrected?', slug: 'what-is-dyrected' },
          { title: 'Use Cases', slug: 'use-cases' },
          { title: 'Concepts', slug: 'concepts' },
          { title: 'Installation', slug: 'installation' },
        ],
      },
    ],
  },
  {
    title: 'Quick Start Guides',
    slug: 'quick-start-guides',
    topics: [
      {
        title: 'Next.js Quick Start',
        slug: 'nextjs-quick-start',
        pages: [
          { title: 'Overview', slug: 'overview' },
          { title: 'Cloud Setup', slug: 'cloud-setup' },
          { title: 'Self Hosted', slug: 'self-hosted' },
        ],
      },
    ],
  },
]
```
