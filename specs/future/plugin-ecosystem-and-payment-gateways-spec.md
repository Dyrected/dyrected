# Plugin Ecosystem, Payment Gateways & Form Builder Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/core`, `@dyrected/plugins`, `@dyrected/admin`  
**Inspiration:** WordPress Plugin Ecosystem, Directus Extensions, Shopify App Store  

---

## 1. Mental Model: Plugins vs. Templates

To build a thriving ecosystem where developers and community members can contribute, monetize, and build solutions, Dyrected establishes a clean distinction between **Plugins** and **Templates**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 DYRECTED TEMPLATE                                │
│                   (e.g., "AgencyOS" or "Wedding & Event OS")                     │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │ 📦 PRE-INSTALLED PLUGINS                                                 │   │
│   │   ├── 💳 @dyrected/plugin-paystack / stripe (Payments & Subscriptions)   │   │
│   │   ├── 📝 @dyrected/plugin-form-builder (Client Intake & RSVPs)           │   │
│   │   ├── ✉️ @dyrected/plugin-notifications (Email/WhatsApp Alerts)          │   │
│   │   └── 🌐 @dyrected/plugin-seo (Social Previews & Meta Tags)              │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │ 🗄️ COLLECTIONS, GLOBALS & WORKFLOWS                                      │   │
│   │   ├── Collections: `projects`, `tasks`, `invoices`, `clients`            │   │
│   │   ├── Globals: `company_settings`, `pricing_tiers`                       │   │
│   │   └── Seed Data & Tailored Admin Dashboard Widgets                       │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │ 🖥️ STARTER FRONTEND THEME                                                 │   │
│   │   └── Full Next.js / Nuxt Website + Client Portal UI                     │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

* **A Plugin** is a reusable, modular capability (like a payment gateway, form builder, or email sender). Plugins can be installed into *any* Dyrected project with `npm i @dyrected/plugin-*`.
* **A Template** is an entire turnkey business solution (like AgencyOS or WeddingOS) that combines pre-configured schemas, dashboard layouts, frontends, and **bundles relevant plugins together**.

---

## 2. Core Plugin Specifications

### 2.1 Payment Plugins: Paystack & Stripe (`@dyrected/plugin-paystack`, `@dyrected/plugin-stripe`)

Enables e-commerce, invoice payments, ticket sales, and subscriptions with zero custom backend coding.

* **Key Capabilities:**
  - **Checkout Session Generator:** Create one-time payment links and recurring subscription checkouts.
  - **Built-in Webhook Listener:** Automatically verifies webhook signatures (`/api/plugins/paystack/webhook`), updates payment records, and triggers events (e.g. mark invoice as *Paid*, or confirm wedding ticket).
  - **Payment Block Component:** A ready-to-use frontend Block component (`<PaystackButton amount={...} />` / `<StripeCheckout />`) that can be dropped into dynamic page blocks.
  - **Currency Support:** Full international support including NGN, USD, GBP, EUR, KES, GHS, ZAR.

### 2.2 Visual Form Builder & Form Block (`@dyrected/plugin-form-builder`)

Allows editors and business owners to create custom forms (contact forms, client intake, RSVP inquiries, feedback surveys) directly inside the Admin dashboard without developer intervention.

* **Key Capabilities:**
  - **Drag-and-Drop Form Editor:** Add fields (`Text`, `Email`, `Phone`, `Date`, `Dropdown`, `File Upload`, `Checkbox`, `Hidden Field`).
  - **Dynamic Form Block:** Exposes a `<FormBlock formId="..." />` component for rendered websites.
  - **Submission Management:** Stores all entries in a dedicated `_form_submissions` collection with CSV export, spam protection (reCAPTCHA / Turnstile), and instant email alerts.
  - **Flow Integration:** When a form is submitted, it can trigger a Dyrected Flow (e.g. spawn tasks, notify team, create project).

### 2.3 Notification & Multi-Channel Messaging (`@dyrected/plugin-notifications`)

Connects Dyrected to transactional communication providers.

* **Channels Supported:**
  - **Email:** Resend, SendGrid, Postmark, AWS SES, SMTP.
  - **Chat & SMS:** WhatsApp Business API, Twilio SMS, Slack Webhooks, Discord Alerts.
* **Key Capabilities:**
  - Dynamic email template builder with `{{ variable }}` placeholder interpolation.
  - Delivery logs and bounce tracking in Admin UI.

### 2.4 SEO & Social Metadata Plugin (`@dyrected/plugin-seo`)

Gives editors complete control over search engine and social media optimization.

* **Key Capabilities:**
  - **Google SERP & Social Card Live Preview:** Real-time preview of how a post or landing page will look on Google search, Twitter, and LinkedIn.
  - **Automated OpenGraph (OG) Image Generation:** Dynamically generates branded social banner images on the fly based on title, author, and category.
  - **Sitemap & Robots Generator:** Automatic `/sitemap.xml` and `/robots.txt` endpoints.

---

## 3. Dynamic Blocks That "Do More"

Dyrected's Block Field architecture is expanded so that page layouts can contain interactive dynamic blocks alongside static text and media:

| Block Type | Capabilities |
| :--- | :--- |
| **`formBlock`** | Select any created Form from the Form Builder plugin $\rightarrow$ renders the interactive form with client-side validation. |
| **`pricingTableBlock`** | References live global pricing (`globals.pricing`) with toggleable monthly/annual billing and direct Paystack/Stripe checkout buttons. |
| **`dynamicListBlock`** | Query and display collections (e.g. latest 3 case studies, top FAQ accordions, team roster) with filtering. |
| **`embedBlock`** | Calendly booking, YouTube/Vimeo video, Google Maps, or custom code snippet. |

---

## 4. Community & Plugin Marketplace Distribution

1. **Standard Plugin Interface (`definePlugin`):**
   ```ts
   // dyrected.config.ts
   import { paystackPlugin } from '@dyrected/plugin-paystack'
   import { formBuilderPlugin } from '@dyrected/plugin-form-builder'

   export default defineConfig({
     plugins: [
       paystackPlugin({ secretKey: process.env.PAYSTACK_SECRET_KEY! }),
       formBuilderPlugin(),
     ],
   })
   ```
2. **Community Ecosystem:**
   Developers can publish custom plugins to npm with the tag `dyrected-plugin`. The Dyrected Admin dashboard dynamically discovers and indexes published plugins for 1-click installation.
