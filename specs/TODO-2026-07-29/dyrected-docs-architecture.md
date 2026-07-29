# Proposed Dyrected Documentation Information Architecture

## 1. Documentation model

Dyrected should have:

* one documentation website;
* one persistent runtime selector;
* two runtime-specific documentation routes;
* shared source content where the concepts are identical;
* separate pages where Cloud and Self-hosted behave differently.

The selector should appear at the top of every documentation page:

**Runtime: Cloud | Self-hosted**

The selected runtime should control:

* sidebar navigation;
* page content;
* code examples;
* search results;
* internal links;
* quick-start instructions;
* troubleshooting guidance;
* AI documentation files.

Readers should never have to filter through both runtime implementations on the same page.

---

# 2. Recommended URL model

Use runtime-specific paths:

```text
/docs/cloud/...
/docs/self-hosted/...
```

Examples:

```text
/docs/cloud/getting-started
/docs/cloud/content-modeling/collections
/docs/cloud/content-operations/rules
/docs/cloud/content-operations/events

/docs/self-hosted/getting-started
/docs/self-hosted/content-modeling/collections
/docs/self-hosted/server-runtime/hooks
/docs/self-hosted/infrastructure/postgres
```

Even when a page uses shared source content, generate a route for each runtime:

```text
/docs/cloud/content-modeling/collections
/docs/self-hosted/content-modeling/collections
```

This gives every shared link explicit runtime context.

The implementation does not need two copies of the MDX file. Both routes can render the same shared source.

---

# 3. Documentation homepage

## Dyrected documentation

Introductory copy:

> Dyrected is a code-first content platform for custom websites. Choose how you want your content backend to run.

### Dyrected Cloud

> A managed content backend with hosted storage, content APIs, editor access, publishing workflows and content integrations.

Primary action:

> Start with Cloud

Secondary action:

> Explore Cloud

### Self-hosted Dyrected

> A developer-controlled backend runtime with full TypeScript hooks, database adapters, authentication collections and server-side customization.

Primary action:

> Start self-hosting

Secondary action:

> Explore Self-hosted

Additional links:

* Compare Cloud and Self-hosted
* Framework guides
* API reference
* Examples
* Troubleshooting

Cloud should be the default runtime when someone arrives from the main Dyrected website because it matches Dyrected’s main agency and client-handoff offer.

---

# 4. Shared top-level documentation pages

These pages sit above the runtime-specific documentation.

```text
Docs Home
├── What is Dyrected?
├── Cloud vs Self-hosted
├── Choose a Runtime
├── Product Principles
├── Supported Frameworks
├── Changelog
├── Migration Guides
├── Status and Known Limitations
└── Support
```

## What is Dyrected?

Explain the shared product:

* schema-defined structured content;
* generated admin;
* content APIs;
* media;
* permissions;
* preview;
* publishing workflows.

Then establish the deployment distinction:

> Dyrected Cloud is a managed content backend. Self-hosted Dyrected is a developer-controlled backend runtime.

## Cloud vs Self-hosted

This is the primary page where both runtimes appear side by side.

It should compare:

| Capability                      |    Cloud |              Self-hosted |
| ------------------------------- | -------: | -----------------------: |
| Content modelling               |      Yes |                      Yes |
| Generated admin                 |      Yes |                      Yes |
| Content API                     |  Managed | Runs in your application |
| Database                        |  Managed |     Developer configured |
| Media storage                   |  Managed |     Developer configured |
| Editor authentication           |      Yes |                      Yes |
| Application-user authentication |       No |                      Yes |
| Content rules                   |      Yes |                      Yes |
| Content events and webhooks     |      Yes |                      Yes |
| Arbitrary TypeScript hooks      |       No |                      Yes |
| Custom server endpoints         |       No |                      Yes |
| General application logic       | External |                Supported |
| Infrastructure maintenance      | Dyrected |                Developer |
| Full runtime control            |       No |                      Yes |

## Choose a Runtime

Use task-based guidance.

Choose Cloud when:

* you are adding editable content to a website;
* you do not want to operate a CMS server;
* clients need a safe admin;
* you need managed storage and content APIs;
* your application already owns its business logic.

Choose Self-hosted when:

* Dyrected must run inside your server;
* you need arbitrary TypeScript hooks;
* you need application-user authentication;
* you need direct database control;
* you want custom server endpoints or transactional business logic.

---

# 5. Dyrected Cloud documentation

