<script setup>
import { onMounted, ref } from 'vue'

useHead({
  title: 'Features — SnackTrack Pro',
  meta: [{ name: 'description', content: 'Explore CrunchGPT AI Forecasting, Real-Time Snack Alerts, and the Snack ROI Dashboard.' }],
})

const chartCanvas = ref(null)

onMounted(async () => {
  if (!chartCanvas.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Snack ROI (%)',
          data: [42, 58, 55, 71, 68, 89, 95, 102, 118, 131, 145, 162],
          borderColor: '#f5c842',
          backgroundColor: 'rgba(245, 200, 66, 0.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#f5c842',
          pointRadius: 4,
        },
        {
          label: 'Employee Satisfaction Index',
          data: [61, 63, 65, 70, 72, 78, 82, 85, 88, 91, 94, 97],
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#60a5fa',
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 12 } },
        },
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#162b55' } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#162b55' } },
      },
    },
  })
})

const comparisonRows = [
  { feature: 'AI Snack Forecasting', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'Real-Time Slack Alerts', snacktrack: true, snacksheet: true, munchbase: false },
  { feature: 'Snack ROI Dashboard', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'Multi-Drawer Support', snacktrack: true, snacksheet: true, munchbase: true },
  { feature: 'Snack Concierge Service', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'Allergen Compliance Engine', snacktrack: true, snacksheet: false, munchbase: true },
  { feature: 'Vendor Negotiation AI', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'SOC 2 Type II Certified', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'ISO 9001 Snack Certified', snacktrack: true, snacksheet: false, munchbase: false },
  { feature: 'SSO / SAML Integration', snacktrack: true, snacksheet: true, munchbase: true },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <HeroSection
      eyebrow="Platform Capabilities"
      headline="Built for enterprises that take snacks seriously."
      subheadline="Every feature engineered to eliminate snack risk, maximize crunch uptime, and deliver measurable ROI to your office pantry."
      primary-cta="Request a Snack Demo"
      primary-cta-to="/contact"
      secondary-cta="View Pricing"
      secondary-cta-to="/pricing"
    />

    <!-- CrunchGPT section -->
    <section class="py-20 px-6 border-t border-[#162b55]">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel text="AI Forecasting" />
            <h2 class="text-3xl md:text-4xl font-black text-white mt-2 mb-5">
              CrunchGPT™<br />AI Forecasting
            </h2>
            <p class="text-slate-400 leading-relaxed mb-6">
              Trained on 40 billion snack consumption data points across 12,000 enterprise offices, CrunchGPT delivers hyper-accurate depletion forecasts up to 14 days in advance. It accounts for seasonality (Q4 cookie surge), meeting density, and even macroeconomic stress indicators that correlate with increased chip consumption.
            </p>
            <ul class="space-y-3">
              <li v-for="item in ['14-day predictive snack horizon', '47-variable consumption model', 'Seasonality-aware (holiday adjustment)', 'Meeting density correlation engine', 'Stress-event spike detection']" :key="item" class="flex items-center gap-3 text-slate-300 text-sm">
                <svg class="w-5 h-5 text-[#f5c842] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Mockup placeholder -->
          <div class="bg-[#0a1628] border border-[#162b55] rounded-xl overflow-hidden">
            <div class="bg-[#0f2040] border-b border-[#162b55] px-4 py-3 flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500/60" />
              <div class="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div class="w-3 h-3 rounded-full bg-green-500/60" />
              <span class="ml-3 text-slate-500 text-xs font-mono">crunchgpt-dashboard.snacktrack.pro</span>
            </div>
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 text-sm font-mono">SNACK FORECAST — FLOOR 14</span>
                <span class="text-[#f5c842] text-xs font-bold uppercase tracking-wider">LIVE</span>
              </div>
              <div class="space-y-3">
                <div v-for="item in [{ name: 'Doritos (Nacho)', pct: 87, days: 2 }, { name: 'KIND Bars (Almond)', pct: 61, days: 5 }, { name: 'Pretzels (Salted)', pct: 34, days: 9 }, { name: 'Granola Mix', pct: 18, days: 14 }]" :key="item.name">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-slate-300">{{ item.name }}</span>
                    <span :class="item.days <= 3 ? 'text-red-400' : item.days <= 7 ? 'text-yellow-400' : 'text-green-400'" class="font-mono">{{ item.days }}d remaining</span>
                  </div>
                  <div class="h-2 bg-[#162b55] rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="item.days <= 3 ? 'bg-red-400' : item.days <= 7 ? 'bg-yellow-400' : 'bg-[#f5c842]'"
                      :style="`width: ${item.pct}%`"
                    />
                  </div>
                </div>
              </div>
              <div class="bg-[#162b55]/50 rounded-lg p-3 border border-[#162b55]">
                <p class="text-xs text-slate-400 font-mono">⚡ CrunchGPT recommends: <span class="text-[#f5c842]">Order 3× Doritos before Thu 09:00 AM to avoid Snack Outage Event.</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Real-Time Snack Alerts -->
    <section class="py-20 px-6 bg-[#0a1628] border-y border-[#162b55]">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <!-- Alert mockup -->
          <div class="space-y-3 order-2 lg:order-1">
            <div class="bg-[#1a1a2e] border border-[#4a154b]/40 rounded-xl p-4 flex gap-3 items-start">
              <div class="w-8 h-8 bg-[#4a154b] rounded flex items-center justify-center shrink-0">
                <span class="text-white text-xs font-bold">#</span>
              </div>
              <div>
                <p class="text-slate-300 text-sm"><span class="text-[#f5c842] font-semibold">@snacktrack-bot</span> Snack Alert: Doritos inventory on Floor 14 has dropped below critical threshold (2 bags remaining). Recommended action: reorder within 4 hours. <span class="text-slate-500">— #snack-ops</span></p>
                <p class="text-slate-600 text-xs mt-1">Slack · just now</p>
              </div>
            </div>
            <div class="bg-[#0f2040] border border-[#162b55] rounded-xl p-4 flex gap-3 items-start">
              <div class="w-8 h-8 bg-[#f5c842] rounded flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-[#050d1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p class="text-slate-300 text-sm font-medium">CRITICAL: Snack Outage Imminent — Floor 14</p>
                <p class="text-slate-500 text-xs mt-1">From: alerts@snacktrack.pro · To: pantry-team@meridian.com</p>
                <p class="text-slate-400 text-xs mt-2">CrunchGPT has detected a 94% probability of snack outage by Thursday 2:30 PM based on current consumption trajectory...</p>
              </div>
            </div>
            <div class="bg-[#0f2040] border border-[#162b55] rounded-xl p-4 flex gap-3 items-start">
              <div class="w-8 h-8 bg-green-600 rounded flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2v-1a7 7 0 00-14 0v1a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p class="text-slate-300 text-sm font-medium">SMS: SnackTrack Pro Alert</p>
                <p class="text-slate-500 text-xs mt-1">To: +1 (555) 847-2200</p>
                <p class="text-slate-400 text-xs mt-2">[SNACKTRACK] URGENT: Pretzels depleted Floor 14. Auto-reorder placed. Estimated arrival: 11:30 AM tomorrow. Reply STOP to opt out.</p>
              </div>
            </div>
          </div>

          <div class="order-1 lg:order-2">
            <SectionLabel text="Real-Time Alerts" />
            <h2 class="text-3xl md:text-4xl font-black text-white mt-2 mb-5">
              Never miss a<br />snack outage event.
            </h2>
            <p class="text-slate-400 leading-relaxed mb-6">
              SnackTrack Pro's omnichannel alert system ensures the right people receive the right snack intelligence at the right time. With configurable thresholds, escalation policies, and on-call snack rotations, your pantry team is always one step ahead of depletion.
            </p>
            <ul class="space-y-3">
              <li v-for="item in ['Slack, email, and SMS multi-channel alerts', 'Configurable depletion thresholds per drawer', 'Escalation policies with on-call rotations', 'Auto-reorder with vendor API integration', 'Snack incident postmortem reports']" :key="item" class="flex items-center gap-3 text-slate-300 text-sm">
                <svg class="w-5 h-5 text-[#f5c842] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Snack ROI Dashboard -->
    <section class="py-20 px-6">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel text="Business Intelligence" />
            <h2 class="text-3xl md:text-4xl font-black text-white mt-2 mb-5">
              Snack ROI Dashboard.<br />Prove it to your CFO.
            </h2>
            <p class="text-slate-400 leading-relaxed mb-6">
              Every CFO asks the same question: "What is the return on our pretzel investment?" Now you have an answer. The Snack ROI Dashboard correlates snack availability with employee satisfaction scores, productivity indices, and retention metrics — all in a single executive-ready view.
            </p>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-4 text-center">
                <p class="text-3xl font-black text-[#f5c842]">162%</p>
                <p class="text-slate-400 text-xs mt-1">Avg. Snack ROI at 12 months</p>
              </div>
              <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-4 text-center">
                <p class="text-3xl font-black text-[#f5c842]">97pts</p>
                <p class="text-slate-400 text-xs mt-1">Peak Employee Satisfaction Index</p>
              </div>
            </div>
          </div>

          <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white font-semibold text-sm">Snack Performance — FY 2025</h3>
              <span class="text-[#f5c842] text-xs font-mono bg-[#f5c842]/10 px-2 py-1 rounded">LIVE DATA</span>
            </div>
            <div class="relative h-64">
              <canvas ref="chartCanvas" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison table -->
    <section class="py-20 px-6 bg-[#0a1628] border-t border-[#162b55]">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <SectionLabel text="Competitive Analysis" />
          <h2 class="text-3xl font-black text-white mt-2">How we compare.</h2>
          <p class="text-slate-400 mt-3 text-sm">Based on independent analysis by Snack Analyst Firm GartnerMunch, Q4 2025.</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-[#162b55]">
                <th class="text-left py-4 pr-6 text-slate-400 text-sm font-medium">Feature</th>
                <th class="text-center py-4 px-4 text-[#f5c842] font-bold text-sm">SnackTrack Pro</th>
                <th class="text-center py-4 px-4 text-slate-400 font-medium text-sm">SnackSheet</th>
                <th class="text-center py-4 px-4 text-slate-400 font-medium text-sm">MunchBase</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparisonRows" :key="row.feature" class="border-b border-[#162b55]/50 hover:bg-[#0f2040]/50 transition-colors">
                <td class="py-3.5 pr-6 text-slate-300 text-sm">{{ row.feature }}</td>
                <td class="py-3.5 px-4 text-center">
                  <span v-if="row.snacktrack" class="text-[#f5c842]">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span v-else class="text-slate-600">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span v-if="row.snacksheet" class="text-slate-400">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span v-else class="text-slate-600">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span v-if="row.munchbase" class="text-slate-400">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span v-else class="text-slate-600">
                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <CtaBanner />
  </div>
</template>
