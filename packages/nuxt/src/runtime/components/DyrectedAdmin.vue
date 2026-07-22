<template>
  <DyrectedAdmin
    :config="config"
    :components="components"
    :theme="theme"
    :system-theme="systemTheme"
    :on-theme-change="onThemeChange"
  />
</template>

<script setup lang="ts">
// @ts-ignore
import { useRuntimeConfig } from "#imports";
import { DyrectedAdmin } from "@dyrected/vue";
import type { AdminThemePreference, ResolvedAdminTheme } from "@dyrected/admin";

defineProps<{
  /**
   * Custom components to inject into the Admin UI.
   */
  components?: any;
  /** Preferred theme for the embedded admin. */
  theme?: AdminThemePreference;
  /** Current resolved system theme for the embedded admin. */
  systemTheme?: ResolvedAdminTheme;
  /** Callback fired when the embedded admin changes its preferred theme. */
  onThemeChange?: (theme: AdminThemePreference) => void;
}>();

const runtimeConfig = useRuntimeConfig();
const config = {
  apiKey: String(runtimeConfig.public.dyrected.apiKey || ""),
  siteId: String(runtimeConfig.public.dyrected.siteId || ""),
  baseUrl: String(runtimeConfig.public.dyrected.baseUrl || ""),
};
</script>
