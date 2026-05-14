<template>
  <footer class="border-t border-[#162b55] bg-[#0a1628] mt-auto">
    <div class="max-w-7xl mx-auto px-6 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div class="md:col-span-1">
          <NuxtLink to="/" class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-[#f5c842] rounded flex items-center justify-center">
              <span class="text-[#050d1a] font-black text-xs">ST</span>
            </div>
            <span class="font-bold text-white">SnackTrack <span class="text-[#f5c842]">Pro</span></span>
          </NuxtLink>
          <p class="text-slate-400 text-sm leading-relaxed">
            Enterprise-grade AI-powered office snack inventory management. SOC 2 Type II certified.
          </p>
        </div>

        <div>
          <h4 class="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Product</h4>
          <ul class="space-y-2.5">
            <li><NuxtLink to="/features" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Features</NuxtLink></li>
            <li><NuxtLink to="/pricing" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Pricing</NuxtLink></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Changelog</a></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Roadmap</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
          <ul class="space-y-2.5">
            <li><NuxtLink to="/about" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">About</NuxtLink></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Blog</a></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Careers</a></li>
            <li><NuxtLink to="/contact" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Contact</NuxtLink></li>
          </ul>
        </div>

        <div>
          <h4 class="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
          <ul class="space-y-2.5">
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Privacy Policy</a></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Terms of Service</a></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Snack Data Policy</a></li>
            <li><a href="#" class="text-slate-400 text-sm hover:text-[#f5c842] transition-colors">Cookie Preferences</a></li>
          </ul>
        </div>
      </div>

      <div class="mt-10 pt-8 border-t border-[#162b55] flex flex-col md:flex-row items-center justify-between gap-4">
        <p class="text-slate-500 text-sm">© 2026 SnackTrack Pro, Inc. All snacks reserved.</p>
        <p class="text-slate-600 text-xs">SOC 2 Type II &bull; GDPR Compliant &bull; ISO 9001 Snack Certified</p>
      </div>
    </div>
  </footer>
</template>
