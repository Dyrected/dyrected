---
title: Admin Overview
description: Managing your content with the auto-generated dashboard.
---

The Dyrected Admin Dashboard is a beautiful, responsive interface that is automatically generated based on your `dyrected.config.ts`. It provides everything you need to manage your data without writing a single line of UI code.

## Key Features

- **Dynamic Forms:** Automatically generated based on your field types (Selects, Rich Text, Relationships, etc.).
- **Filtering & Sorting:** Powerful built-in tools to find the data you need.
- **Media Management:** Upload, browse, and organize your files.
- **Global Settings:** A dedicated space to manage your site-wide configuration.

## Customization

You can customize the look and feel of the Admin dashboard to match your brand.

```typescript
export default defineConfig({
  admin: {
    branding: {
      logo: '/my-logo.svg',
      primaryColor: '#6366f1',
    },
    // Customize the sidebar groups
    groups: [
      { label: 'Blog', collections: ['posts', 'categories'] },
      { label: 'Users', collections: ['accounts', 'teams'] }
    ]
  }
});
```

## Deployment

The Admin UI is embedded within the core package. When you navigate to `/admin` on your site, Dyrected serves the dashboard automatically. No separate deployment is required!
