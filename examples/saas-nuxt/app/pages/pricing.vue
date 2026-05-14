<script setup>
useHead({
  title: 'Pricing — SnackTrack Pro',
  meta: [{ name: 'description', content: 'Transparent enterprise snack management pricing. Starter, Growth, and Enterprise Snack Suite plans.' }],
})

const annual = ref(false)

const plans = computed(() => [
  {
    name: 'Starter',
    tagline: 'For offices with one snack drawer and big ambitions.',
    monthly: 49,
    annual: 39,
    badge: null,
    drawers: '1 snack drawer',
    cta: 'Start Free Trial',
    features: [
      'Up to 1 snack drawer',
      'CrunchGPT Basic (7-day forecast)',
      'Email alerts only',
      'Snack ROI Dashboard (read-only)',
      '5 team members',
      'Standard support',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For scaling organizations with multi-floor snack operations.',
    monthly: 149,
    annual: 119,
    badge: 'Most Popular',
    drawers: 'Up to 10 drawers',
    cta: 'Start Free Trial',
    features: [
      'Up to 10 snack drawers',
      'CrunchGPT Pro (14-day forecast)',
      'Slack + email + SMS alerts',
      'Full Snack ROI Dashboard',
      'Unlimited team members',
      'Vendor API integration',
      'Priority support',
      'Monthly snack health report',
    ],
  },
  {
    name: 'Enterprise Snack Suite',
    tagline: 'Unlimited snack infrastructure with dedicated concierge.',
    monthly: 299,
    annual: 239,
    badge: 'Enterprise',
    drawers: 'Unlimited drawers',
    cta: 'Contact Sales',
    ctaTo: '/contact',
    features: [
      'Unlimited snack drawers',
      'CrunchGPT Elite (30-day forecast)',
      'Omnichannel alerts + custom webhooks',
      'Executive Snack ROI Suite',
      'Dedicated Snack Concierge',
      'Custom vendor negotiation AI',
      'Allergen compliance engine',
      'SOC 2 Type II audit reports',
      'SLA: 99.99% snack uptime guarantee',
      '24/7 white-glove support',
    ],
  },
])

const tierRows = [
  { label: 'Snack Drawers', starter: '1', growth: 'Up to 10', enterprise: 'Unlimited' },
  { label: 'CrunchGPT Forecast Horizon', starter: '7 days', growth: '14 days', enterprise: '30 days' },
  { label: 'Alert Channels', starter: 'Email', growth: 'Slack, Email, SMS', enterprise: 'All + Webhooks' },
  { label: 'Team Members', starter: '5', growth: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Snack ROI Dashboard', starter: 'Read-only', growth: 'Full', enterprise: 'Executive Suite' },
  { label: 'Vendor API Integration', starter: '—', growth: '✓', enterprise: '✓' },
  { label: 'Snack Concierge', starter: '—', growth: '—', enterprise: '✓' },
  { label: 'SSO / SAML', starter: '—', growth: 'Add-on', enterprise: '✓' },
  { label: 'SOC 2 Reports', starter: '—', growth: '—', enterprise: '✓' },
  { label: 'Support', starter: 'Standard', growth: 'Priority', enterprise: '24/7 White-glove' },
]

const faqs = ref([
  {
    q: 'What exactly counts as a "snack drawer"?',
    a: 'A snack drawer is any designated physical or digital storage unit tracked by SnackTrack Pro. This includes kitchen cabinets, mini-fridges, desk pedestal drawers, and virtual snack allocations for remote employees. Vending machines are counted as 0.5 drawers per our proprietary Drawer Equivalency Model (DEM™).',
    open: false,
  },
  {
    q: 'Is my pretzel data stored in the EU?',
    a: 'SnackTrack Pro offers full data residency options across AWS us-east-1, eu-west-1, and ap-southeast-2 regions. Pretzel consumption data, alongside all other snack telemetry, is encrypted at rest using AES-256 and in transit via TLS 1.3. We do not sell your snack data to competitors.',
    open: false,
  },
  {
    q: 'What happens if CrunchGPT incorrectly forecasts a snack outage?',
    a: 'CrunchGPT maintains a 97.3% forecast accuracy rate across enterprise deployments. In the event of a forecasting miss resulting in a verified Snack Outage Event (SOE), Enterprise Snack Suite customers are eligible for a 1-day service credit and a formal postmortem delivered within 48 business hours. We take snack accuracy seriously.',
    open: false,
  },
  {
    q: 'Can I integrate SnackTrack Pro with our existing ERP system?',
    a: 'Yes. SnackTrack Pro offers native connectors for SAP, Oracle NetSuite, Workday, and Microsoft Dynamics. Our REST API and GraphQL endpoint allow custom integrations with any internal system. We also offer a Zapier integration for teams not yet ready for enterprise-grade snack automation.',
    open: false,
  },
  {
    q: 'What is the Snack Concierge and does it come in person?',
    a: 'The Snack Concierge is a dedicated human analyst assigned to your account who proactively monitors your snack ecosystem, conducts quarterly snack strategy reviews, and coordinates with your approved vendor list. The Snack Concierge operates remotely via Zoom and Slack. On-site snack audits are available as a paid add-on ($2,500/visit, minimum 4-hour engagement).',
    open: false,
  },
])

function toggleFaq(i) {
  faqs.value[i].open = !faqs.value[i].open
}
</script>

<template>
  <div>
    <!-- Hero -->
    <HeroSection
      eyebrow="Transparent Pricing"
      headline="Invest in your snacks. Your team will notice."
      subheadline="Simple, predictable pricing for offices of every crunch volume. No hidden fees, no surprise pretzel surcharges."
      primary-cta="Start Free Trial"
      primary-cta-to="/contact"
    />

    <!-- Billing toggle -->
    <div class="flex items-center justify-center gap-4 pb-4 px-6">
      <span class="text-sm font-medium" :class="!annual ? 'text-white' : 'text-slate-500'">Monthly</span>
      <button
        class="relative w-12 h-6 rounded-full transition-colors"
        :class="annual ? 'bg-[#f5c842]' : 'bg-[#162b55]'"
        @click="annual = !annual"
        aria-label="Toggle annual billing"
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          :class="annual ? 'translate-x-6' : 'translate-x-0'"
        />
      </button>
      <span class="text-sm font-medium" :class="annual ? 'text-white' : 'text-slate-500'">
        Annual <span class="text-[#f5c842] text-xs font-bold ml-1">Save 20%</span>
      </span>
    </div>

    <!-- Pricing cards -->
    <section class="py-10 px-6">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="(plan, i) in plans"
          :key="plan.name"
          class="relative rounded-2xl border p-8 flex flex-col"
          :class="i === 1
            ? 'border-[#f5c842]/40 bg-gradient-to-b from-[#162b55]/60 to-[#0a1628]'
            : 'border-[#162b55] bg-[#0a1628]'"
        >
          <div v-if="plan.badge" class="absolute -top-3 left-1/2 -translate-x-1/2">
            <span
              class="text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full"
              :class="plan.badge === 'Most Popular' ? 'bg-[#f5c842] text-[#050d1a]' : 'bg-[#162b55] text-[#f5c842] border border-[#f5c842]/30'"
            >
              {{ plan.badge }}
            </span>
          </div>

          <h3 class="text-white font-bold text-xl mb-1">{{ plan.name }}</h3>
          <p class="text-slate-500 text-sm mb-6">{{ plan.tagline }}</p>

          <div class="mb-6">
            <div class="flex items-end gap-1">
              <span class="text-5xl font-black text-white">${{ annual ? plan.annual : plan.monthly }}</span>
              <span class="text-slate-500 text-sm mb-2">/mo</span>
            </div>
            <p class="text-slate-500 text-xs mt-1">{{ annual ? 'billed annually' : 'billed monthly' }} · {{ plan.drawers }}</p>
          </div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2.5 text-sm text-slate-300">
              <svg class="w-4 h-4 text-[#f5c842] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ feat }}
            </li>
          </ul>

          <NuxtLink
            :to="plan.ctaTo || '/contact'"
            class="block text-center py-3 px-6 rounded font-bold text-sm transition-colors"
            :class="i === 1
              ? 'bg-[#f5c842] text-[#050d1a] hover:bg-[#e6b800]'
              : 'border border-[#162b55] text-white hover:border-[#f5c842]/40'"
          >
            {{ plan.cta }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Tier comparison table -->
    <section class="py-16 px-6 border-t border-[#162b55]">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-black text-white text-center mb-10">Full plan comparison</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-[#162b55]">
                <th class="text-left py-3 pr-6 text-slate-400 text-sm font-medium w-1/3">Feature</th>
                <th class="text-center py-3 px-4 text-slate-300 font-medium text-sm">Starter</th>
                <th class="text-center py-3 px-4 text-[#f5c842] font-bold text-sm">Growth</th>
                <th class="text-center py-3 px-4 text-slate-300 font-medium text-sm">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tierRows" :key="row.label" class="border-b border-[#162b55]/50 hover:bg-[#0f2040]/30 transition-colors">
                <td class="py-3.5 pr-6 text-slate-400 text-sm">{{ row.label }}</td>
                <td class="py-3.5 px-4 text-center text-slate-300 text-sm">{{ row.starter }}</td>
                <td class="py-3.5 px-4 text-center text-[#f5c842] text-sm font-medium">{{ row.growth }}</td>
                <td class="py-3.5 px-4 text-center text-slate-300 text-sm">{{ row.enterprise }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- FAQ accordion -->
    <section class="py-16 px-6 bg-[#0a1628] border-t border-[#162b55]">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <SectionLabel text="Common Questions" />
          <h2 class="text-3xl font-black text-white mt-2">Frequently asked questions.</h2>
        </div>
        <div class="space-y-3">
          <div
            v-for="(faq, i) in faqs"
            :key="i"
            class="border border-[#162b55] rounded-xl overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#0f2040]/50 transition-colors"
              @click="toggleFaq(i)"
            >
              <span class="text-white font-semibold text-sm pr-4">{{ faq.q }}</span>
              <svg
                class="w-5 h-5 text-[#f5c842] shrink-0 transition-transform"
                :class="faq.open ? 'rotate-180' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-show="faq.open" class="px-6 pb-5">
              <p class="text-slate-400 text-sm leading-relaxed">{{ faq.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <CtaBanner
      headline="Ready to transform your snack operations?"
      sub="Start a free 30-day trial. No credit card. No snack commitment required."
    />
  </div>
</template>
