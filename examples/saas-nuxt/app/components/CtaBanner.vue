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
    <div class="max-w-4xl mx-auto bg-gradient-to-br from-[#0f2040] to-[#162b55] border border-[#f5c842]/20 rounded-2xl p-10 md:p-14 text-center">
      <div class="w-12 h-12 bg-[#f5c842]/10 border border-[#f5c842]/30 rounded-xl flex items-center justify-center mx-auto mb-6">
        <svg class="w-6 h-6 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 class="text-3xl md:text-4xl font-black text-white mb-4">{{ headline }}</h2>
      <p class="text-slate-400 mb-8 text-lg">{{ sub }}</p>
      <NuxtLink
        :to="ctaTo"
        class="inline-block px-8 py-4 bg-[#f5c842] text-[#050d1a] font-black rounded hover:bg-[#e6b800] transition-colors text-sm uppercase tracking-wide"
      >
        {{ cta }}
      </NuxtLink>
      <p class="mt-4 text-slate-500 text-xs">No credit card required. Free 30-day snack assessment included.</p>
    </div>
  </section>
</template>
