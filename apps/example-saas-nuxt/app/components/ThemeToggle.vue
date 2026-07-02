<script setup lang="ts">
import { ref } from 'vue'
import type { ThemePreference } from '~/composables/useTheme'

const { preference, resolvedTheme, setTheme } = useTheme()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function choose(value: ThemePreference) {
  setTheme(value)
  open.value = false
}

function onClickOutside(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Change theme"
      title="Theme"
      @click="open = !open"
    >
      <!-- Sun -->
      <svg v-if="resolvedTheme === 'light'" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <!-- Moon -->
      <svg v-else class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>

    <Transition name="menu">
      <div
        v-if="open"
        role="menu"
        class="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-1 z-50"
      >
        <p class="px-2 py-1.5 text-xs text-muted-foreground">Theme</p>
        <div class="h-px bg-border my-1" />
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="menuitemradio"
          :aria-checked="preference === option.value"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          @click="choose(option.value)"
        >
          <!-- Monitor -->
          <svg v-if="option.value === 'system'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path stroke-linecap="round" d="M8 21h8M12 17v4" />
          </svg>
          <!-- Sun -->
          <svg v-else-if="option.value === 'light'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <!-- Moon -->
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span class="flex-1 text-left">{{ option.label }}</span>
          <svg v-if="preference === option.value" class="w-3.5 h-3.5 text-intelligence" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
