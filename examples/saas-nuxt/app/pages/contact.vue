<script setup>
useHead({
  title: 'Contact — SnackTrack Pro',
  meta: [{ name: 'description', content: 'Talk to our Sales team, Support desk, or dedicated Snack Concierge.' }],
})

const form = ref({
  name: '',
  company: '',
  drawers: '',
  message: '',
})

const errors = ref({})
const submitted = ref(false)
const submitting = ref(false)

function validate() {
  const e = {}
  if (!form.value.name.trim()) e.name = 'Name is required.'
  if (!form.value.company.trim()) e.company = 'Company is required.'
  if (!form.value.drawers) {
    e.drawers = 'Please select an option.'
  }
  if (!form.value.message.trim()) e.message = 'Message is required.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 1200))
  submitted.value = true
  submitting.value = false
}

const contacts = [
  {
    label: 'Sales',
    email: 'sales@snacktrack.pro',
    desc: 'For new business inquiries, demos, and enterprise proposals. We respond within 1 business day.',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />`,
  },
  {
    label: 'Support',
    email: 'support@snacktrack.pro',
    desc: 'For existing customers experiencing snack data issues, CrunchGPT anomalies, or alert failures.',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />`,
  },
  {
    label: 'Snack Concierge',
    email: 'concierge@snacktrack.pro',
    desc: 'Enterprise Snack Suite customers only. Your dedicated analyst is available Mon–Fri, 8 AM–8 PM ET.',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />`,
  },
]

const offices = [
  {
    city: 'San Francisco (HQ)',
    address: '550 Snack Market Street, Suite 1400\nSan Francisco, CA 94105',
  },
  {
    city: 'New York',
    address: '1 Crunch Plaza, 42nd Floor\nNew York, NY 10036',
  },
  {
    city: 'London',
    address: '25 Pretzel Lane, Level 8\nLondon, EC2A 4BQ, UK',
  },
  {
    city: 'Singapore',
    address: '1 Marina Bay Munchies Tower\nSingapore 018989',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <HeroSection
      eyebrow="Get In Touch"
      headline="Let's talk about your snack infrastructure."
      subheadline="Our team is standing by to assess your snack situation, walk you through a live demo, or simply listen to your pain."
      :primary-cta="''"
    />

    <!-- Form + contact options -->
    <section class="py-4 px-6 pb-20">
      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

        <!-- Contact form -->
        <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-8">
          <h2 class="text-white font-black text-xl mb-6">Request a Snack Demo</h2>

          <div v-if="submitted" class="text-center py-10">
            <div class="w-16 h-16 bg-[#f5c842]/10 border border-[#f5c842]/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg class="w-8 h-8 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-white font-bold text-lg mb-2">Request received.</h3>
            <p class="text-slate-400 text-sm">A member of our Snack Intelligence team will contact you within 1 business day to schedule your personalized demo and complimentary snack audit.</p>
          </div>

          <form v-else class="space-y-5" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="name">Full Name</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                placeholder="Rebecca Holtsworth"
                class="w-full bg-[#0f2040] border rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f5c842]/50 transition-colors"
                :class="errors.name ? 'border-red-500/60' : 'border-[#162b55]'"
              />
              <p v-if="errors.name" class="mt-1 text-red-400 text-xs">{{ errors.name }}</p>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="company">Company Name</label>
              <input
                id="company"
                v-model="form.company"
                type="text"
                placeholder="Meridian Consulting Group"
                class="w-full bg-[#0f2040] border rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f5c842]/50 transition-colors"
                :class="errors.company ? 'border-red-500/60' : 'border-[#162b55]'"
              />
              <p v-if="errors.company" class="mt-1 text-red-400 text-xs">{{ errors.company }}</p>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="drawers">Number of Snack Drawers</label>
              <select
                id="drawers"
                v-model="form.drawers"
                class="w-full bg-[#0f2040] border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f5c842]/50 transition-colors appearance-none"
                :class="errors.drawers ? 'border-red-500/60' : 'border-[#162b55]'"
              >
                <option value="" disabled class="text-slate-600">Select drawer count</option>
                <option value="1">1 drawer (just getting started)</option>
                <option value="2-5">2–5 drawers (growing team)</option>
                <option value="6-10">6–10 drawers (mid-market)</option>
                <option value="11-50">11–50 drawers (enterprise)</option>
                <option value="50+">50+ drawers (we have a problem)</option>
              </select>
              <p v-if="errors.drawers" class="mt-1 text-red-400 text-xs">{{ errors.drawers }}</p>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5" for="message">Tell us about your snack situation</label>
              <textarea
                id="message"
                v-model="form.message"
                rows="4"
                placeholder="We're a 400-person consulting firm with 12 floors of unmanaged snack drawers. Things have gotten out of hand."
                class="w-full bg-[#0f2040] border rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f5c842]/50 transition-colors resize-none"
                :class="errors.message ? 'border-red-500/60' : 'border-[#162b55]'"
              />
              <p v-if="errors.message" class="mt-1 text-red-400 text-xs">{{ errors.message }}</p>
            </div>

            <button
              type="submit"
              class="w-full py-3.5 bg-[#f5c842] text-[#050d1a] font-black rounded hover:bg-[#e6b800] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="submitting"
            >
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ submitting ? 'Sending...' : 'Request Snack Demo' }}
            </button>

            <p class="text-slate-600 text-xs text-center">By submitting, you agree to receive snack-related communications. You can unsubscribe at any time by emailing unsubscribe@snacktrack.pro.</p>
          </form>
        </div>

        <!-- Contact option cards -->
        <div class="space-y-4">
          <div
            v-for="contact in contacts"
            :key="contact.label"
            class="bg-[#0a1628] border border-[#162b55] rounded-xl p-6 hover:border-[#f5c842]/20 transition-colors"
          >
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 bg-[#f5c842]/10 border border-[#f5c842]/20 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-html="contact.icon" />
                </svg>
              </div>
              <div>
                <h3 class="text-white font-bold text-sm mb-1">{{ contact.label }}</h3>
                <a :href="`mailto:${contact.email}`" class="text-[#f5c842] text-sm hover:underline">{{ contact.email }}</a>
                <p class="text-slate-400 text-xs mt-2 leading-relaxed">{{ contact.desc }}</p>
              </div>
            </div>
          </div>

          <!-- Office locations -->
          <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-6">
            <h3 class="text-white font-bold text-sm mb-5">Global Offices</h3>
            <div class="grid grid-cols-2 gap-4">
              <div v-for="office in offices" :key="office.city" class="space-y-1">
                <p class="text-[#f5c842] text-xs font-bold uppercase tracking-wide">{{ office.city }}</p>
                <p class="text-slate-400 text-xs leading-relaxed whitespace-pre-line">{{ office.address }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
