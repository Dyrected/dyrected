# Custom Admin Inputs

Allowing developers to replace default field inputs with custom React components via component props.

## Overview

While Dyrected provides a robust set of default inputs, some projects require specialized UI. This specification enables developers to inject their own React components into the Admin UI by passing them as props to the `<AdminUI />` component (or framework-specific equivalent like `<DyrectedAdmin />`).

## Configuration

Custom components are referenced by a string key in the content schema and mapped to React components in the Admin UI shell.

### 1. Usage in Field (dyrected.config.ts)

The field definition remains environment-agnostic by using a simple string key.

```ts
{
  name: 'color',
  type: 'text',
  admin: {
    component: 'colorPicker' // References the key registered in the UI shell
  }
}
```

### 2. Registration (Admin UI Props)

The actual React component is injected where the Admin UI is rendered (e.g., in a Next.js or Nuxt app).

```tsx
// Example in a React/Next.js app
import { AdminUI } from '@dyrected/admin';
import { ColorPickerField } from './components/ColorPickerField';

export default function MyAdminPage() {
  return (
    <AdminUI
      components={{
        fields: {
          colorPicker: ColorPickerField
        }
      }}
    />
  );
}
```

## Technical Implementation

### 1. Component Interface
Custom input components receive standard field props.

```tsx
interface CustomFieldProps {
  value: any;
  onChange: (value: any) => void;
  field: Field;
  path: string; // The full path to the field (e.g. "blocks.0.content")
  error?: string;
  label?: string;
  description?: string;
}
```

### 2. Dynamic Rendering
The `FieldRenderer` in `packages/admin` looks up the component in the `components.fields` object passed via the `AdminContext`.

1. If `field.admin.component` exists as a string key.
2. It looks for that key in the provided `fields` map.
3. If found, it renders the custom React component.
4. If not found, it falls back to the default input for the field's `type`.

## Framework Compatibility (Nuxt/Vue)

Since the Dyrected Admin UI is built with React, custom field components provided to the shell must also be React components. However, this still works seamlessly within a Nuxt or Vue application:

### 1. The React Path (Recommended)
Even in a Nuxt app, you can create a `.tsx` file for your custom admin component. Since `@dyrected/admin` already pulls in React as a dependency for the shell, there is no additional overhead to writing your admin-specific UI in React.

### 2. The Web Component Path (Universal)
If you prefer to write your component in Vue, you can wrap it as a [Web Component](https://vuejs.org/guide/extras/web-components.html).

1. Build your Vue component as a Custom Element.
2. Register it in your Nuxt app.
3. Pass a "Bridge" component to `AdminUI` that renders that Custom Element.

```tsx
// A simple React wrapper for a Vue Custom Element
const VueFieldBridge = (props) => {
  return <my-vue-color-picker 
    value={props.value} 
    onValueChange={(e) => props.onChange(e.detail)} 
  />;
};
```

### 3. The Vue-to-React Bridge
For deep integration, Dyrected will provide a helper in `@dyrected/nuxt` that allows you to pass Vue components directly, which will be automatically wrapped in a bridge for the React admin shell.

```vue
<!-- Proposed Nuxt Integration -->
<DyrectedAdmin
  :components="{
    fields: {
      colorPicker: MyVueColorPicker // Auto-bridged by Dyrected
    }
  }"
/>
```

## Benefits
- **Clean Configuration**: `dyrected.config.ts` stays pure and doesn't need to import React components, preventing build issues in non-React environments (like Hono backends).
- **Framework Flexibility**: Developers can use whatever local components they want as long as they follow the prop interface.
- **Type Safety**: The component map can be strongly typed to ensure correct prop signatures.
