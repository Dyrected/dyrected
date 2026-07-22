<template>
  <div ref="container" class="dyrected-admin-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed, getCurrentInstance } from "vue";
import "@dyrected/admin/styles";
import { wrapComponents } from "../bridge/react-in-vue";
import type { AdminThemeController, AdminThemePreference, ResolvedAdminTheme } from "@dyrected/admin";
import { createAdminThemeController } from "@dyrected/admin";

const props = defineProps<{
  /**
   * The Dyrected configuration object.
   */
  config: {
    apiKey: string;
    siteId: string;
    baseUrl: string;
  };
  /**
   * Custom components to inject into the Admin UI.
   * Can be raw Vue components; they will be automatically wrapped.
   */
  components?: any;
  /** Optional externally managed admin theme controller. */
  themeController?: AdminThemeController;
  /** Preferred theme when the wrapper should control the admin theme. */
  theme?: AdminThemePreference;
  /** Current resolved system theme when the wrapper should control the admin theme. */
  systemTheme?: ResolvedAdminTheme;
  /** Called when the admin UI changes the preferred theme. */
  onThemeChange?: (theme: AdminThemePreference) => void;
}>();

const container = ref<HTMLElement | null>(null);
let unmount: (() => void) | null = null;

// Capture the host app's context so wrapped Vue components (custom fields and
// slots) share its plugins, provide/inject, Pinia, and i18n instead of each
// mounting an isolated app.
const appContext = getCurrentInstance()?.appContext ?? null;

// Wrap components for React
const wrappedComponents = computed(() => wrapComponents(props.components, appContext));
const internalThemeController = createAdminThemeController({
  theme: props.theme,
  systemTheme: props.systemTheme,
  onThemeChange: props.onThemeChange,
});
const activeThemeController = computed(() => props.themeController ?? internalThemeController);

watch(
  () => props.theme,
  (theme) => {
    if (!props.themeController && theme) {
      internalThemeController.setTheme(theme);
    }
  },
);

watch(
  () => props.systemTheme,
  (systemTheme) => {
    if (!props.themeController && systemTheme) {
      internalThemeController.setSystemTheme(systemTheme);
    }
  },
);

const mountAdmin = async () => {
  if (unmount) {
    unmount();
  }

  if (container.value) {
    try {
      // 1. Dynamically import to ensure isolation
      const { renderAdminUI } = await import("@dyrected/admin");

      unmount = renderAdminUI(container.value, {
        apiKey: props.config.apiKey,
        siteId: props.config.siteId,
        baseUrl: props.config.baseUrl,
        isEmbedded: false,
        components: wrappedComponents.value,
        themeController: activeThemeController.value,
      } as any);
    } catch (err) {
      console.error("[DyrectedAdmin] Failed to mount admin UI:", err);
    }
  }
};

onMounted(async () => {
  await nextTick();
  await mountAdmin();
});

// Watch for config, injected components, or controller changes and remount if necessary.
watch(() => [props.config, props.components, props.themeController], mountAdmin, { deep: true });

onUnmounted(() => {
  if (unmount) {
    unmount();
  }
});
</script>

<style scoped>
.dyrected-admin-wrapper {
  height: 100vh;
  width: 100vw;
}
</style>
