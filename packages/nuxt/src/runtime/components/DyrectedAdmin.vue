<template>
  <DyrectedAdmin 
    :config="config" 
    :basename="basename || '/cms-admin'" 
  />
</template>

<script setup lang="ts">
// @ts-ignore
import { useRuntimeConfig } from "#imports";
import { DyrectedAdmin } from "@dyrected/vue";

defineProps<{
  /**
   * The base path where the admin is mounted.
   * @default "/cms-admin"
   */
  basename?: string;
}>();

const runtimeConfig = useRuntimeConfig();
const config = {
  apiKey: String(runtimeConfig.public.dyrected.apiKey || ""),
  siteId: String(runtimeConfig.public.dyrected.siteId || ""),
  baseUrl: String(runtimeConfig.public.dyrected.baseUrl || ""),
};
</script>
