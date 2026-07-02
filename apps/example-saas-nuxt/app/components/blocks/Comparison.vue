<script setup lang="ts">
interface ComparisonRow {
  feature: string;
  snacktrack: boolean | string;
  competitorA: boolean | string;
  competitorB: boolean | string;
}

defineProps<{
  heading?: string;
  rows: ComparisonRow[];
}>();
</script>

<template>
  <section class="py-16 px-6 border-t border-border">
    <div class="max-w-4xl mx-auto">
      <h2 v-if="heading" class="text-2xl font-black text-foreground text-center mb-10">{{ heading }}</h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 pr-6 text-muted-foreground text-sm font-medium w-1/3">Feature</th>
              <th class="text-center py-3 px-4 text-intelligence font-bold text-sm">SnackTrack Pro</th>
              <th class="text-center py-3 px-4 text-muted-foreground font-medium text-sm">Legacy ERP</th>
              <th class="text-center py-3 px-4 text-muted-foreground font-medium text-sm">Manual Audit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.feature" class="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td class="py-3.5 pr-6 text-muted-foreground text-sm">{{ row.feature }}</td>
              <td class="py-3.5 px-4 text-center text-intelligence text-sm font-medium">
                <template v-if="typeof row.snacktrack === 'boolean'">
                   <svg v-if="row.snacktrack" class="w-5 h-5 mx-auto text-intelligence" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                   <span v-else>—</span>
                </template>
                <span v-else>{{ row.snacktrack }}</span>
              </td>
              <td class="py-3.5 px-4 text-center text-muted-foreground text-sm">
                <template v-if="typeof row.competitorA === 'boolean'">
                   <svg v-if="row.competitorA" class="w-5 h-5 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                   <span v-else>—</span>
                </template>
                <span v-else>{{ row.competitorA }}</span>
              </td>
              <td class="py-3.5 px-4 text-center text-muted-foreground text-sm">
                <template v-if="typeof row.competitorB === 'boolean'">
                   <svg v-if="row.competitorB" class="w-5 h-5 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                   <span v-else>—</span>
                </template>
                <span v-else>{{ row.competitorB }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