```text
Dyrected Cloud
├── Start Here
├── Model Content
├── Deliver Content
├── Editor Experience
├── Publishing and Workflows
├── Content Rules and Integrations
├── Media
├── Framework Guides
├── Cloud Operations
├── Recipes and Examples
├── AI and Coding Agents
├── Reference
└── Troubleshooting
```

## 5.1 Start Here

```text
Start Here
├── What is Dyrected Cloud?
├── Cloud Quick Start
├── Create a Cloud Site
├── Install Dyrected
├── Connect Your Project
├── Define Your First Schema
├── Add Initial Content
├── Display Content
├── Add the Admin
├── Hand Off to Editors
└── Cloud Limits
```

### What is Dyrected Cloud?

Establish the boundary immediately:

> Dyrected Cloud hosts your website’s editable content infrastructure. It does not host your general application backend.

Show what Cloud owns:

* content storage;
* media;
* content APIs;
* editor accounts;
* roles;
* drafts;
* workflows;
* content rules;
* content events.

Show what the application owns:

* frontend rendering;
* application users;
* payments;
* transactions;
* business logic;
* product activity;
* application sessions.

### Cloud Quick Start

A short successful path:

1. Create a site.
2. Install the framework package.
3. Define content.
4. Sync the schema.
5. add initial content.
6. Fetch and display it.
7. Open the admin.
8. invite an editor.

Do not introduce JEXL, hooks, databases or deployment infrastructure during the initial quick start.

## 5.2 Model Content

```text
Model Content
├── Content Modelling Overview
├── Collections
├── Globals
├── Fields
│   ├── Text
│   ├── Textarea
│   ├── Rich Text
│   ├── Number
│   ├── Boolean
│   ├── Date and Time
│   ├── Email
│   ├── URL
│   ├── Select and Radio
│   ├── Multi-select
│   ├── Object
│   ├── Array
│   ├── Relationship
│   ├── Join
│   ├── Image and Upload
│   ├── JSON
│   └── Layout Fields
├── Reusable Blocks
├── Page Sections
├── Relationships
├── Navigation and Site Settings
├── Content Taxonomies
├── SEO Fields
├── Initial Data
├── Schema Evolution
└── Content Modelling Best Practices
```

This section should be mostly shared with Self-hosted Dyrected.

Cloud examples should use content such as:

* pages;
* articles;
* testimonials;
* FAQs;
* services;
* staff profiles;
* locations;
* product descriptions;
* announcements;
* documentation;
* navigation;
* site settings.

Avoid application examples such as orders, sessions, customer accounts and payment records.

## 5.3 Deliver Content

Rename the current **Managing Data** section to **Deliver Content**.

```text
Deliver Content
├── Overview
├── Typed SDK
│   ├── Create a Client
│   ├── Find Content
│   ├── Find by ID
│   ├── Filters
│   ├── Sorting
│   ├── Pagination
│   ├── Relationship Depth
│   └── Mutations
├── Content REST API
│   ├── Authentication
│   ├── Collections
│   ├── Globals
│   ├── Queries
│   ├── Errors
│   ├── OpenAPI
│   └── Client Generation
├── Displaying Field Types
├── Draft Content
├── Published Content
├── Caching and Revalidation
├── Public and Private Content
├── API Keys
└── TypeScript
    ├── Schema Inference
    └── Generated Types
```

Use “content” consistently instead of generic “data.”

## 5.4 Editor Experience

```text
Editor Experience
├── Admin Overview
├── Hosted Admin
├── Embedded Admin
├── Choosing an Admin Location
├── Editor Accounts
├── Inviting Editors
├── Roles and Permissions
├── Handing Off to Clients
├── Collection Lists
├── Editing Documents
├── Spreadsheet View
├── CSV Import and Export
├── Admin Preferences
├── Admin Branding
├── Custom CSS
├── Accessibility
├── Custom Field Components
├── Dashboard Components
├── List Components
├── Embedded Content Editing
└── Audit History
```

### Editor Accounts

Cloud authentication documentation should centre on:

* developers;
* agency team members;
* client administrators;
* editors;
* reviewers;
* viewers.

Do not teach Cloud users to use an auth collection as their customer identity provider.

### Embedded Content Editing

This replaces the Cloud version of **Custom App Surfaces**.

Valid examples:

* edit an announcement from a website dashboard;
* embed a blog editor;
* open a media picker inside a page;
* edit a product description;
* manage a landing-page section.

