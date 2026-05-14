<template>
  <div class="min-h-screen flex flex-col bg-[#050d1a]">
    <AppNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
