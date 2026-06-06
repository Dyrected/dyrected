<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

const props = defineProps<{
  value: any;
  onChange: (value: any) => void;
  field: any;
  context?: any;
}>();

const origin = ref('');
onMounted(() => {
  origin.value = window.location.origin;
});

const slug = computed(() => props.context?.siblingData?.slug || '');

const rsvpUrl = computed(() => {
  if (!origin.value || !slug.value) return '';
  return `${origin.value}/rsvp?group=${slug.value}`;
});

const copied = ref(false);
const copyToClipboard = async () => {
  if (!rsvpUrl.value) return;
  try {
    await navigator.clipboard.writeText(rsvpUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};
</script>

<template>
  <div class="dy-flex dy-items-center dy-gap-2">
    <input
      type="text"
      :value="rsvpUrl"
      readonly
      placeholder="Save to generate RSVP link..."
      class="dy-flex dy-h-10 dy-w-full dy-rounded-md dy-border dy-border-input dy-bg-background dy-px-3 dy-py-2 dy-text-sm dy-ring-offset-background file:dy-border-0 file:dy-bg-transparent file:dy-text-sm file:dy-font-medium placeholder:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-cursor-not-allowed disabled:dy-opacity-50 dy-font-mono"
    />
    <button
      type="button"
      @click="copyToClipboard"
      :disabled="!rsvpUrl"
      class="dy-inline-flex dy-items-center dy-justify-center dy-whitespace-nowrap dy-rounded-md dy-text-sm dy-font-medium dy-transition-colors focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-pointer-events-none disabled:dy-opacity-50 dy-border dy-border-input dy-bg-background hover:dy-bg-accent hover:dy-text-accent-foreground dy-h-10 dy-px-4 dy-py-2 dy-shrink-0"
    >
      {{ copied ? 'Copied!' : 'Copy Link' }}
    </button>
  </div>
</template>
