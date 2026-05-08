<script setup lang="ts">
// Disable Nuxt layout for the admin dashboard
definePageMeta({
  layout: false,
});
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin basename="/cms-admin" />
  </ClientOnly>
</template>

<style>
/* 
  Custom Admin UI Overrides
  Goal: Strip down the "clunky" feel by reducing padding and softening borders.
*/
.admin-ui {
  --radius: 1rem !important;
  --border: 214.3 32% 91% !important; /* Lighter borders */
}

/* Remove max-width restriction for a more open, modern feel */
.admin-ui .max-w-6xl {
  max-width: none !important;
}

/* Soften all borders and make them extremely subtle */
.admin-ui .border,
.admin-ui .border-t,
.admin-ui .border-b,
.admin-ui .border-r,
.admin-ui .border-l {
  border-color: hsl(var(--border) / 0.4) !important;
}

/* Strip down excessive padding in the form engine and edit pages */
.admin-ui .p-8 {
  padding: 1.5rem !important;
}

.admin-ui .p-6, 
.admin-ui .p-5, 
.admin-ui .p-4 {
  padding: 1rem !important;
}

/* Reduce the main content area padding */
.admin-ui main .flex-1.p-6,
.admin-ui main .flex-1.lg\:p-8 {
  padding: 1.5rem !important;
}

/* Soften all corner radii */
.admin-ui .rounded-xl,
.admin-ui .rounded-lg,
.admin-ui .rounded-md {
  border-radius: 0.75rem !important;
}

/* Reduce vertical spacing/gaps in the layout */
.admin-ui .space-y-8 {
  margin-top: 0 !important;
  gap: 1.5rem !important;
}

.admin-ui .space-y-6,
.admin-ui .space-y-5 {
  gap: 1rem !important;
}

/* Eliminate nested background colors to reduce visual noise */
.admin-ui .bg-muted\/30,
.admin-ui .bg-muted\/10,
.admin-ui .bg-white\/30,
.admin-ui .bg-primary\/5 {
  background-color: transparent !important;
}

/* Use minimal shadows */
.admin-ui .shadow-sm,
.admin-ui .shadow {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.02) !important;
}

/* Streamline form fields */
.admin-ui input,
.admin-ui select,
.admin-ui textarea,
.admin-ui .rounded-xl.border-border\/40 {
  border-color: hsl(var(--border)) !important;
  background-color: hsl(var(--background)) !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
}

/* Subtle header and divider lines */
.admin-ui .border-b.pb-6 {
  border-bottom-width: 1px !important;
  padding-bottom: 1rem !important;
}

/* Ensure the sidebar is distinct but very clean */
.admin-ui aside {
  border-right-width: 1px !important;
  background-color: #fafbfc !important;
}

.admin-ui aside .border-b {
  border-bottom-color: hsl(var(--border) / 0.3) !important;
}
</style>
