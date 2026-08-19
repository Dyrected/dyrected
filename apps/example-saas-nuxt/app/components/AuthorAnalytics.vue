<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  doc?: any
  user?: any
  timeframe?: string
}>()

const authorName = computed(() => props.doc?.name || "Author")
const period = computed(() => props.timeframe || "30d")

const stats = [
  { label: "Total Views", value: "34.2K", change: "+14.8%", tone: "emerald" },
  { label: "Avg. Read Time", value: "4m 12s", change: "+8.2%", tone: "blue" },
  { label: "Engagement", value: "5.4%", change: "+2.1%", tone: "purple" },
  { label: "Subscriber Growth", value: "+182", change: "+24.0%", tone: "amber" },
]
</script>

<template>
  <div className="dy-w-full dy-p-5 dy-bg-card dy-border dy-border-border/60 dy-rounded-2xl dy-shadow-xs dy-space-y-4">
    <div className="dy-flex dy-items-center dy-justify-between">
      <div className="dy-flex dy-items-center dy-gap-2.5">
        <div className="dy-h-2.5 dy-w-2.5 dy-rounded-full dy-bg-emerald-500 dy-animate-pulse" />
        <h4 className="dy-text-sm dy-font-semibold dy-text-foreground">
          Performance & Engagement for {{ authorName }}
        </h4>
      </div>
      <span className="dy-px-2.5 dy-py-1 dy-text-xs dy-font-semibold dy-rounded-full dy-bg-primary/10 dy-text-primary dy-border dy-border-primary/20">
        Last {{ period }}
      </span>
    </div>

    <div className="dy-grid dy-grid-cols-2 sm:dy-grid-cols-4 dy-gap-3.5">
      <div
        v-for="(item, idx) in stats"
        :key="idx"
        className="dy-p-3.5 dy-rounded-xl dy-bg-muted/30 dy-border dy-border-border/40 dy-space-y-1"
      >
        <div className="dy-text-xs dy-font-medium dy-text-muted-foreground">
          {{ item.label }}
        </div>
        <div className="dy-flex dy-items-baseline dy-justify-between dy-gap-2">
          <span className="dy-text-xl dy-font-bold dy-tracking-tight dy-text-foreground">
            {{ item.value }}
          </span>
          <span className="dy-text-[11px] dy-font-semibold dy-text-emerald-600 dark:dy-text-emerald-400">
            {{ item.change }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
