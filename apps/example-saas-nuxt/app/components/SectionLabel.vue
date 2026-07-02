<script setup>
defineProps({ text: { type: String, required: true } })
</script>

<template>
  <span class="inline-block text-xs font-bold uppercase tracking-widest text-intelligence border border-intelligence/30 rounded-full px-4 py-1 mb-4">
    {{ text }}
  </span>
</template>
