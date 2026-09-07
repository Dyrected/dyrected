# Visual Flows & Action Automations Engine Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/flows`, `@dyrected/core`, `@dyrected/admin`  
**Inspiration:** Directus Flows, n8n, Zapier, Retool Workflows  

---

## 1. Overview & Problem Statement

In operational business apps (such as AgencyOS, Event/Wedding Management, Client Portals), managing content is only half the battle. Business operations require **event-driven automations**:

- When a client submits an intake form $\rightarrow$ automatically create a project, assign team members, spawn template-specific tasks, and send a welcome email.
- When a wedding guest RSVPs $\rightarrow$ send a calendar invite, check capacity thresholds, and notify the catering coordinator if dietary restrictions are flagged.
- When a project template is selected (e.g. *Website Redesign* vs *Logo Branding*) $\rightarrow$ generate a tailored checklist of internal and client-facing deliverables.

Without a built-in workflow engine, developers must write ad-hoc server code or hook up third-party tools like Zapier for basic operations.

### The Solution: Dyrected Flows

A visual, node-based automation engine built directly into Dyrected that lets developers and business operators configure event triggers, logic branches, and multi-step actions without writing boilerplate code.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DYRECTED FLOWS VISUAL CANVAS                                            [ Active 🟢 ]  │
│                                                                                        │
│   ┌──────────────────────────┐                                                         │
│   │ ⚡ Trigger               │                                                         │
│   │ Collection: "projects"   │                                                         │
│   │ Event: "created"         │                                                         │
│   └────────────┬─────────────┘                                                         │
│                │                                                                       │
│                ▼                                                                       │
│   ┌──────────────────────────┐                                                         │
│   │ 🔀 Branch Condition      │                                                         │
│   │ If `type == 'website'`   │                                                         │
│   └──────┬────────────┬──────┘                                                         │
│          │ (True)     │ (False)                                                        │
│          ▼            ▼                                                                │
│   ┌─────────────┐   ┌─────────────┐                                                    │
│   │ 📝 Spawn    │   │ 📝 Spawn    │                                                    │
│   │ Website     │   │ Brand/Logo  │                                                    │
│   │ Tasks (5)   │   │ Tasks (3)   │                                                    │
│   └──────┬──────┘   └──────┬──────┘                                                    │
│          │                 │                                                           │
│          └────────┬────────┘                                                           │
│                   │                                                                    │
│                   ▼                                                                    │
│   ┌──────────────────────────┐                                                         │
│   │ ✉️ Send Email            │                                                         │
│   │ Template: Client Welcome │                                                         │
│   │ To: `{{client.email}}`   │                                                         │
│   └──────────────────────────┘                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Node Architecture

A Flow is represented as a directed acyclic graph (DAG) stored in a system collection (`_dyrected_flows`):

```json
{
  "id": "flow_auto_project_onboarding",
  "name": "Auto Project Onboarding & Task Generator",
  "status": "active",
  "trigger": {
    "type": "event:collection",
    "options": {
      "collection": "projects",
      "action": "create"
    }
  },
  "nodes": [
    {
      "id": "check_type",
      "type": "condition",
      "options": {
        "rule": "{{ $trigger.data.serviceType }} == 'website_build'"
      }
    },
    {
      "id": "create_website_tasks",
      "type": "operation:create_records",
      "options": {
        "collection": "tasks",
        "batch": [
          { "title": "Wireframes & Sitemap", "projectId": "{{ $trigger.data.id }}", "isClientFacing": true },
          { "title": "Setup Hosting & DNS", "projectId": "{{ $trigger.data.id }}", "isClientFacing": false },
          { "title": "Final Review & Signoff", "projectId": "{{ $trigger.data.id }}", "isClientFacing": true }
        ]
      }
    },
    {
      "id": "notify_client",
      "type": "operation:send_email",
      "options": {
        "to": "{{ $trigger.data.clientEmail }}",
        "subject": "Welcome to your new project portal!",
        "template": "client-portal-welcome"
      }
    }
  ]
}
```

---

## 3. Supported Triggers & Operations

### 3.1 Triggers (The "When")

- **Collection Events:** `item.create`, `item.update`, `item.delete` (with pre/post change payloads).
- **Public Form Submission:** Direct submission from landing page / client intake forms.
- **Webhook Listener:** External webhooks from Stripe, GitHub, Typeform, Calendly.
- **Cron / Scheduled Timer:** Daily/weekly recurring jobs (e.g. send project status summary every Monday at 9am).
- **Manual Dashboard Button:** Custom action buttons added to document header in Admin UI (e.g. *"Generate Invoices"* or *"Export Guest Badges"*).

### 3.2 Operations (The "What")

- **Create / Update / Delete Records:** In any collection or global.
- **Transform & JEXL / Script Step:** Format dates, calculate totals, split strings.
- **Conditional Branching (If / Else / Switch):** Diverge execution paths based on record fields.
- **Send Notifications:** Emails (Resend/SendGrid), SMS (Twilio), Slack/Discord webhooks.
- **HTTP Request:** Call any external REST API with dynamic payload interpolation.

---

## 4. Role & Visibility Integration (Internal vs. Client Portal)

For apps like AgencyOS or Wedding Portals:

- Tasks and deliverables created by flows can carry field-level flags: `isClientFacing: true | false`.
- Client role permissions automatically filter:
  - Internal developers see all 15 project setup tasks.
  - The client logging into their portal only sees the 3 client-facing approval milestones.

---

## 5. Visual Flow Editor in Admin UI

1. **Canvas Component:** Built with `@xyflow/react` (React Flow) providing smooth zooming, panning, node connection handles, and mini-map.
2. **Interactive Node Config Drawer:** Clicking any node slides out a configuration panel with field dropdowns and auto-suggest for payload variables (`{{ $trigger.data.name }}`).
3. **Flow Execution Logs & Debugger:** View a live audit trail of past runs, step-by-step execution times, input/output JSON payloads, and error replays.
