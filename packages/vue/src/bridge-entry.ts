/**
 * The smallest entry point that makes Vue components usable inside the React admin.
 *
 * `dyrected bundle` builds Vue custom components into a standalone `components.js` for the Cloud-hosted admin.
 * That bundle needs the Vue-to-React bridge and the registry helper, and nothing else from this package, so it
 * imports from `@dyrected/vue/bridge` instead of the main entry (which also carries the Nuxt-facing components).
 */
export { wrapComponents, wrapVueComponent } from './bridge/react-in-vue';
export { defineAdminComponents } from '@dyrected/admin/public';
export type {
  AdminComponents,
  AdminFieldComponentProps,
  AdminFormComponentProps,
  AdminViewLayoutProps,
  AdminPageProps,
  TypedAdminComponents,
} from '@dyrected/admin/public';
