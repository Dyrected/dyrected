<script setup lang="ts">
import RsvpLink from "~/components/RsvpLink.vue";
// DyrectedAdmin is auto-imported by @dyrected/nuxt.
definePageMeta({ layout: false });
const { preference, systemTheme, setTheme } = useTheme()

const customComponents = {
  fields: {
    rsvpLink: RsvpLink,
  },
};
</script>

<template>
  <div>
    <ClientOnly>
      <DyrectedAdmin
        :components="customComponents"
        :theme="preference"
        :system-theme="systemTheme"
        :on-theme-change="setTheme"
      />
    </ClientOnly>
  </div>
</template>
