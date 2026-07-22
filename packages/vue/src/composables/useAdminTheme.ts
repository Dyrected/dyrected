import { computed, inject, onScopeDispose, provide, shallowRef, type InjectionKey } from "vue";
import {
  adminThemeClassName,
  type AdminThemeHookResult,
  createAdminThemeController,
  getSystemAdminTheme,
  type AdminThemeController,
  type AdminThemeControllerOptions,
  type AdminThemePreference,
} from "@dyrected/admin/public";
import type { VueStateify } from "./useAdminSchemas";

export interface ProvideAdminThemeOptions extends AdminThemeControllerOptions {
  /** Use an existing theme controller instead of creating one. */
  controller?: AdminThemeController;
}

export const ADMIN_THEME_CONTROLLER_KEY: InjectionKey<AdminThemeController> = Symbol("admin-theme-controller");

function subscribeToSystemAdminTheme(onChange: (theme: "light" | "dark") => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystemTheme = () => {
    onChange(media.matches ? "dark" : "light");
  };

  syncSystemTheme();
  media.addEventListener("change", syncSystemTheme);
  return () => media.removeEventListener("change", syncSystemTheme);
}

/**
 * Creates or provides an admin theme controller to the current Vue subtree.
 *
 * This is the recommended entry point when you want theme state to be shared by
 * a custom Vue admin surface.
 */
export function provideAdminTheme(options: ProvideAdminThemeOptions = {}) {
  const controller =
    options.controller ??
    createAdminThemeController({
      theme: options.theme,
      systemTheme: options.systemTheme ?? getSystemAdminTheme(),
      onThemeChange: options.onThemeChange,
    });

  provide(ADMIN_THEME_CONTROLLER_KEY, controller);

  const unsubscribeSystemTheme = subscribeToSystemAdminTheme((systemTheme) => {
    controller.setSystemTheme(systemTheme);
  });

  onScopeDispose(() => {
    unsubscribeSystemTheme();
  });

  return controller;
}

/**
 * Vue composable for reading and mutating Dyrected admin theme state.
 *
 * When no provider is present, it falls back to a local system-theme-derived
 * read-only state so components can still render consistently.
 */
export function useAdminTheme(): VueStateify<AdminThemeHookResult> {
  const controller = inject(ADMIN_THEME_CONTROLLER_KEY, null);

  if (!controller) {
    const resolvedTheme = getSystemAdminTheme();
    return {
      theme: computed(() => "system" as AdminThemePreference),
      systemTheme: computed(() => resolvedTheme),
      resolvedTheme: computed(() => resolvedTheme),
      themeClassName: computed(() => adminThemeClassName(resolvedTheme)),
      setTheme: (_theme: AdminThemePreference) => undefined,
      controller: shallowRef<AdminThemeController | null>(null),
    };
  }

  const state = shallowRef(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    state.value = controller.getState();
  });

  onScopeDispose(() => {
    unsubscribe();
  });

  return {
    theme: computed(() => state.value.theme),
    systemTheme: computed(() => state.value.systemTheme),
    resolvedTheme: computed(() => state.value.resolvedTheme),
    themeClassName: computed(() => state.value.themeClassName),
    setTheme: controller.setTheme,
    controller: shallowRef(controller),
  };
}
