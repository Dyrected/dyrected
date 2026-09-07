# Marketplace, Plugins & Niche Operational Templates Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/cli`, `@dyrected/core`, `@dyrected/admin`  
**Inspiration:** Directus AgencyOS, Shopify App Store, WordPress Theme/Plugin Ecosystem, Ghost Themes  

---

## 1. Vision & Strategy

Dyrected is positioned not merely as a generic headless developer tool, but as an **operational backbone and business platform** for agencies, creators, freelancers, and business owners.

### 1.1 The Opportunity: Niche Business Templates (The "OS" Model)
Instead of forcing every user to design collections, fields, access rules, and frontends from scratch, Dyrected provides **turnkey operational solutions** for vertical industries:

1. **Wedding & Event OS:**
   - Pre-built collections: `guests`, `rsvp_groups`, `meal_preferences`, `seating_tables`, `itinerary_items`, `photo_stream`.
   - Client-facing RSVP form with real-time capacity checks.
   - Admin dashboards tracking meal counts, dietary restrictions, and attendance metrics.
2. **Coach & Consultant OS:**
   - Pre-built collections: `clients`, `programs`, `session_notes`, `resource_library`, `intake_forms`, `testimonials`.
   - Client portal frontend with downloadable resources and Calendly/Stripe embed integrations.
3. **AgencyOS:**
   - Pre-built collections: `clients`, `projects`, `deliverables`, `invoices`, `team_members`, `client_feedback`.
   - Ready-to-use client dashboard for project milestone approvals and invoice downloads.
4. **Creator & Micro-SaaS OS:**
   - Pre-built collections: `newsletter_issues`, `subscribers`, `sponsors`, `changelog_entries`, `documentation_articles`.

---

## 2. Template Architecture & Anatomy

A Dyrected Template is a self-contained, version-controlled bundle containing everything needed to spin up both the CMS backend and a matching modern frontend:

```
templates/wedding-os/
├── template.json                # Metadata, author, version, dependencies
├── dyrected.config.ts           # Collections, globals, access rules, workflow states
├── seed/
│   ├── assets/                  # Starter sample photography / icons
│   └── data.json                # Seed rows for demoing out of the box
├── admin/                       # Custom dashboard widgets, metric cards, navigation
└── web/                         # Ready-to-deploy Next.js / Nuxt frontend theme
```

### 2.1 Manifest Definition (`template.json`)

```json
{
  "name": "wedding-os",
  "title": "Wedding & Event Manager OS",
  "version": "1.0.0",
  "author": {
    "name": "Dyrected Core / Community",
    "url": "https://dyrected.com"
  },
  "category": "Events & Weddings",
  "description": "Complete guest list management, RSVP tracking, seating arrangements, and live photo stream.",
  "features": [
    "Smart RSVP group management with dietary constraints",
    "QR-code check-in helper for day-of coordinators",
    "Live dynamic photo wall with visitor upload moderation"
  ],
  "requirements": {
    "dyrected": ">=1.0.0"
  }
}
```

### 2.2 Instant Installation Flow

#### Via CLI:
```bash
# Spin up an entire new project with template pre-configured
npx @dyrected/create my-wedding --template wedding-os
```

#### Via Admin UI (In-App Template Gallery):
1. In the Dyrected Admin Dashboard, navigate to **Settings $\rightarrow$ Templates & Marketplace**.
2. Browse curated categories (*Agencies*, *Events*, *Coaching*, *E-Commerce*, *Publications*).
3. Click **"Apply Template"**:
   - The installer creates collections, fields, and globals non-destructively.
   - Populates initial dummy/seed data with sample photography.
   - Configures preset dashboard analytics widgets.

---

## 3. Plugin Architecture

Plugins allow developers to package reusable server logic, custom fields, admin widgets, and third-party integrations into installable npm packages (`@dyrected/plugin-*`).

### 3.1 Plugin Anatomy

```ts
// Example: dyrected-plugin-stripe-billing/src/index.ts
import { definePlugin } from '@dyrected/core'

export interface StripePluginOptions {
  apiKey: string
  webhookSecret: string
}

export const stripePlugin = (options: StripePluginOptions) => 
  definePlugin({
    name: 'stripe-billing',
    // 1. Extend Collections
    collections: [
      {
        slug: 'subscriptions',
        admin: { group: 'Billing' },
        fields: [
          { name: 'stripeCustomerId', type: 'text', readOnly: true },
          { name: 'status', type: 'select', options: ['active', 'past_due', 'canceled'] },
          { name: 'currentPeriodEnd', type: 'datetime' },
        ],
      },
    ],
    // 2. Custom Server Endpoints
    endpoints: [
      {
        path: '/stripe/webhook',
        method: 'post',
        handler: async (c) => { /* handle Stripe events */ },
      },
    ],
    // 3. Custom Admin UI Components & Widgets
    admin: {
      widgets: [
        {
          component: './components/RevenueChartWidget',
          position: 'dashboard-top',
        },
      ],
    },
  })
```

---

## 4. Community, Content & Creator Monetization Strategy

To build network effects and community flywheel momentum:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMMUNITY FLYWHEEL                              │
│                                                                        │
│   1. Build High-Value Niche Template (e.g. WeddingOS, CoachOS)         │
│                        │                                               │
│                        ▼                                               │
│   2. Publish YouTube Tutorial / TikTok Breakdown                       │
│      ("How I built a $5k/mo Wedding Planning SaaS with Dyrected")      │
│                        │                                               │
│                        ▼                                               │
│   3. Viewers install template via CLI / Cloud 1-Click                  │
│                        │                                               │
│                        ▼                                               │
│   4. Commercial Expansion (Paid Templates, Cloud Hosting, Pro Plans)   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Step-by-step Video Playbooks:**  
   Produce actionable video tutorials demonstrating how developers and freelancers build and sell full solutions to local businesses and clients using Dyrected.
2. **Community Marketplace:**  
   Allow certified community creators to publish templates and plugins, establishing revenue share for premium plugins and themes.
3. **Enterprise & Agency Custom Branding:**  
   Provide white-labeling options allowing agencies to brand the Dyrected dashboard with their own client logos and styling.
