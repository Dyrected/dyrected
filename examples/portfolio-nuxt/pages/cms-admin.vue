<script setup lang="ts">
import { renderAdminUI } from "@dyrected/admin";
import "@dyrected/admin/styles";

// Disable Nuxt layout for the admin dashboard
definePageMeta({
  layout: false,
});

const config = useRuntimeConfig();
const container = ref<HTMLElement | null>(null);
let unmount: (() => void) | null = null;

onMounted(async () => {
  console.log("Admin page mounted, waiting for next tick...");
  await nextTick();

  if (container.value) {
    console.log("Container ready, initializing React via renderAdminUI...");
    try {
      const dyrected = JSON.parse(JSON.stringify(config.public.dyrected));
      console.log("Dyrected config:", dyrected);
      unmount = renderAdminUI(container.value, {
        apiKey: dyrected.apiKey,
        siteId: dyrected.siteId,
        baseUrl: dyrected.baseUrl,
        basename: "/cms-admin",
      });
    } catch (err) {
      console.error("Failed to mount React AdminUI:", err);
    }
  } else {
    console.error("React container ref is STILL null after nextTick");
  }
});

onUnmounted(() => {
  if (unmount) {
    unmount();
  }
});
</script>

<template>
  <ClientOnly>
    <div ref="container" class="admin-wrapper"></div>
  </ClientOnly>
</template>

<style scoped>
.admin-wrapper {
  height: 100vh;
  width: 100vw;
  background: #fdfdf5;
}
</style>
