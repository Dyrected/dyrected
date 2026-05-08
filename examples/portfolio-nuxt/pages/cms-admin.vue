<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { renderAdminUI } from '@dyrected/admin'
import '@dyrected/admin/styles'

// Disable Nuxt layout for the admin dashboard to give it full screen control
definePageMeta({
  layout: false
})

const adminContainer = ref<HTMLElement | null>(null)
let unmount: (() => void) | null = null

onMounted(() => {
  if (adminContainer.value) {
    unmount = renderAdminUI(adminContainer.value, {
      basename: '/cms-admin'
    })
  }
})

onUnmounted(() => {
  if (unmount) unmount()
})
</script>

<template>
  <div ref="adminContainer" class="admin-wrapper" />
</template>

<style scoped>
.admin-wrapper {
  height: 100vh;
  width: 100vw;
  background: #000;
}
</style>
