<template>
  <div ref="container" class="dyrected-admin-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import "@dyrected/admin/styles";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

const props = defineProps<{
  /**
   * The base path where the admin is mounted.
   * @default "/cms-admin"
   */
  basename?: string;
}>();

const config = useRuntimeConfig();
const container = ref<HTMLElement | null>(null);
let unmount: (() => void) | null = null;

onMounted(async () => {
  await nextTick();

  if (container.value) {
    try {
      // 1. Dynamically import to ensure isolation from Vue's early bundle phase
      const { renderAdminUI } = await import("@dyrected/admin");

      // 2. Deep clone config to strip ALL Vue proxies/reactivity
      const dyrectedRaw = JSON.parse(JSON.stringify(config.public.dyrected));

      unmount = renderAdminUI(container.value, {
        apiKey: String(dyrectedRaw.apiKey || ""),
        siteId: String(dyrectedRaw.siteId || ""),
        baseUrl: String(dyrectedRaw.baseUrl || ""),
        basename: props.basename || "/cms-admin",
        isEmbedded: false,
      });
    } catch (err) {
      console.error("[DyrectedAdmin] Failed to mount admin UI:", err);
    }
  }
});

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
