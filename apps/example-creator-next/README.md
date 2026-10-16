This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Custom admin components (demo)

The admin has a **Seating Chart** view under *Guest Operations* that shows the custom components
feature working end to end:

| Piece | Where |
| --- | --- |
| The view: `layout: "custom"`, `component`, `options`, `data.fetchAll` | `seatingChartView` in `dyrected.config.ts` |
| The layout and a slot component | `src/admin-components/seating-chart.tsx` |
| Registration under the keys the config uses | `src/app/admin/admin-client.tsx` |

Components are functions, so `src/app/admin/page.tsx` renders a small client wrapper instead of passing
them from a server component.

To try it, rebuild the workspace packages after pulling (`pnpm build:packages` from the repo root), run
`pnpm dev`, and open `/admin`. Then:

- **Search and filters.** The Filter menu, match all/any and search above the chart are the same ones the
  table uses. Click a KPI card to filter the chart.
- **Move a guest.** Pick another table in a guest's dropdown. The guest moves straight away and rolls back
  with a toast if the server refuses. Guests with no table show under *Not seated*.
- **Actions.** Row actions such as *Check in* run through Dyrected's own confirm dialog and form.
- **Slot.** The line above the chart is a `beforeViewContent` slot that reads the same documents.
- **Fallback.** Rename the key in `admin-client.tsx` to see the "layout is unavailable" card and its
  *Show as table* button.
- **Replace a built-in.** Add `viewLayouts: { kanban: MyKanban }` to render your own kanban in Dyrected's
  shell.

## Custom Admin Pages (Executive Operations Hub demo)

The admin includes a full **Custom Admin Page** defined directly in `config.admin.navigation` via `definePage(...)`:

| Piece | Where |
| --- | --- |
| Page definition: `definePage({ slug: "executive-hub", ... })` | `dyrected.config.ts` under `admin.navigation` in "Operations" |
| Page component: `OperationsDashboard` | `src/admin-components/operations-dashboard.tsx` |
| Component registration: `pages: { "ops.executiveHub": OperationsDashboard }` | `src/app/admin/admin-client.tsx` |

### Features to test in `/admin#/pages/executive-hub`

- **Navigation placement:** Placed cleanly inside the *Operations* group with a Sparkles icon.
- **Dynamic Header & Breadcrumbs (`usePageMeta`):** Sets dynamic title ("Executive Operations Hub"), subtitle, and breadcrumbs.
- **Header Actions (`actions`):** "Live Refresh" and "Door Check-In" action buttons rendered in the header bar.
- **Sub-Route Navigation (`usePageRoute`):** Click the tabs ("Executive Overview", "VIP Concierge & Tasting", "Aso-Ebi Logistics") to navigate to sub-paths (`/pages/executive-hub/vip` and `/pages/executive-hub/asoebi`).
- **Admin Bridge (`useAdminNavigate` & `useAdminNotify`):** Click "Door Check-In" or any shortcut to navigate across workspaces and trigger toasts.
- **Browser Meta Title:** Notice the browser tab title automatically updates to `Executive Operations Hub - Dyrected`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
