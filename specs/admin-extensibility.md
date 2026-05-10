# Admin Extensibility via Props

Mechanism for developers to customize and extend the default Admin UI.

## The `components` Prop
The `<AdminUI />` component (and the `DyrectedAdmin` Nuxt component) accepts a configuration object to inject custom React components into the dashboard.

```tsx
<AdminUI
  components={{
    fields: { 
      colorPicker: ColorPickerField 
    },
    pages: { 
      analytics: AnalyticsPage 
    }
  }}
/>
```

## Custom Fields
- Developers can register new field types.
- These fields receive standard props like `value`, `onChange`, `label`, and `error`.
- They can be used in `dyrected.config.ts` by setting `admin: { component: 'colorPicker' }`.

## Custom Pages
- Custom routes can be added to the admin sidebar.
- Useful for dashboards, specialized reports, or integrations with third-party tools (e.g., Stripe, Google Analytics).
- Pages have access to the internal Admin context and hooks for interacting with the Dyrected API.
