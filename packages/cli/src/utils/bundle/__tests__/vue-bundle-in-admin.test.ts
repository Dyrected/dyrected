// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as ReactDOM from "react-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as adminPublic from "@dyrected/admin/public";
import path from "node:path";
import { pathToFileURL } from "node:url";
const SHARED_MODULES_GLOBAL = "__DYRECTED_SHARED__";

/**
 * Runs a bundle built by `dyrected bundle` the way the Cloud admin does: the bundle's React is the admin's React
 * (passed through `__DYRECTED_SHARED__`), and each Vue component is mounted by the Vue-to-React bridge into a real
 * React tree, inside the admin's own component error boundary. jsdom stands in for the browser.
 */

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.head.querySelectorAll("style[data-dyrected-component]").forEach((node) => node.remove());
});

/** The bundle `test-setup/build-vue-fixtures.ts` built with the real CLI, loaded against this React and the admin's API. */
async function loadBundle() {
  (globalThis as Record<string, unknown>)[SHARED_MODULES_GLOBAL] = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "react/jsx-dev-runtime": jsxDevRuntime,
    "react-dom": ReactDOM,
    "@dyrected/admin": adminPublic,
  };
  const file = path.resolve(import.meta.dirname, "../../../../test-tmp/vue-e2e/components.mjs");
  return import(/* @vite-ignore */ `${pathToFileURL(file).href}?t=${Math.random()}`);
}

function mount(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(element));
  return container;
}

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

describe("a Vue field built by dyrected bundle, running in the admin's React tree", () => {
  it("receives value, onChange and disabled as props, exactly as the docs show", async () => {
    const mod = await loadBundle();
    const Picker = mod.default.fields["brand-color-picker"];
    const onChange = vi.fn();

    const el = mount(React.createElement(Picker, { value: "#ff0000", onChange, disabled: false }));
    await settle();

    const input = el.querySelector("input[type=color]") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("#ff0000");
    expect(input.disabled).toBe(false);

    input.value = "#00ff00";
    await act(async () => { input.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(onChange).toHaveBeenCalledWith("#00ff00");
  });

  it("falls back to the default colour with no value, honours disabled, and follows prop updates", async () => {
    const mod = await loadBundle();
    const Picker = mod.default.fields["brand-color-picker"];
    const onChange = vi.fn();

    const el = mount(React.createElement(Picker, { onChange, disabled: true }));
    await settle();
    const input = el.querySelector("input[type=color]") as HTMLInputElement;
    expect(input.value).toBe("#6366f1");
    expect(input.disabled).toBe(true);

    act(() => root!.render(React.createElement(Picker, { value: "#123456", onChange, disabled: false })));
    await settle();
    expect((el.querySelector("input[type=color]") as HTMLInputElement).value).toBe("#123456");
    expect((el.querySelector("input[type=color]") as HTMLInputElement).disabled).toBe(false);
  });

  it("applies the component's scoped styles to the page", async () => {
    const mod = await loadBundle();
    mount(React.createElement(mod.default.fields.styled, {}));
    await settle();
    const styles = Array.from(document.head.querySelectorAll("style[data-dyrected-component]")).map((s) => s.textContent).join("");
    expect(styles).toContain("rebeccapurple");
    expect(document.body.querySelector("p.pill")?.getAttributeNames().some((n) => n.startsWith("data-v-"))).toBe(true);
  });
});

describe("a Vue component that fails", () => {
  const ErrorBoundary = adminPublic.AdminComponentErrorBoundary;

  it("shows the admin's error card with the component key and the real message, not a blank admin", async () => {
    const mod = await loadBundle();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const el = mount(
      React.createElement(
        "div",
        null,
        React.createElement(ErrorBoundary, { componentKey: "crashy", slot: "field" } as any, React.createElement(mod.default.fields.crashy, {})),
        React.createElement(ErrorBoundary, { componentKey: "fine", slot: "field" } as any, React.createElement(mod.default.fields.fine, {})),
      ),
    );
    await settle();

    const alert = el.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain("crashy");
    expect(alert!.textContent).toContain("crashed in field");
    expect(alert!.textContent).toContain("scanner exploded");
    expect(alert!.textContent).toContain("Retry");
    // The other component is unaffected.
    expect(el.textContent).toContain("still here");
    consoleError.mockRestore();
  });

  it("catches an error thrown later, during a click, instead of leaving a half-working island", async () => {
    const mod = await loadBundle();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const el = mount(React.createElement(ErrorBoundary, { componentKey: "late", slot: "field" } as any, React.createElement(mod.default.fields.late, {})));
    await settle();

    await act(async () => { (el.querySelector("button") as HTMLButtonElement).click(); });
    await settle();

    // Vue routes event-handler errors to the island's error hook, which the bridge forwards to the admin's boundary.
    const alert = el.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain("late failure");
    consoleError.mockRestore();
  });
});
