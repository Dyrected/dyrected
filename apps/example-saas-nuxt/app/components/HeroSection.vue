<script setup>
import { computed } from 'vue'

const props = defineProps({
  eyebrow: { type: String, default: '' },
  headline: { type: String, required: true },
  subheadline: { type: String, default: '' },
  // Media relationship: a populated media object (with a url) or a url string.
  image: { type: [Object, String], default: null },
  // Click-to-edit attrs for the image field (from useDyPath in the block).
  imageAttrs: { type: Object, default: () => ({}) },
  primaryCta: { type: String, default: '' },
  primaryCtaTo: { type: String, default: '/contact' },
  secondaryCta: { type: String, default: '' },
  secondaryCtaTo: { type: String, default: '/features' },
  centered: { type: Boolean, default: true },
})

// Only render an image when it resolves to something displayable — a populated
// media object with a url, or a real url string. An unresolved relationship id
// renders nothing rather than a broken image.
const hasImage = computed(() => {
  const i = props.image
  if (!i) return false
  return typeof i === 'object' ? Boolean(i.url || i.filename) : /^(https?:\/\/|\/)/.test(i)
})

// Split hero places the image beside the copy; centered places it below.
const splitWithImage = computed(() => hasImage.value && !props.centered)
</script>

<template>
  <section class="relative overflow-hidden py-24 md:py-32">
    <!-- Background grid -->
    <div
      class="absolute inset-0 opacity-10"
      style="background-image: linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px); background-size: 64px 64px;"
    />
    <!-- Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-intelligence/5 rounded-full blur-3xl pointer-events-none" />

    <div
      class="relative max-w-7xl mx-auto px-6"
      :class="[
        splitWithImage ? 'grid md:grid-cols-2 gap-12 lg:gap-16 items-center' : '',
        centered && !splitWithImage ? 'text-center' : '',
      ]"
    >
      <div :class="splitWithImage ? '' : (centered ? 'max-w-4xl mx-auto' : 'max-w-3xl')">
        <span
          v-if="eyebrow"
          class="inline-block mb-4 text-xs font-bold uppercase tracking-widest text-intelligence border border-intelligence/30 rounded-full px-4 py-1"
        >
          {{ eyebrow }}
        </span>

        <h1 class="text-4xl md:text-6xl font-black text-foreground leading-tight tracking-tight">
          <slot name="headline">{{ headline }}</slot>
        </h1>

        <p v-if="subheadline" class="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
          <slot name="subheadline">{{ subheadline }}</slot>
        </p>

        <div v-if="primaryCta || secondaryCta" class="mt-10 flex flex-wrap gap-4" :class="centered ? 'justify-center' : ''">
          <NuxtLink
            v-if="primaryCta"
            :to="primaryCtaTo"
            class="px-6 py-3.5 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 transition-colors text-sm"
          >
            <slot name="primaryCta">{{ primaryCta }}</slot>
          </NuxtLink>
          <NuxtLink
            v-if="secondaryCta"
            :to="secondaryCtaTo"
            class="px-6 py-3.5 border border-border text-muted-foreground font-medium rounded hover:border-intelligence/40 hover:text-foreground transition-colors text-sm"
          >
            {{ secondaryCta }}
          </NuxtLink>
        </div>
      </div>

      <!-- Split variant: image beside the copy -->
      <div v-if="splitWithImage" v-bind="imageAttrs">
        <DyrectedMedia
          :media="image"
          :alt="headline"
          class="w-full h-auto rounded-xl border border-border shadow-2xl"
        />
      </div>
    </div>

    <!-- Centered variant: image below the copy -->
    <div v-if="hasImage && centered" class="relative max-w-5xl mx-auto px-6 mt-14" v-bind="imageAttrs">
      <DyrectedMedia
        :media="image"
        :alt="headline"
        class="w-full h-auto rounded-xl border border-border shadow-2xl"
      />
    </div>
  </section>
</template>
