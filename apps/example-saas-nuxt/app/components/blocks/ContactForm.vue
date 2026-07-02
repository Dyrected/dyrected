<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  heading?: string;
  subheading?: string;
}>();

const form = ref({
  name: '',
  company: '',
  drawers: '',
  message: '',
})

const errors = ref<Record<string, string>>({})
const submitted = ref(false)
const submitting = ref(false)

function validate() {
  const e: Record<string, string> = {}
  if (!form.value.name.trim()) e.name = 'Name is required.'
  if (!form.value.company.trim()) e.company = 'Company is required.'
  if (!form.value.drawers) e.drawers = 'Please select an option.'
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
    desc: 'For new business inquiries, demos, and enterprise proposals.',
  },
  {
    label: 'Support',
    email: 'support@snacktrack.pro',
    desc: 'For existing customers experiencing snack data issues.',
  }
]
</script>

<template>
  <section class="py-20 px-6">
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
      <!-- Contact form -->
      <div class="bg-card border border-border rounded-xl p-8">
        <h2 class="text-foreground font-black text-xl mb-6">{{ heading || 'Request a Snack Demo' }}</h2>

        <div v-if="submitted" class="text-center py-10">
          <div class="w-16 h-16 bg-intelligence/10 border border-intelligence/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-intelligence" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-foreground font-bold text-lg mb-2">Request received.</h3>
          <p class="text-muted-foreground text-sm">A member of our Snack Intelligence team will contact you shortly.</p>
        </div>

        <form v-else class="space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-muted-foreground text-sm font-medium mb-1.5" for="name">Full Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Rebecca Holtsworth"
              class="w-full bg-muted border rounded-lg px-4 py-3 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-intelligence/50 transition-colors"
              :class="errors.name ? 'border-red-500/60' : 'border-border'"
            />
          </div>

          <div>
            <label class="block text-muted-foreground text-sm font-medium mb-1.5" for="company">Company Name</label>
            <input
              id="company"
              v-model="form.company"
              type="text"
              placeholder="Meridian Consulting Group"
              class="w-full bg-muted border rounded-lg px-4 py-3 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-intelligence/50 transition-colors"
              :class="errors.company ? 'border-red-500/60' : 'border-border'"
            />
          </div>

          <div>
            <label class="block text-muted-foreground text-sm font-medium mb-1.5" for="drawers">Number of Snack Drawers</label>
            <select
              id="drawers"
              v-model="form.drawers"
              class="w-full bg-muted border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-intelligence/50 transition-colors appearance-none"
              :class="errors.drawers ? 'border-red-500/60' : 'border-border'"
            >
              <option value="" disabled>Select drawer count</option>
              <option value="1">1 drawer</option>
              <option value="2-5">2–5 drawers</option>
              <option value="6-10">6–10 drawers</option>
              <option value="11+">11+ drawers</option>
            </select>
          </div>

          <div>
            <label class="block text-muted-foreground text-sm font-medium mb-1.5" for="message">Message</label>
            <textarea
              id="message"
              v-model="form.message"
              rows="4"
              class="w-full bg-muted border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-intelligence/50 transition-colors resize-none"
              :class="errors.message ? 'border-red-500/60' : 'border-border'"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-primary text-primary-foreground font-black rounded hover:bg-primary/90 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            :disabled="submitting"
          >
            {{ submitting ? 'Sending...' : 'Request Snack Demo' }}
          </button>
        </form>
      </div>

      <!-- Info cards -->
      <div class="space-y-4">
        <div v-for="c in contacts" :key="c.label" class="bg-card border border-border rounded-xl p-6">
          <h3 class="text-foreground font-bold text-sm mb-1">{{ c.label }}</h3>
          <p class="text-intelligence text-sm mb-2">{{ c.email }}</p>
          <p class="text-muted-foreground text-xs leading-relaxed">{{ c.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
