<template>
  <DyrectedAdmin
    :config="config"
    :components="components"
  />
</template>

<script setup lang="ts">
// @ts-ignore
import { useRuntimeConfig } from "#imports";
import { DyrectedAdmin } from "@dyrected/vue";

defineProps<{
  /**
   * Custom components to inject into the Admin UI.
   */
  components?: any;
}>();

const runtimeConfig = useRuntimeConfig();
const config = {
  apiKey: String(runtimeConfig.public.dyrected.apiKey || ""),
  siteId: String(runtimeConfig.public.dyrected.siteId || ""),
  baseUrl: String(runtimeConfig.public.dyrected.baseUrl || ""),
};
</script>
