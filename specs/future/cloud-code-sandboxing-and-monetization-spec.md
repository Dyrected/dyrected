# Dyrected Cloud: Secure Code Execution, Sandboxing & Monetization Spec

**Status:** Proposed / Future Architecture & Business Model  
**Package:** `@dyrected/cloud-runtime`, `@dyrected/plugin-visual-builder`  
**Inspiration:** Supabase Functions, Cloudflare Workers, Directus Enterprise, Strapi Open-Core  

---

## 1. The Cloud Dilemma: Declarative JEXL vs. Custom JavaScript

In self-hosted Dyrected, developers have full control: they write native TypeScript functions for hooks, custom endpoints, and server actions.

In **Dyrected Cloud** (multi-tenant managed backend), allowing users to execute arbitrary JavaScript presents critical security and stability risks:
- Risk of infinite loops (`while(true)`) or memory exhaustion (OOM crashes affecting other tenants).
- Risk of unauthorized file system access (`fs.readFileSync('/etc/passwd')`) or internal network probing.
- Noisy neighbors consuming 100% of CPU.

### The Evolution from JEXL to Sandboxed JS
Currently, Dyrected Cloud uses **JEXL / JSON declarative rules** for safety. However, advanced business logic (e.g., custom webhook hashing, signature verification, complex calculations) requires real JavaScript execution.

---