The object being edited should remain content.

## 5.5 Publishing and Workflows

```text
Publishing and Workflows
├── Overview
├── Drafts and Published Content
├── Autosave
├── Versions
├── Review and Approval
├── Custom Editorial Workflows
├── Scheduled Publishing
├── Preview URLs
├── Live Preview
│   ├── Overview
│   ├── Connect the Frontend
│   ├── Client-side Preview
│   ├── Server-side Preview
│   └── Click to Edit
├── Workflow Permissions
├── Workflow History
└── Publishing Events
```

Keep workflows explicitly editorial.

Examples should include:

* draft;
* in review;
* approved;
* scheduled;
* published;
* archived.

## 5.6 Content Rules and Integrations

This is the Cloud replacement for the current generic hooks section.

```text
Content Rules and Integrations
├── Overview
├── Content Rules
│   ├── Validation Rules
│   ├── Default Values
│   ├── Field Transformations
│   ├── Conditional Fields
│   ├── Computed Values
│   ├── Access Policies
│   └── Named Helpers
├── Declarative Expressions
│   ├── When to Use Expressions
│   ├── JEXL Syntax
│   ├── Available Context
│   ├── Supported Helpers
│   ├── Security Boundaries
│   └── Debugging Expressions
├── Content Events
│   ├── Document Created
│   ├── Document Updated
│   ├── Document Published
│   ├── Document Unpublished
│   ├── Document Deleted
│   ├── Asset Uploaded
│   └── Workflow Changed
├── Webhooks
│   ├── Create a Webhook
│   ├── Payloads
│   ├── Signatures
│   ├── Retries
│   ├── Delivery Logs
│   ├── Replay an Event
│   └── Test Events
├── Built-in Actions
│   ├── Revalidate a Website
│   ├── Send a Notification
│   ├── Update Related Content
│   └── Call an HTTP Endpoint
├── External Server Functions
│   ├── Vercel
│   ├── Netlify
│   ├── Cloudflare
│   ├── Supabase
│   └── Existing Application Server
└── Content Functions
    └── Reserved for the future hosted function feature
```

JEXL should be an advanced implementation option inside **Content Rules**, not the headline Cloud extension model.

The mental model should be:

```text
Simple condition             → Content rule
Content lifecycle side effect → Content event
External custom code          → Webhook
Hosted custom content code    → Future Content Function
```

## 5.7 Media

```text
Media
├── Overview
├── Media Collections
├── Uploading Files
├── Image Fields
├── Media Picker
├── Responsive Images
├── Image Sizes
├── File Validation
├── File Metadata
├── Using Media in the Frontend
├── Importing Media by URL
└── Storage Limits
```

Cloud should discuss managed media storage.

Storage adapters do not belong in this Cloud section.

## 5.8 Framework Guides

```text
Framework Guides
├── Next.js
│   ├── Overview
│   ├── Installation
│   ├── Create a Cloud Site
│   ├── Define a Schema
│   ├── Add Initial Content
│   ├── Display Content
│   ├── Add the Admin
│   ├── Add Live Preview
│   ├── Revalidate on Publish
│   └── Build Landing Pages
├── Nuxt
│   └── Same progression
├── React
│   └── Same progression
├── Vue
│   └── Same progression
└── Framework-agnostic SDK
```

Every framework quick start should show one runtime only.

The Cloud version should never introduce a self-hosted route handler as a secondary option halfway through installation.

## 5.9 Cloud Operations

```text
Cloud Operations
├── Cloud Architecture
├── Projects and Sites
├── Schema Sync
├── Environment Variables
├── API Credentials
├── Domains and Origins
├── Managed Content Storage
├── Managed Media Storage
├── Editor Sessions
├── Logs
├── Webhook Delivery Logs
├── Usage and Limits
├── Rate Limiting
├── Security
├── Backups and Recovery
├── Exporting Content
├── Moving to Self-hosted
└── Cloud Status
```

### Schema Sync

Explain:

* what is synchronized;
* what is not synchronized;
* validation before sync;
* breaking schema changes;
* initial data behaviour;
* field renames;
* environment differences.

Do not frame schema sync mainly as “which hooks get stripped.”

## 5.10 Cloud Recipes and Examples

