<script setup lang="ts">
const props = defineProps<{
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>();
</script>

<template>
  <input
    type="color"
    :value="props.value || '#6366f1'"
    :disabled="props.disabled"
    @input="props.onChange(($event.target as HTMLInputElement).value)"
  />
</template>
