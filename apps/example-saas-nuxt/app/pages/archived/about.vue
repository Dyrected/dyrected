<script setup>
useHead({
  title: 'About — SnackTrack Pro',
  meta: [{ name: 'description', content: 'The story of how two ex-consultants decided office snack chaos was a $47B problem worth solving.' }],
})

const timeline = [
  {
    year: '2019',
    title: 'The Incident',
    desc: 'Co-founders Marcus Webb and Priya Nair experience a career-defining snack outage during a critical all-hands meeting at a Fortune 100 client. The snack drawer is empty. The room turns hostile. The engagement is at risk.',
  },
  {
    year: '2020',
    title: 'Ideation During Lockdown',
    desc: 'Working from home, Marcus builds the first version of SnackTrack in a Google Sheet. Priya adds a macro that sends her an email when Doritos inventory drops below "critical." They realize they have something.',
  },
  {
    year: '2021',
    title: 'Seed Round & First Customers',
    desc: 'Raises $4.2M from Sequoia Snackpital and Andreessen Munchowitz. First enterprise customers include three Big Four consulting firms and one government agency that cannot be named.',
  },
  {
    year: '2022',
    title: 'CrunchGPT Launch',
    desc: 'Releases CrunchGPT v1.0, the world\'s first AI model trained exclusively on snack consumption telemetry. Achieves 94.7% forecast accuracy in beta. TechCrunch Munchies Edition calls it "the GPT-4 of pretzels."',
  },
  {
    year: '2023',
    title: 'Series A & Global Expansion',
    desc: 'Raises $28M Series A. Expands to EMEA and APAC. Opens offices in London, Singapore, and Austin (chosen for proximity to snack vendors). Achieves SOC 2 Type II certification.',
  },
  {
    year: '2024',
    title: '2,400 Customers & Growing',
    desc: 'Reaches 2,400 enterprise customers across 47 countries. Processes over 14 million snack inventory events per day. Launches the Snack Concierge program. Appears on Forbes Snack 30 Under 30.',
  },
]

const team = [
  {
    name: 'Marcus Webb',
    title: 'Chief Snack Officer',
    bio: 'Former McKinsey partner, 12 years in operational transformation. Experienced the 2019 Incident firsthand. Holds an MBA from Wharton and a Certificate in Advanced Pretzel Logistics from the Culinary Institute of America.',
    initials: 'MW',
  },
  {
    name: 'Priya Nair',
    title: 'President & Co-Founder',
    bio: 'Previously led supply chain innovation at Amazon Fresh and Google Cafeteria Operations. MIT CS graduate. Author of "Snack-Driven Development," a methodology now taught at 4 business schools.',
    initials: 'PN',
  },
  {
    name: 'Devon Ashcroft',
    title: 'VP of Crunch',
    bio: 'Leads all revenue operations and enterprise sales. Former VP Sales at Salesforce, Workday, and briefly a premium jerky startup. Known for closing a $2.4M deal in under 40 minutes during a live Doritos tasting.',
    initials: 'DA',
  },
  {
    name: 'Yuki Tanaka',
    title: 'Head of Flavor Intelligence',
    bio: 'Chief data scientist behind CrunchGPT. PhD in Computational Gastronomy from Stanford. Previously built recommendation engines for Netflix and Grubhub. Holds 7 patents related to snack pattern recognition.',
    initials: 'YT',
  },
]

const press = [
  {
    publication: 'TechCrunch Munchies Edition',
    quote: '"SnackTrack Pro has done for office snacks what Salesforce did for CRM — made it unnecessarily complex, enterprise-priced, and somehow indispensable."',
    date: 'March 2024',
  },
  {
    publication: 'Forbes Snack 30 Under 30',
    quote: '"Webb and Nair have identified a $47 billion market hiding in plain sight — or rather, hiding behind a vending machine."',
    date: 'January 2024',
  },
  {
    publication: 'Harvard Business Snack Review',
    quote: '"A masterclass in product-market fit. The founders did not build what they wanted — they built what 2,400 pantry managers desperately needed."',
    date: 'September 2023',
  },
  {
    publication: 'The Wall Street Morsel',
    quote: '"CrunchGPT has more data on office eating habits than any government or nutritionist in history. This should concern us and yet somehow doesn\'t."',
    date: 'November 2023',
  },
]
</script>