```text
Recipes and Examples
├── Agency Website Handoff
├── Marketing Website
├── Portfolio Website
├── Blog
├── Knowledge Base
├── Documentation Site
├── Multi-location Website
├── Storefront Content
├── Product Catalogue
├── Reusable Landing Pages
├── Client-specific Content
├── Multi-site Agency Setup
├── Editorial Approval Workflow
├── Preview and Revalidation
├── Media Library
└── Migrating Existing Website Content
```

### Storefront Content

Cloud may manage:

* product descriptions;
* product media;
* collections;
* categories;
* campaign pages;
* banners;
* FAQs;
* size guides.

Cloud should not imply that it manages:

* checkout;
* orders;
* payments;
* carts;
* fulfilment;
* transactional inventory.

## 5.11 Cloud AI and Coding Agents

```text
AI and Coding Agents
├── Overview
├── Install the Dyrected Agent Skill
├── Cloud Agent Rules
├── Connect an Existing Website
├── Generate a Content Model
├── Preserve Existing Design
├── Extract Initial Content
├── Validate Generated Config
├── Common Agent Mistakes
└── Cloud llms.txt
```

Prominent instruction:

> Never generate Self-hosted server hooks, custom application endpoints or application-user authentication for a Dyrected Cloud project.

## 5.12 Cloud Reference

```text
Reference
├── Cloud Config Reference
├── CLI Reference
├── Schema Reference
├── Field Reference
├── Content Rule Reference
├── Named Policy Reference
├── Expression Reference
├── Event Reference
├── Webhook Payload Reference
├── SDK Reference
├── REST API Reference
├── Error Reference
└── Cloud Limits
```

## 5.13 Cloud Troubleshooting

```text
Troubleshooting
├── Schema Will Not Sync
├── Content Is Not Updating
├── Published Content Is Missing
├── Admin Will Not Load
├── Editor Cannot Sign In
├── Uploads Are Failing
├── Preview Is Not Working
├── Webhook Is Not Arriving
├── Expression Is Failing
├── CORS and Domain Problems
└── Framework-specific Problems
```

---

# 6. Self-hosted Dyrected documentation

```text
Self-hosted Dyrected
├── Start Here
├── Model Content
├── Deliver Content
├── Admin and Editors
├── Server Runtime
├── Authentication
├── Infrastructure
├── Publishing and Workflows
├── Media and Storage
├── Framework Integrations
├── Plugins and Extensions
├── Application Patterns
├── Deployment and Operations
├── AI and Coding Agents
├── Reference
└── Troubleshooting
```

## 6.1 Start Here

```text
Start Here
├── What is Self-hosted Dyrected?
├── Architecture
├── Requirements
├── Installation
├── Create a Config
├── Connect a Database
├── Configure Storage
├── Start the Server
├── Mount the Admin
├── Create Your First Collection
├── Add Authentication
└── Deploy to Production
```

## 6.2 Model Content

Use the same structure as Cloud:

```text
Model Content
├── Collections
├── Globals
├── Fields
├── Blocks
├── Relationships
├── Upload Collections
├── Initial Data
├── Indexes
├── Schema Evolution
└── Content Modelling Patterns
```

The source can be shared, but the selected examples should use Self-hosted imports and configuration.

## 6.3 Deliver Content

```text
Deliver Content
├── Local API
├── Typed SDK
├── REST API
├── OpenAPI
├── Server-side Queries
├── Client-side Queries
├── Accessing Draft Content
├── Relationship Depth
├── Filters
├── Sorting
├── Pagination
└── TypeScript
```

## 6.4 Admin and Editors

```text
Admin and Editors
├── Admin Overview
├── Mounting the Admin
├── Custom Admin Route
├── Editor Accounts
├── Admin SSO
├── Roles and Permissions
├── Custom CSS
├── Custom Fields
├── Custom Dashboard Components
├── Custom List Components
├── Custom Views
├── Custom Providers
├── Embedded Editing Surfaces
├── Spreadsheet View
├── Import and Export
└── Audit History
```

Self-hosted can retain broader embedded application surfaces.

## 6.5 Server Runtime

This is where the Payload-inspired functionality belongs.

```text
Server Runtime
├── Runtime Overview
├── Collection Hooks
├── Global Hooks
├── Field Hooks
├── Hook Context
├── Before and After Operations
├── Request Context
├── Database Access in Hooks
├── Transactions in Hooks
├── Side Effects
├── Background Work
├── Custom Endpoints
├── Middleware
├── Scheduled Jobs
├── Error Handling
├── Logging
├── Testing Hooks
└── Runtime Security
```

