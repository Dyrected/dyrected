<template>
  <div class="min-h-screen flex flex-col bg-background">
    <AppNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