<template>
  <div>
    <!-- Hero / Mission -->
    <section class="relative overflow-hidden py-24 md:py-32">
      <div
        class="absolute inset-0 opacity-10"
        style="background-image: linear-gradient(#162b55 1px, transparent 1px), linear-gradient(to right, #162b55 1px, transparent 1px); background-size: 64px 64px;"
      />
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#f5c842]/5 rounded-full blur-3xl pointer-events-none" />

      <div class="relative max-w-4xl mx-auto px-6 text-center">
        <SectionLabel text="Our Mission" />
        <h1 class="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mt-4 mb-6">
          We believe no office should suffer an unexpected snack outage.
        </h1>
        <p class="text-lg text-slate-400 leading-relaxed">
          SnackTrack Pro was founded on the radical belief that snack management deserves the same rigor, tooling, and executive attention as any other mission-critical enterprise system. Because when the Doritos run out, so does morale.
        </p>
      </div>
    </section>

    <!-- Stats bar -->
    <section class="border-y border-[#162b55] bg-[#0a1628] py-10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div v-for="stat in [{ num: '2,400+', label: 'Enterprise Customers' }, { num: '47', label: 'Countries' }, { num: '14M+', label: 'Snack Events / Day' }, { num: '$47B', label: 'Addressable Snack Market' }]" :key="stat.label">
            <p class="text-3xl md:text-4xl font-black text-[#f5c842]">{{ stat.num }}</p>
            <p class="text-slate-400 text-sm mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Founding story timeline -->
    <section class="py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-14">
          <SectionLabel text="Our Story" />
          <h2 class="text-3xl md:text-4xl font-black text-white mt-2">From a crisis to a category.</h2>
        </div>

        <div class="relative">
          <!-- Vertical line -->
          <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-[#162b55] -translate-x-px md:translate-x-0" />

          <div
            v-for="(event, i) in timeline"
            :key="event.year"
            class="relative mb-10 pl-16 md:pl-0"
            :class="i % 2 === 0 ? 'md:pr-[calc(50%+2rem)] md:pl-0' : 'md:pl-[calc(50%+2rem)] md:pr-0'"
          >
            <!-- Dot -->
            <div class="absolute left-4 md:left-1/2 top-4 w-5 h-5 bg-[#f5c842] rounded-full border-4 border-[#050d1a] -translate-x-2 md:-translate-x-2.5 z-10" />

            <div class="bg-[#0a1628] border border-[#162b55] rounded-xl p-5 hover:border-[#f5c842]/20 transition-colors">
              <span class="text-[#f5c842] text-xs font-bold uppercase tracking-widest">{{ event.year }}</span>
              <h3 class="text-white font-bold mt-1 mb-2">{{ event.title }}</h3>
              <p class="text-slate-400 text-sm leading-relaxed">{{ event.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="py-20 px-6 bg-[#0a1628] border-t border-[#162b55]">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-14">
          <SectionLabel text="Leadership" />
          <h2 class="text-3xl md:text-4xl font-black text-white mt-2">The team behind the crunch.</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="member in team"
            :key="member.name"
            class="bg-[#0f2040] border border-[#162b55] rounded-xl p-6 hover:border-[#f5c842]/20 transition-colors"
          >
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-[#162b55] to-[#0a1628] border border-[#f5c842]/20 flex items-center justify-center mb-4">
              <span class="text-[#f5c842] font-black text-lg">{{ member.initials }}</span>
            </div>
            <h3 class="text-white font-bold mb-0.5">{{ member.name }}</h3>
            <p class="text-[#f5c842] text-xs font-semibold uppercase tracking-wide mb-3">{{ member.title }}</p>
            <p class="text-slate-400 text-xs leading-relaxed">{{ member.bio }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Press -->
    <section class="py-20 px-6 border-t border-[#162b55]">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-14">
          <SectionLabel text="Press" />
          <h2 class="text-3xl font-black text-white mt-2">As seen in.</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="item in press"
            :key="item.publication"
            class="bg-[#0a1628] border border-[#162b55] rounded-xl p-6 hover:border-[#f5c842]/20 transition-colors"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="text-[#f5c842] font-bold text-sm">{{ item.publication }}</span>
              <span class="text-slate-600 text-xs">{{ item.date }}</span>
            </div>
            <blockquote class="text-slate-300 text-sm leading-relaxed italic">{{ item.quote }}</blockquote>
          </div>
        </div>
      </div>
    </section>

    <!-- Careers CTA -->
    <section class="py-16 px-6 bg-[#0a1628] border-t border-[#162b55]">
      <div class="max-w-3xl mx-auto text-center">
        <SectionLabel text="Careers" />
        <h2 class="text-3xl font-black text-white mt-4 mb-4">Come work on problems that matter.</h2>
        <p class="text-slate-400 mb-8">
          We're a team of engineers, data scientists, and former consultants who believe snack infrastructure is an unsolved problem at civilization scale. We offer competitive salaries, equity, and unlimited snacks (obviously).
        </p>
        <div class="flex flex-wrap gap-3 justify-center mb-6">
          <span v-for="role in ['Senior ML Engineer', 'Snack Data Analyst', 'Enterprise AE', 'VP of Drawer Operations', 'Head of Snack UX']" :key="role" class="border border-[#162b55] text-slate-300 text-xs px-4 py-2 rounded-full hover:border-[#f5c842]/30 transition-colors">
            {{ role }}
          </span>
        </div>
        <NuxtLink to="/contact" class="inline-block px-7 py-3.5 bg-[#f5c842] text-[#050d1a] font-black rounded hover:bg-[#e6b800] transition-colors text-sm">
          View Open Positions
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
