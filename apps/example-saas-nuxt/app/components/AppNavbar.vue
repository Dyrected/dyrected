<script setup>
const route = useRoute()
const mobileOpen = ref(false)

// Branding (logo, name) is content-managed via the "settings" global.
const branding = useBranding()

// Navigation is content-managed via the Dyrected "navigation" global.
const { data: nav } = await useDyrectedGlobal('navigation')

const fallbackLinks = [
  { label: 'Home', href: '/', external: false },
  { label: 'Features', href: '/features', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
  { label: 'About', href: '/about', external: false },
  { label: 'Contact', href: '/contact', external: false },
]

const links = computed(() => {
  const raw = nav.value?.navLinks
  if (!Array.isArray(raw) || raw.length === 0) return fallbackLinks
  return raw
    .filter((link) => link?.title)
    .map((link) => ({ label: link.title, ...resolveLink(link.url) }))
})

const cta = computed(() => {
  const button = nav.value?.ctaButton
  const { href, external } = resolveLink(button)
  const label = (button && typeof button === 'object' && button.label) || 'Request Demo'
  return { label, href: href === '#' ? '/contact' : href, external }
})

function isActive(link) {
  return !link.external && route.path === link.href
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
    <nav class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <DyrectedMedia
          v-if="branding.logo"
          :media="branding.logo"
          :alt="branding.siteName"
          class="h-8 w-auto"
        >
          <template #fallback>
            <div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span class="text-primary-foreground font-black text-sm">{{ branding.initials }}</span>
            </div>
          </template>
        </DyrectedMedia>
        <div v-else class="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <span class="text-primary-foreground font-black text-sm">{{ branding.initials }}</span>
        </div>
        <span class="font-bold text-foreground text-lg tracking-tight">
          {{ branding.nameLead }}<template v-if="branding.nameAccent"> <span class="text-intelligence">{{ branding.nameAccent }}</span></template>
        </span>
      </NuxtLink>

      <!-- Desktop nav -->
      <ul class="hidden md:flex items-center gap-1">
        <li v-for="link in links" :key="link.label">
          <NuxtLink
            :to="link.href"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
            class="px-4 py-2 rounded text-sm font-medium transition-colors"
            :class="isActive(link)
              ? 'text-accent-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="hidden md:flex items-center gap-3">
        <NuxtLink to="/contact" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</NuxtLink>
        <ThemeToggle />
        <NuxtLink
          :to="cta.href"
          :target="cta.external ? '_blank' : undefined"
          :rel="cta.external ? 'noopener noreferrer' : undefined"
          class="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded hover:bg-primary/90 transition-colors"
        >
          {{ cta.label }}
        </NuxtLink>
      </div>

      <!-- Mobile controls -->
      <div class="md:hidden flex items-center gap-1">
        <ThemeToggle />
        <button
          class="text-muted-foreground hover:text-foreground p-1"
          @click="mobileOpen = !mobileOpen"
          aria-label="Toggle menu"
        >
          <svg v-if="!mobileOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Mobile menu -->
    <div v-show="mobileOpen" class="md:hidden border-t border-border bg-card px-6 py-4 space-y-1">
      <NuxtLink
        v-for="link in links"
        :key="link.label"
        :to="link.href"
        :target="link.external ? '_blank' : undefined"
        :rel="link.external ? 'noopener noreferrer' : undefined"
        class="block px-4 py-2.5 rounded text-sm font-medium transition-colors"
        :class="isActive(link)
          ? 'text-accent-foreground bg-accent'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        @click="mobileOpen = false"
      >
        {{ link.label }}
      </NuxtLink>
      <div class="pt-3 border-t border-border">
        <NuxtLink
          :to="cta.href"
          :target="cta.external ? '_blank' : undefined"
          :rel="cta.external ? 'noopener noreferrer' : undefined"
          class="block w-full text-center px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded"
          @click="mobileOpen = false"
        >
          {{ cta.label }}
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
