<script setup>
const route = useRoute()
const mobileOpen = ref(false)

const links = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

function isActive(path) {
  return route.path === path
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-[#162b55] bg-[#050d1a]/95 backdrop-blur-sm">
    <nav class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <div class="w-8 h-8 bg-[#f5c842] rounded flex items-center justify-center">
          <span class="text-[#050d1a] font-black text-sm">ST</span>
        </div>
        <span class="font-bold text-white text-lg tracking-tight">
          SnackTrack <span class="text-[#f5c842]">Pro</span>
        </span>
      </NuxtLink>

      <!-- Desktop nav -->
      <ul class="hidden md:flex items-center gap-1">
        <li v-for="link in links" :key="link.to">
          <NuxtLink
            :to="link.to"
            class="px-4 py-2 rounded text-sm font-medium transition-colors"
            :class="isActive(link.to)
              ? 'text-[#f5c842] bg-[#162b55]'
              : 'text-slate-300 hover:text-white hover:bg-[#0f2040]'"
          >
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="hidden md:flex items-center gap-3">
        <NuxtLink to="/contact" class="text-sm text-slate-300 hover:text-white transition-colors">Log in</NuxtLink>
        <NuxtLink
          to="/contact"
          class="px-4 py-2 bg-[#f5c842] text-[#050d1a] text-sm font-bold rounded hover:bg-[#e6b800] transition-colors"
        >
          Request Demo
        </NuxtLink>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden text-slate-300 hover:text-white p-1"
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
    </nav>

    <!-- Mobile menu -->
    <div v-show="mobileOpen" class="md:hidden border-t border-[#162b55] bg-[#0a1628] px-6 py-4 space-y-1">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="block px-4 py-2.5 rounded text-sm font-medium transition-colors"
        :class="isActive(link.to)
          ? 'text-[#f5c842] bg-[#162b55]'
          : 'text-slate-300 hover:text-white hover:bg-[#0f2040]'"
        @click="mobileOpen = false"
      >
        {{ link.label }}
      </NuxtLink>
      <div class="pt-3 border-t border-[#162b55]">
        <NuxtLink
          to="/contact"
          class="block w-full text-center px-4 py-2.5 bg-[#f5c842] text-[#050d1a] text-sm font-bold rounded"
          @click="mobileOpen = false"
        >
          Request Demo
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
