import { useEffect, useState } from "react";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import type { AdminComponents } from "../types/admin-components";
import { loadRemoteComponents, RemoteComponentsError } from "../lib/remote-components";

export type RemoteComponentsState =
  | { status: "idle"; components: undefined; error: undefined }
  | { status: "loading"; components: undefined; error: undefined }
  | { status: "ready"; components: AdminComponents; error: undefined }
  | { status: "error"; components: undefined; error: RemoteComponentsError | Error };

/**
 * The admin's own public API is what custom components import hooks from. It is loaded lazily, to avoid a
 * cycle with the entry point, and once: concurrent loads share one import.
 */
let adminApi: Promise<typeof import("../public/index")> | undefined;
const loadAdminApi = () => (adminApi ??= import("../public/index"));

const IDLE: RemoteComponentsState = { status: "idle", components: undefined, error: undefined };

/**
 * Loads a components bundle from `url` once per (url, integrity). Re-renders with a new URL load the new
 * bundle; leaving mid-load discards the stale result rather than applying it.
 */
export function useRemoteComponents(options: { url?: string; integrity?: string; allowInsecure?: boolean }): RemoteComponentsState {
  const { url, integrity, allowInsecure } = options;
  const [state, setState] = useState<RemoteComponentsState>(url ? { status: "loading", components: undefined, error: undefined } : IDLE);

  useEffect(() => {
    if (!url) {
      setState((previous) => (previous.status === "idle" ? previous : IDLE));
      return;
    }

    const controller = new AbortController();
    setState((previous) => (previous.status === "loading" ? previous : { status: "loading", components: undefined, error: undefined }));

    (async () => {
      const api = await loadAdminApi();
      // The url may have changed while the admin API was loading; do not start a download nobody wants.
      if (controller.signal.aborted) return;
      const components = await loadRemoteComponents({
        url,
        integrity,
        allowInsecure,
        signal: controller.signal,
        shared: {
          react: React,
          "react/jsx-runtime": jsxRuntime,
          "react/jsx-dev-runtime": jsxDevRuntime,
          "react-dom": ReactDOM,
          "react-dom/client": ReactDOMClient,
          "@dyrected/admin": api,
        },
      });
      if (!controller.signal.aborted) setState({ status: "ready", components, error: undefined });
    })().catch((error) => {
      if (controller.signal.aborted || error?.name === "AbortError") return;
      console.error("[dyrected] Could not load custom components:", error);
      setState({ status: "error", components: undefined, error });
    });

    return () => controller.abort();
  }, [url, integrity, allowInsecure]);

  return state;
}