## 2. Multi-Tenant Code Execution: Architectural Options

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SANDBOXING STRATEGY COMPARISON                                         │
├───────────────────────────────┬───────────────────────────────┬────────────────────────────────────────┤
│ Architecture                  │ Pros                          │ Cons / Best Fit                        │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ **Option 1: V8 Isolates**     │ • Sub-millisecond startup     │ • Cannot access arbitrary Node APIs    │
│ (`isolated-vm` or QuickJS)    │ • Zero infrastructure cost    │ • Best for: Field computed hooks,      │
│                               │ • Strict CPU/RAM limits       │   flow transforms, custom validation   │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ **Option 2: Micro-VMs**       │ • Full Node.js ecosystem      │ • Cold starts (50–200ms)               │
│ (Cloudflare Workers / Lambda) │ • Native npm module support   │ • Best for: Custom serverless API      │
│                               │ • True OS-level isolation     │   endpoints, external webhooks         │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ **Option 3: Dedicated**       │ • Identical to Self-Hosted    │ • Cost: ~$3–$5/mo per tenant           │
│ **Containers (Fly.io / K8s)** │ • Persistent process & cache  │ • Best for: Dedicated Cloud Pro tier   │
│                               │ • Custom Docker extensions    │   ($29+/mo plans)                      │
└───────────────────────────────┴───────────────────────────────┴────────────────────────────────────────┤
```

### Recommended Bootstrap Architecture (The 2-Tier Strategy)

1. **Tier 1 (Free / Starter Cloud): V8 Isolate Sandbox (`isolated-vm`)**
   - Runs in-process within Dyrected Cloud.
   - Each script runs in an isolated V8 context with hard memory (32MB) and execution timeout (50ms for hooks, 2,000ms for flows/crons) limits.
   - We inject a safe standard library (`fetch`, `crypto`, `context`, `db.find`).
   - No filesystem, no process access. Cost = $0 extra infra.

2. **Tier 2 (Pro / Enterprise Cloud): Dedicated Container (Fly.io Machines)**
   - When a customer upgrades to Pro ($29/mo), an automated API spins up a dedicated 256MB/512MB Fly.io micro-VM running their complete Dyrected app.
   - Instant deployment, custom plugins, full Node.js runtime, zero multi-tenant security worries.

---

## 3. Sandboxing & Cron Strategy Comparison

In a multi-tenant cloud, scheduled background jobs (e.g., daily client digests, recurring invoice checks, cleanup tasks) cannot use simple `setInterval` or `node-cron` timers because unisolated scripts would block the main event loop and crash when workers sleep.

| Architecture | How Cron Is Triggered & Executed | Multi-Tenant Isolation & Safety | Infra Cost | Best Fit |
| :--- | :--- | :--- | :---: | :--- |
| **Option 1: Central Queue + V8 Isolates** *(Recommended)* | A single central scheduler (BullMQ / PgBoss in `apps/cloud`) polls due cron schedules every minute and dispatches the script into an **isolated V8 sandbox** (`isolated-vm`). | 🔒 **High**: Hard 2,000ms timeout and 32MB RAM ceiling per execution. Crashing or hung scripts are killed without affecting other tenants. | 🟢 **$0 extra** (Runs on existing shared worker pool) | **Starter & Free Cloud**: Daily email digests, cleanup scripts, invoice reminders. |
| **Option 2: Serverless HTTP Scheduler** (Upstash QStash / EventBridge) | An external HTTP scheduler calls `POST /api/cloud/cron/:tenantId` with a signed webhook token. Executes inside a stateless serverless function. | 🔒 **Very High**: Complete operating runtime boundary per HTTP invocation. | 🟢 **Pennies** ($1 per 1M executions) | **Serverless Cloud**: Webhooks, scheduled syncs, external CRM triggers. |
| **Option 3: Dedicated Container Daemon** (Fly.io / K8s) | The customer’s dedicated micro-VM runs its own internal `node-cron` daemon or system cron independently. | 🛡️ **Total Isolation**: Full independent Linux/Node environment. | 🔴 **~$3–$5/mo per tenant** | **Pro / Enterprise Cloud**: Heavy data exports, hourly ETL pipelines, intensive AI batch processing. |

### Multi-Tenant Cron Execution Lifecycle (Central Scheduler + V8 Isolate)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TENANT CRON ARCHITECTURE                                │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │ ⏰ 1. Central Scheduler (BullMQ / Postgres Cron Table)                          │   │
│   │    • Stores cron expressions: `0 9 * * 1` (Every Monday 9 AM for Tenant X)     │   │
│   │    • Ticks every 60 seconds and pushes due jobs to background queue             │   │
│   └────────────────────────────────────────┬────────────────────────────────────────┘   │
│                                            │                                            │
│                                            ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │ ⚡ 2. Background Worker Pool (V8 Isolate Runner)                                 │   │
│   │    • Pulls job for Tenant X                                                     │   │
│   │    • Injects tenant-scoped DB client (`db.find()`, `sendEmail()`)               │   │
│   │    • Runs in `isolated-vm` with strict 2,000ms execution timeout                │   │
│   │    • Logs execution result & errors in `_dyrected_cron_logs`                    │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Open-Core Monetization & Licensing Model

To bootstrap profitably without giving away high-value visual features for free on GitHub:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                DYRECTED OPEN-CORE MODEL                                │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 🟢 FREE OPEN SOURCE (MIT License on GitHub)                                    │   │
│   │   • Core Headless CMS Engine (`@dyrected/core`)                                │   │
│   │   • Standard REST & GraphQL APIs (`/api/collections`, `/api/graphql`)          │   │
│   │   • Standard Admin Dashboard with Side-by-Side Live Preview                    │   │
│   │   • Open Source Community Plugins (Paystack, Resend, Basic Forms)              │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 💎 PRO / COMMERCIAL EXTENSIONS (License Key / Paid Plugin)                     │   │
│   │   • 🎨 True In-Line Visual Canvas Editing (`@dyrected/plugin-visual-builder`)  │   │
│   │   • ⚡ Visual Action Flows Canvas & Debugger (`@dyrected/plugin-flows-pro`)    │   │
│   │   • 🏢 White-Label Agency Branding (Custom domain & client portal logos)       │   │
│   │   • ☁️ Included FREE on Dyrected Cloud Pro ($29/mo) / $299 Self-Hosted Key     │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### How Paid Plugins Work in Code

1. **Private NPM / Registry:**  
   The Visual Builder (`@dyrected/plugin-visual-builder`) is published to a private registry or downloaded upon license purchase.
2. **License Key Activation:**
   ```ts
   // dyrected.config.ts
   import { visualBuilderPlugin } from '@dyrected/plugin-visual-builder'

   export default defineConfig({
     plugins: [
       visualBuilderPlugin({
         licenseKey: process.env.DYRECTED_LICENSE_KEY, // validated against api.dyrected.com
       }),
     ],
   })
   ```
3. **Cloud Synergy:**  
   Users on Dyrected Cloud automatically get all Pro plugins enabled without needing to buy separate licenses, driving recurring subscription revenue to your cloud.
