<script setup>
defineProps({
  headline: { type: String, default: 'Your snacks deserve better.' },
  sub: { type: String, default: 'Join 2,400+ enterprises that have eliminated snack chaos.' },
  cta: { type: String, default: 'Request a Snack Demo' },
  ctaTo: { type: String, default: '/contact' },
})
</script>

<template>
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto bg-gradient-to-br from-card to-muted border border-intelligence/20 rounded-2xl p-10 md:p-14 text-center">
      <div class="w-12 h-12 bg-intelligence/10 border border-intelligence/30 rounded-xl flex items-center justify-center mx-auto mb-6">
        <svg class="w-6 h-6 text-intelligence" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 class="text-3xl md:text-4xl font-black text-foreground mb-4">{{ headline }}</h2>
      <p class="text-muted-foreground mb-8 text-lg">{{ sub }}</p>
      <NuxtLink
        :to="ctaTo"
        class="inline-block px-8 py-4 bg-primary text-primary-foreground font-black rounded hover:bg-primary/90 transition-colors text-sm uppercase tracking-wide"
      >
        {{ cta }}
      </NuxtLink>
      <p class="mt-4 text-muted-foreground text-xs">No credit card required. Free 30-day snack assessment included.</p>
    </div>
  </section>
</template>
