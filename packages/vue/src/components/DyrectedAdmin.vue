<template>
  <div ref="container" class="dyrected-admin-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed, getCurrentInstance } from "vue";
import "@dyrected/admin/styles";
import { wrapComponents } from "../bridge/react-in-vue";

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
}>();

const container = ref<HTMLElement | null>(null);
let unmount: (() => void) | null = null;

// Capture the host app's context so wrapped Vue components (custom fields and
// slots) share its plugins, provide/inject, Pinia, and i18n instead of each
// mounting an isolated app.
const appContext = getCurrentInstance()?.appContext ?? null;

// Wrap components for React
const wrappedComponents = computed(() => wrapComponents(props.components, appContext));

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
      });
    } catch (err) {
      console.error("[DyrectedAdmin] Failed to mount admin UI:", err);
    }
  }
};

onMounted(async () => {
  await nextTick();
  await mountAdmin();
});

// Watch for config or components changes and remount if necessary
watch(() => [props.config, props.components], mountAdmin, { deep: true });

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