Do not call these generic hooks in Cloud documentation.

## 6.6 Authentication

```text
Authentication
├── Overview
├── Auth Collections
├── Editor Authentication
├── Application-user Authentication
├── Login and Logout
├── Current User
├── Invitations
├── Password Reset
├── Email Verification
├── JWT Strategy
├── Cookie Strategy
├── API Keys
├── Custom Strategies
├── Token Data
├── Session Revocation
├── Login Lockout
├── Admin SSO
└── External Token Verification
```

This is where the current broad authentication capabilities remain fully documented.

## 6.7 Infrastructure

```text
Infrastructure
├── Architecture
├── Database Adapters
│   ├── PostgreSQL
│   ├── MySQL
│   ├── MongoDB
│   └── SQLite
├── Database Indexes
├── Transactions
├── Migrations
├── Storage Adapters
├── Local File Storage
├── Object Storage
├── Email Adapters
├── Environment Variables
├── Secrets
└── Infrastructure Security
```

The current database adapter documentation already identifies these adapters as part of a Self-hosted Dyrected application, so moving them under this runtime makes the existing intention explicit.

## 6.8 Publishing and Workflows

Mostly shared with Cloud:

```text
Publishing and Workflows
├── Drafts
├── Versions
├── Autosave
├── Publishing
├── Custom Workflows
├── Workflow Hooks
├── Lifecycle Events
├── Scheduled Publishing
├── Preview
└── Audit History
```

The Self-hosted version may include arbitrary TypeScript handlers.

## 6.9 Media and Storage

```text
Media and Storage
├── Upload Collections
├── Storage Adapters
├── Local Storage
├── S3-compatible Storage
├── Image Processing
├── Responsive Sizes
├── Media Hooks
├── Custom Upload Flows
├── File Validation
└── Serving Media
```

## 6.10 Framework Integrations

```text
Framework Integrations
├── Next.js
│   ├── Overview
│   ├── Installation
│   ├── Route Handler
│   ├── Server Runtime
│   ├── Admin
│   ├── Content Fetching
│   ├── Preview
│   └── Deployment
├── Nuxt
│   ├── Module Setup
│   ├── Server Handler
│   ├── Admin
│   └── Deployment
├── React Frontend
├── Vue Frontend
└── Framework-agnostic SDK
```

Plain React and Vue should be presented as frontends connected to a separately hosted Self-hosted Dyrected server.

## 6.11 Plugins and Extensions

```text
Plugins and Extensions
├── Overview
├── Plugin Architecture
├── Build a Plugin
├── Plugin API
├── SEO
├── Redirects
├── Search
├── Import and Export
├── Nested Documents
├── Multi-tenant
├── Form Builder
├── MCP
├── Sentry
├── Stripe
└── Community Plugins
```

Do not place incomplete plugin placeholder pages in the main navigation or generated `llms` files until usable documentation exists.

The current map exposes many `__` placeholder routes and coming-soon pages for ecommerce, plugins, rich text and versioning. These should be excluded from public navigation, site search and AI indexes until published.

## 6.12 Application Patterns

```text
Application Patterns
├── General Backend Patterns
├── User-owned Records
├── Role-based Applications
├── Multi-workspace SaaS
├── Internal Admin Tools
├── Customer Portals
├── Booking Applications
├── Form Workflows
├── Ecommerce Applications
├── Support and Ticketing
└── Custom Application Surfaces
```

These patterns should be marked clearly:

> Self-hosted only

This is where the existing application-shaped examples can live without confusing Cloud users.

## 6.13 Deployment and Operations

```text
Deployment and Operations
├── Production Architecture
├── Deployment Overview
├── Building Without a Database
├── Environment Configuration
├── Database Migrations
├── Persistent Storage
├── Scaling
├── Performance
├── Logging and Observability
├── Metrics and Tracing
├── Rate Limiting
├── Preventing Abuse
├── Backups
├── Health Checks
├── Updating Dyrected
└── Production Checklist
```

## 6.14 Self-hosted AI and Coding Agents

```text
AI and Coding Agents
├── Overview
├── Install the Agent Skill
├── Self-hosted Agent Rules
├── Generate a Config
├── Add a Database Adapter
├── Generate Hooks
├── Add Authentication
├── Build Custom Endpoints
├── Validate Generated Code
├── Common Agent Mistakes
└── Self-hosted llms.txt
```

## 6.15 Self-hosted Reference

