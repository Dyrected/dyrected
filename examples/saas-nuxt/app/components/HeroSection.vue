<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  headline: { type: String, required: true },
  subheadline: { type: String, default: '' },
  primaryCta: { type: String, default: '' },
  primaryCtaTo: { type: String, default: '/contact' },
  secondaryCta: { type: String, default: '' },
  secondaryCtaTo: { type: String, default: '/features' },
  centered: { type: Boolean, default: true },
})
</script>

<template>
  <section class="relative overflow-hidden py-24 md:py-32">
    <!-- Background grid -->
    <div
      class="absolute inset-0 opacity-10"
      style="background-image: linear-gradient(#162b55 1px, transparent 1px), linear-gradient(to right, #162b55 1px, transparent 1px); background-size: 64px 64px;"
    />
    <!-- Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#f5c842]/5 rounded-full blur-3xl pointer-events-none" />

    <div class="relative max-w-7xl mx-auto px-6" :class="centered ? 'text-center' : ''">
      <div :class="centered ? 'max-w-4xl mx-auto' : 'max-w-3xl'">
        <span
          v-if="eyebrow"
          class="inline-block mb-4 text-xs font-bold uppercase tracking-widest text-[#f5c842] border border-[#f5c842]/30 rounded-full px-4 py-1"
        >
          {{ eyebrow }}
        </span>

        <h1 class="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
          <slot name="headline">{{ headline }}</slot>
        </h1>

        <p v-if="subheadline" class="mt-6 text-lg md:text-xl text-slate-400 leading-relaxed">
          {{ subheadline }}
        </p>

        <div v-if="primaryCta || secondaryCta" class="mt-10 flex flex-wrap gap-4" :class="centered ? 'justify-center' : ''">
          <NuxtLink
            v-if="primaryCta"
            :to="primaryCtaTo"
            class="px-6 py-3.5 bg-[#f5c842] text-[#050d1a] font-bold rounded hover:bg-[#e6b800] transition-colors text-sm"
          >
            {{ primaryCta }}
          </NuxtLink>
          <NuxtLink
            v-if="secondaryCta"
            :to="secondaryCtaTo"
            class="px-6 py-3.5 border border-[#162b55] text-slate-300 font-medium rounded hover:border-[#f5c842]/40 hover:text-white transition-colors text-sm"
          >
            {{ secondaryCta }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
