<script setup lang="ts">
import "@dyrected/admin/styles";
import RsvpLink from "~/components/RsvpLink.vue";

const { preference, systemTheme, setTheme } = useTheme();

const customComponents = {
  fields: {
    rsvpLink: RsvpLink,
  },
};

const dyrectedUrl = import.meta.env.VITE_DYRECTED_URL;
const dyrectedApiKey = import.meta.env.VITE_DYRECTED_API_KEY;
const dyrectedSiteId = import.meta.env.VITE_DYRECTED_SITE_ID;
</script>

<template>
  <DyrectedAdmin
    :config="{
      baseUrl: dyrectedUrl,
      apiKey: dyrectedApiKey,
      siteId: dyrectedSiteId,
    }"
    :components="customComponents"
    :theme="preference"
    :system-theme="systemTheme"
    :on-theme-change="setTheme"
  />
</template>
