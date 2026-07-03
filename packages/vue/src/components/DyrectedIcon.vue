<template>
  <component :is="resolved" v-if="resolved" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { icons } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /**
   * The value of an `icon` field — a Lucide icon name such as
   * `"ChartNoAxesCombined"` or `"BellRing"`. See https://lucide.dev/icons.
   * Typed as `string` rather than the 1700+ icon-name union to avoid a TS
   * "union too complex" (TS2590) blow-up in the generated declarations.
   */
  name?: string | null;
  /**
   * Icon name to render when `name` is missing or not a known icon.
   * Renders nothing when omitted and `name` cannot be resolved.
   */
  fallback?: string;
}>();

const iconMap = icons as unknown as Record<string, unknown>;

const resolved = computed(() => {
  const byName = props.name ? iconMap[props.name] : undefined;
  return byName ?? (props.fallback ? iconMap[props.fallback] : undefined);
});
</script>
