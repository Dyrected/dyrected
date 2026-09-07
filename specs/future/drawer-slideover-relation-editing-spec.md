# In-Place Slideover (Sheet/Drawer) Editing for Relationships & Joins

**Status:** Proposed / Future  
**Package:** `@dyrected/admin`, `@dyrected/core`  
**Inspiration:** Directus Item Drawer, Linear Issue Sub-task Drawer, Notion Side Peek  

---

## 1. Overview & Problem Statement

In complex operational setups like **AgencyOS**, a parent document (e.g. a `projects` record) typically contains a list of child items (e.g. `tasks`, `invoices`, or `milestones`) mapped via a `join` or `relationship` field:

### Current Dyrected Behavior:
When a user clicks on a task inside a Project's task list:
1. The browser navigates completely away from `/admin/collections/projects/123` to `/admin/collections/tasks/456`.
2. The user loses their context, scroll position, and open tabs on the project page.
3. To return, the user must click back and wait for the Project page to reload.

### Proposed Improvement: In-Place Slideover Sheet (Drawer)
Clicking any related row, sub-task, or virtual list item opens an **in-context Sheet/Drawer** from the right side of the screen over the current document.

```
┌───────────────────────────────────────────────────┬───────────────────────────────┐
│ PROJECT: Website Redesign & SEO                   │ TASK: Wireframes & Sitemap    │
│ Client: Acme Corp         Status: In Progress     │ ───────────────────────────── │
│                                                   │ Status: [ In Progress ▾ ]     │
│ ┌─ TASKS (Join List) ───────────────────────────┐ │ Assignee: @alex               │
│ │ [✓] Discovery Call                   Alex     │ │ Due Date: Oct 15, 2026        │
│ │ [▶] Wireframes & Sitemap (Active) ◀─ Alex     │ │ Client-Facing: [x] Yes        │
│ │ [ ] Frontend Development             Sara     │ │                               │
│ │ [ ] Deploy to Staging                Dave     │ │ Description:                  │
│ └───────────────────────────────────────────────┘ │ Create low-fidelity wireframes│
│                                                   │ for homepage and checkout.    │
│ Project Budget: $12,500                           │                               │
│ Client Contact: john@acme.com                     │ [ Save Task ]    [ Close ✕ ]  │
└───────────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 2. Key UX & Technical Requirements

1. **Non-destructive In-Place Editing:**  
   The parent document remains loaded and active in the background. The user can edit, toggle checkmarks, reassign, or add comments to child tasks without losing unsaved changes in the parent document.

2. **Recursive / Stacked Drawers:**  
   If a task drawer contains an attached sub-item (e.g. an attached receipt or time-log), opening it pushes a second drawer onto the stack (`Drawer depth: 2`) with an intuitive breadcrumb bar (`Project > Task > Time Log`).

3. **URL State Synchronization:**  
   The drawer state is reflected in the URL query string (e.g. `?drawer=tasks:456`), allowing users to refresh or share direct links to child items while preserving parent context.

4. **Optimistic Parent List Refresh:**  
   When changes in the drawer are saved, the parent's Join / Virtual list updates immediately without requiring a full page refresh.
