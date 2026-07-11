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
      <DyrectedAdmin :components="customComponents" />
    </ClientOnly>
  </div>
</template>
