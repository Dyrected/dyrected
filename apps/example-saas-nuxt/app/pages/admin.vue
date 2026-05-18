<script setup lang="ts">
// DyrectedAdmin is auto-imported by @dyrected/nuxt.
definePageMeta({ layout: false });
</script>

<template>
  <div>
    <ClientOnly>
      <DyrectedAdmin basename="/admin" />
    </ClientOnly>
  </div>
</template>
<style lang="css">
/* Override Dyrected Admin UI variables to match SnackTrack Pro's premium gold & navy brand identity */
:root {
  /* Fonts */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* Primary Accent: SnackTrack Gold (HSL: 48 100% 45%) */
  --primary: 48 100% 45%;
  --primary-foreground: 215 67% 6%; /* dark navy text on gold bg */
  --ring: 48 100% 45%;

  /* Page Surface: SnackTrack Navy (HSL: 215 67% 6%) */
  --background: 215 67% 6%;
  --foreground: 210 40% 98%;

  /* Cards & Panels: HSL: 215 60% 10% */
  --card: 215 60% 10%;
  --card-foreground: 210 40% 98%;

  /* Popovers: HSL: 215 60% 10% */
  --popover: 215 60% 10%;
  --popover-foreground: 210 40% 98%;

  /* Secondary (Tags, Subtle Buttons) */
  --secondary: 215 50% 15%;
  --secondary-foreground: 210 40% 98%;

  /* Muted Elements */
  --muted: 215 50% 15%;
  --muted-foreground: 215 20% 65%;

  /* Accent (Hover tints) */
  --accent: 215 50% 18%;
  --accent-foreground: 48 100% 45%;

  /* Borders & Inputs */
  --border: 215 40% 20%;
  --input: 215 40% 20%;

  /* Sidebar */
  --sidebar-background: 215 60% 8%;
  --sidebar-foreground: 210 40% 90%;
  --sidebar-primary: 48 100% 45%;
  --sidebar-primary-foreground: 215 67% 6%;
  --sidebar-accent: 215 50% 15%;
  --sidebar-accent-foreground: 48 100% 45%;
  --sidebar-border: 215 45% 16%;
  --sidebar-ring: 48 100% 45%;
}

/* Ensure the page body is dark when viewing the admin UI */
html, body {
  background-color: hsl(215 67% 6%) !important;
  color: hsl(210 40% 98%) !important;
}
</style>
