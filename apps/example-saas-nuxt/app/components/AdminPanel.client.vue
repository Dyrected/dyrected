<script setup lang="ts">
import "@dyrected/admin/styles";
import RsvpLink from "~/components/RsvpLink.vue";

const { preference, systemTheme, setTheme } = useTheme();

const customComponents = {
  fields: {
    rsvpLink: RsvpLink,
  },
};

const runtimeConfig = useRuntimeConfig();
const dyrectedUrl = runtimeConfig.public.dyrected.baseUrl;
const dyrectedApiKey = runtimeConfig.public.dyrected.apiKey;
const dyrectedSiteId = runtimeConfig.public.dyrected.siteId;
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
