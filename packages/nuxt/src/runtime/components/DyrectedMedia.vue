<template>
  <div
    v-if="youtubeId"
    class="dyrected-media-video"
    style="position: relative; padding-bottom: 56.25%; height: 0;"
  >
    <iframe
      :src="`https://www.youtube.com/embed/${youtubeId}`"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    />
  </div>

  <NuxtImg
    v-else-if="isImage"
    :src="url"
    :width="width ?? 500"
    :height="height ?? 500"
    :alt="alt ?? filename"
    v-bind="$attrs"
  />

  <video
    v-else-if="isVideo"
    :src="url"
    controls
    :width="width ?? 500"
    :height="height ?? 500"
    class="dyrected-media-video"
    v-bind="$attrs"
  />

  <div v-else class="dyrected-media-file">
    <slot name="fallback">
      <a :href="url" target="_blank" rel="noopener noreferrer" class="dyrected-file-link">
        Download {{ filename || "File" }}
      </a>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Media } from "@dyrected/sdk";

// Nuxt renders the image case through @nuxt/image's <NuxtImg> for optimization,
// mirroring how the Next integration's DyrectedMedia uses next/image.
const props = defineProps<{
  media: Media | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>();

const url = computed(() => (typeof props.media === "string" ? props.media : props.media.url));
const filename = computed(() => (typeof props.media === "string" ? "" : props.media.filename));
const mimeType = computed(() => (typeof props.media === "string" ? null : props.media.mimeType));

const youtubeId = computed(() => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.value.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
});

const isImage = computed(
  () => mimeType.value?.startsWith("image/") || url.value.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i),
);
const isVideo = computed(
  () => mimeType.value?.startsWith("video/") || url.value.match(/\.(mp4|webm|ogg)$/i),
);
</script>
