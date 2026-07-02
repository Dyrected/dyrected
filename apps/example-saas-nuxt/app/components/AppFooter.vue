<script setup>
import { computed } from 'vue'

// Branding (logo, name) is shared with the navbar via the "settings" global.
const branding = useBranding()

// Footer content is content-managed via the "footer" global. Default content
// lives on that global's `initialData` in dyrected.config.ts (auto-seeded on
// first read), so this component only shapes the data for rendering.
const { data } = await useDyrectedGlobal('footer')

const footer = computed(() => {
  const value = data.value || {}
  const columns = Array.isArray(value.columns) ? value.columns : []
  return {
    description: value.description || '',
    columns: columns.map((column) => ({
      heading: column.heading,
      links: (column.links || []).map((item) => {
        const field = item.link
        const label = (field && typeof field === 'object' && field.label) || ''
        return { label, ...resolveLink(field) }
      }),
    })),
    copyright: value.copyright || '',
    badges: Array.isArray(value.badges) ? value.badges : [],
  }
})

const badgeLine = computed(() =>
  footer.value.badges
    .map((badge) => badge?.text)
    .filter(Boolean)
    .join(' • '),
)
</script>

<template>
  <footer class="border-t border-border bg-card mt-auto">
    <div class="max-w-7xl mx-auto px-6 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div class="md:col-span-1">
          <NuxtLink to="/" class="flex items-center gap-2 mb-4">
            <DyrectedMedia
              v-if="branding.logo"
              :media="branding.logo"
              :alt="branding.siteName"
              class="h-7 w-auto"
            >
              <template #fallback>
                <div class="w-7 h-7 bg-primary rounded flex items-center justify-center">
                  <span class="text-primary-foreground font-black text-xs">{{ branding.initials }}</span>
                </div>
              </template>
            </DyrectedMedia>
            <div v-else class="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <span class="text-primary-foreground font-black text-xs">{{ branding.initials }}</span>
            </div>
            <span class="font-bold text-foreground">
              {{ branding.nameLead }}<template v-if="branding.nameAccent"> <span class="text-intelligence">{{ branding.nameAccent }}</span></template>
            </span>
          </NuxtLink>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ footer.description }}
          </p>
        </div>

        <div v-for="column in footer.columns" :key="column.heading">
          <h4 class="text-foreground font-semibold text-sm mb-4 uppercase tracking-wider">
            {{ column.heading }}
          </h4>
          <ul class="space-y-2.5">
            <li v-for="link in column.links" :key="link.label">
              <NuxtLink
                :to="link.href"
                :target="link.external ? '_blank' : undefined"
                :rel="link.external ? 'noopener noreferrer' : undefined"
                class="text-muted-foreground text-sm hover:text-intelligence transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-10 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <p class="text-muted-foreground text-sm">{{ footer.copyright }}</p>
        <p v-if="badgeLine" class="text-muted-foreground text-xs">{{ badgeLine }}</p>
      </div>
    </div>
  </footer>
</template>