```text
Reference
├── Config Reference
├── CLI Reference
├── Schema Reference
├── Field Reference
├── Hook Reference
├── Hook Context Reference
├── Access Control Reference
├── Authentication API
├── Database Adapter Contract
├── Storage Adapter Contract
├── Plugin API
├── SDK Reference
├── REST API Reference
└── Error Reference
```

---

# 7. Recipe classification

Every recipe should have runtime metadata.

## Shared recipes

* page builder;
* navigation;
* site settings;
* category taxonomy;
* media library;
* draft and review workflow;
* live preview;
* SEO fields;
* reusable page sections;
* relationship modelling;
* safe field renaming.

## Cloud recipes

* agency website handoff;
* revalidate a page after publishing;
* call an external function from a content event;
* client-specific site permissions;
* managed media;
* embedded content editing;
* Cloud schema sync;
* import an existing website’s content.

## Self-hosted recipes

* application-user authentication;
* user-owned records;
* workspace isolation;
* payment hooks;
* transactional updates;
* custom API endpoints;
* custom backend workflows;
* customer dashboards;
* support tickets;
* full ecommerce backend.

Current intent-index entries about customer complaints, customer dashboards, user-owned records and tenant-isolated application data should be routed to Self-hosted documentation rather than appearing in the Cloud experience.

---

# 8. Runtime selector behaviour

## Selection

The runtime selector should:

* be visible in the documentation header;
* default to Cloud for new visitors;
* remember the selection locally;
* update the URL;
* update the sidebar immediately;
* preserve the current topic when switching.

Example:

```text
/docs/cloud/content-modeling/collections
```

Switching runtime should navigate to:

```text
/docs/self-hosted/content-modeling/collections
```

## Unsupported equivalent

When there is no equivalent page, do not silently send the user to a homepage.

Example:

A Cloud user opens:

```text
/docs/self-hosted/server-runtime/custom-endpoints
```

Show:

> Custom endpoints require Self-hosted Dyrected. In Cloud, connect your endpoint using a content event or webhook.

Provide actions:

* Switch to Self-hosted
* Read about Cloud webhooks

## Framework preference

Runtime and framework should be separate preferences:

```text
Runtime:   Cloud | Self-hosted
Framework: Next.js | Nuxt | React | Vue
```

The user should see only one runtime and one framework’s primary example at a time.

---

# 9. Page metadata

Every documentation page should have structured frontmatter.

```yaml
title: Collection Hooks
runtime:
  - self-hosted
audience:
  - developer
category: server-runtime
status: stable
frameworks:
  - all
cloudAlternative:
  title: Content Events
  href: /docs/cloud/content-operations/events
```

For shared pages:

```yaml
runtime:
  - cloud
  - self-hosted
sourceType: shared
```

Recommended fields:

* `runtime`
* `audience`
* `status`
* `frameworks`
* `category`
* `cloudAlternative`
* `selfHostedAlternative`
* `previousRoute`
* `keywords`
* `llms`
* `search`

This metadata should generate:

* navigation;
* runtime redirects;
* availability badges;
* search indexes;
* `llms` files;
* comparison tables.

---

# 10. AI documentation architecture

Provide four files.

```text
/llms.txt
/llms-cloud.txt
/llms-self-hosted.txt
/llms-full.txt
```

## `/llms.txt`

A short router:

* what Dyrected is;
* the two runtimes;
* how to select the correct file;
* the core boundary between content and application logic.

## `/llms-cloud.txt`

Only include:

* Cloud-supported concepts;
* Cloud code examples;
* content rules;
* content events;
* Cloud authentication boundaries;
* Cloud SDK and APIs;
* Cloud quick starts.

Exclude:

* arbitrary function hooks;
* database adapters;
* application-user authentication;
* custom server endpoints;
* generic backend patterns.

## `/llms-self-hosted.txt`

Include:

* complete runtime;
* hooks;
* databases;
* auth collections;
* endpoints;
* transactions;
* infrastructure;
* application patterns.

## `/llms-full.txt`

Include both, but every entry must be labelled:

```text
[Shared]
[Cloud]
[Self-hosted]
```

The current `llms.txt` is a canonical flat map and begins immediately with individual documentation pages rather than establishing the runtime distinction. The replacement should teach the boundary before presenting links.

---

# 11. Current section migration map

