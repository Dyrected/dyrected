<script setup>
useHead({
  title: 'SnackTrack Pro — AI-Powered Office Snack Inventory Management',
  meta: [
    { name: 'description', content: 'Enterprise-grade, AI-powered office snack inventory management. Track, forecast, and optimize your office snack ecosystem at scale.' },
  ],
})

const features = [
  {
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v2" />`,
    title: 'CrunchGPT AI Forecasting',
    desc: 'Predict snack depletion before it happens. Our AI analyzes consumption patterns across 47 variables.',
  },
  {
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />`,
    title: 'Real-Time Snack Alerts',
    desc: 'Never experience an unexpected chip shortage again. Instant Slack, email, and SMS notifications.',
  },
  {
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />`,
    title: 'Snack ROI Dashboard',
    desc: 'Prove snack value to your CFO. Track employee satisfaction correlation to pretzel availability in real time.',
  },
]

const logos = [
  'Deloitte', 'McKinsey & Co.', 'Goldman Snachs', 'Bain & Crunch', 'KPMG Munchies',
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden py-28 md:py-36">
      <div
        class="absolute inset-0 opacity-10"
        style="background-image: linear-gradient(#162b55 1px, transparent 1px), linear-gradient(to right, #162b55 1px, transparent 1px); background-size: 64px 64px;"
      />
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#f5c842]/5 rounded-full blur-3xl pointer-events-none" />

      <div class="relative max-w-7xl mx-auto px-6 text-center">
        <span class="inline-block mb-5 text-xs font-bold uppercase tracking-widest text-[#f5c842] border border-[#f5c842]/30 rounded-full px-4 py-1">
          Now with CrunchGPT™ AI — Powered by 40B Snack Parameters
        </span>

        <h1 class="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight max-w-5xl mx-auto">
          Snack Management,<br />
          <span class="text-[#f5c842]">Reimagined</span> for the<br />
          Enterprise.
        </h1>

        <p class="mt-6 text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
          SnackTrack Pro delivers end-to-end visibility into your office snack ecosystem. From Doritos to destiny — we handle the full snack lifecycle.
        </p>

        <div class="mt-10 flex flex-wrap gap-4 justify-center">
          <NuxtLink
            to="/contact"
            class="px-7 py-4 bg-[#f5c842] text-[#050d1a] font-black rounded hover:bg-[#e6b800] transition-colors text-sm uppercase tracking-wide"
          >
            Request a Snack Demo
          </NuxtLink>
          <NuxtLink
            to="/features"
            class="px-7 py-4 border border-[#162b55] text-slate-300 font-medium rounded hover:border-[#f5c842]/40 hover:text-white transition-colors text-sm"
          >
            See How It Works →
          </NuxtLink>
        </div>

        <p class="mt-5 text-slate-600 text-xs">Trusted by 2,400+ enterprises. SOC 2 Type II certified. GDPR compliant.</p>
      </div>
    </section>

    <!-- Social proof bar -->
    <section class="border-y border-[#162b55] bg-[#0a1628] py-8">
      <div class="max-w-7xl mx-auto px-6">
        <p class="text-center text-xs text-slate-500 uppercase tracking-widest mb-6">Trusted by the world's leading organizations</p>
        <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <span
            v-for="logo in logos"
            :key="logo"
            class="text-slate-500 font-bold text-sm md:text-base tracking-tight hover:text-slate-300 transition-colors"
          >
            {{ logo }}
          </span>
        </div>
      </div>
    </section>

    <!-- Feature highlights -->
    <section class="py-24 px-6">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <SectionLabel text="Core Platform" />
          <h2 class="text-3xl md:text-5xl font-black text-white mt-2">
            Everything your snacks<br />need to succeed.
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="f in features"
            :key="f.title"
            class="bg-[#0a1628] border border-[#162b55] rounded-xl p-8 hover:border-[#f5c842]/30 transition-colors group"
          >
            <div class="w-12 h-12 bg-[#f5c842]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#f5c842]/20 transition-colors">
              <svg class="w-6 h-6 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-html="f.icon" />
              </svg>
            </div>
            <h3 class="text-white font-bold text-lg mb-2">{{ f.title }}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonial -->
    <section class="py-16 px-6 bg-[#0a1628] border-y border-[#162b55]">
      <div class="max-w-3xl mx-auto text-center">
        <svg class="w-10 h-10 text-[#f5c842]/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
        </svg>
        <blockquote class="text-xl md:text-2xl font-medium text-white leading-relaxed italic">
          "Before SnackTrack Pro, we were manually auditing our snack drawers every Tuesday. Now, CrunchGPT tells us on Sunday. We've reclaimed 14 hours of executive bandwidth per quarter."
        </blockquote>
        <div class="mt-8 flex items-center justify-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#162b55] to-[#0f2040] border border-[#f5c842]/20 flex items-center justify-center">
            <span class="text-[#f5c842] font-black text-sm">RH</span>
          </div>
          <div class="text-left">
            <p class="text-white font-semibold text-sm">Rebecca Holtsworth</p>
            <p class="text-slate-500 text-xs">Chief Operations Officer, Meridian Consulting Group</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <CtaBanner />
  </div>
</template>
