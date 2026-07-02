<script setup lang="ts">
interface TeamMember {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

defineProps<{
  heading?: string;
  members: TeamMember[];
}>();
</script>

<template>
  <section class="py-20 px-6 bg-card border-t border-border">
    <div class="max-w-7xl mx-auto">
      <div v-if="heading" class="text-center mb-14">
        <SectionLabel text="Leadership" />
        <h2 class="text-3xl md:text-4xl font-black text-foreground mt-2">{{ heading }}</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="member in members"
          :key="member.name"
          class="bg-muted border border-border rounded-xl p-6 hover:border-intelligence/20 transition-colors"
        >
          <div class="w-16 h-16 rounded-xl bg-linear-to-br from-muted to-card border border-intelligence/20 flex items-center justify-center mb-4">
            <span class="text-intelligence font-black text-lg">{{ member.initials }}</span>
          </div>
          <h3 class="text-foreground font-bold mb-0.5">{{ member.name }}</h3>
          <p class="text-intelligence text-xs font-semibold uppercase tracking-wide mb-3">{{ member.role }}</p>
          <p class="text-muted-foreground text-xs leading-relaxed">{{ member.bio }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