| Current section        | Proposed location                                                      | Action                                   |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Getting Started        | Runtime-specific Start Here                                            | Split                                    |
| Concepts               | Shared Model Content introduction                                      | Keep and rewrite                         |
| Configuration          | Shared project configuration                                           | Keep with runtime variants               |
| Fields                 | Model Content                                                          | Keep                                     |
| Access Control         | Roles and Permissions                                                  | Adapt examples by runtime                |
| Hooks                  | Cloud Rules/Events and Self-hosted Server Runtime                      | Split completely                         |
| Database               | Self-hosted Infrastructure                                             | Move                                     |
| Managing Data          | Deliver Content                                                        | Rename                                   |
| REST API               | Deliver Content                                                        | Keep and reframe as content API in Cloud |
| Admin                  | Editor Experience                                                      | Keep                                     |
| Authentication         | Cloud Editor Accounts and Self-hosted Authentication                   | Split                                    |
| Audit                  | Editor Experience / Operations                                         | Keep                                     |
| Custom Components      | Admin customization                                                    | Keep with runtime boundaries             |
| Email                  | Editor notifications in Cloud; email adapter in Self-hosted            | Split                                    |
| Live Preview           | Publishing and Workflows                                               | Keep                                     |
| Upload                 | Cloud Media and Self-hosted Media/Storage                              | Split                                    |
| Workflows              | Publishing and Workflows                                               | Keep                                     |
| Deployment             | Self-hosted Deployment and Operations                                  | Move                                     |
| Common Patterns        | Runtime-aware Recipes                                                  | Reorganize                               |
| Custom App Surfaces    | Embedded Content Editing in Cloud; Application Surfaces in Self-hosted | Split                                    |
| Ecommerce              | Storefront Content in Cloud; Ecommerce Application in Self-hosted      | Split                                    |
| Plugins                | Primarily Self-hosted until Cloud-safe plugins exist                   | Move                                     |
| Framework Integrations | Runtime-specific Framework Guides                                      | Split                                    |
| Quick Starts           | Runtime + framework matrix                                             | Rebuild                                  |
| Coding Agents          | Runtime-specific AI sections                                           | Split                                    |
| Troubleshooting        | Runtime-specific troubleshooting                                       | Split                                    |

---

# 12. Recommended sidebar order

Do not organise the documentation primarily by internal package architecture.

Use the order in which a developer succeeds.

## Cloud sidebar

```text
Start Here
Model Content
Deliver Content
Editor Experience
Publishing and Workflows
Content Rules and Integrations
Media
Framework Guides
Recipes
Cloud Operations
AI and Coding Agents
Reference
Troubleshooting
```

## Self-hosted sidebar

```text
Start Here
Model Content
Deliver Content
Admin and Editors
Server Runtime
Authentication
Publishing and Workflows
Media and Storage
Framework Integrations
Plugins and Extensions
Application Patterns
Infrastructure
Deployment and Operations
AI and Coding Agents
Reference
Troubleshooting
```

---

# 13. Recommended implementation order

## Phase 1: Establish the boundary

1. Add the runtime selector.
2. Add Cloud versus Self-hosted.
3. Add runtime metadata to every page.
4. Create separate sidebars.
5. Create separate `llms` files.
6. Remove unpublished placeholder pages from navigation and AI indexes.

## Phase 2: Split the confusing features

1. Split hooks into Cloud Content Rules, Cloud Content Events and Self-hosted Server Hooks.
2. Split authentication into Cloud Editor Accounts and Self-hosted Authentication Collections.
3. Move database and production deployment into Self-hosted.
4. Split Custom App Surfaces.
5. Split ecommerce examples.

## Phase 3: Rebuild the onboarding paths

1. Create a Cloud-first successful quick start.
2. Create a separate Self-hosted quick start.
3. Rebuild framework guides around runtime selection.
4. Remove mixed-runtime code examples.
5. Add migration guidance between runtimes.

## Phase 4: Strengthen Cloud

1. Document content events.
2. Document signed webhooks.
3. Document retries and delivery logs.
4. Add framework revalidation recipes.
5. Add external serverless function guides.
6. Later introduce Content Functions if the product supports them.

---

# 14. The central documentation rule

Every page should answer this before showing code:

> Which runtime am I using, and where does this code execute?

The content model can remain shared.

The implementation must remain runtime-specific.

The resulting product story becomes:

> Dyrected gives both runtimes the same structured content model and editor experience. Cloud provides managed content infrastructure. Self-hosted provides the complete developer-controlled server runtime.
