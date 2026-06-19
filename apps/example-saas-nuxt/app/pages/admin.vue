<script setup lang="ts">
import RsvpLink from "~/components/RsvpLink.vue";
// DyrectedAdmin is auto-imported by @dyrected/nuxt.
definePageMeta({ layout: false });

const customComponents = {
  fields: {
    rsvpLink: RsvpLink,
  },
};
</script>

<template>
  <div>
    <ClientOnly>
      <DyrectedAdmin basename="/admin" :components="customComponents" />
    </ClientOnly>
  </div>
</template>
<style lang="css">
/* Override Dyrected Admin UI variables to match SnackTrack Pro's premium gold & navy brand identity */
.dy-admin-ui {
  /* Fonts */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Primary action: SnackTrack Gold */
  --primary: 48 100% 45%;
  --primary-foreground: 215 67% 6%;

  /* Intelligence/accent: also gold for this dark theme */
  --intelligence: 48 100% 45%;
  --intelligence-foreground: 215 67% 6%;

  /* Page surface: SnackTrack Navy */
  --background: 215 67% 6%;
  --foreground: 210 40% 98%;

  /* Cards & panels */
  --card: 215 60% 10%;
  --card-foreground: 210 40% 98%;

  /* Popovers */
  --popover: 215 60% 10%;
  --popover-foreground: 210 40% 98%;

  /* Secondary */
  --secondary: 215 50% 15%;
  --secondary-foreground: 210 40% 98%;

  /* Muted */
  --muted: 215 50% 15%;
  --muted-foreground: 215 20% 65%;

  /* Hover/link accents */
  --accent: 215 50% 18%;
  --accent-foreground: 48 100% 45%;

  /* Borders & inputs */
  --border: 215 40% 20%;
  --input: 215 40% 20%;
  --ring: 48 100% 45%;

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
html,
body {
  background-color: hsl(215 67% 6%) !important;
  color: hsl(210 40% 98%) !important;
}
</style>
