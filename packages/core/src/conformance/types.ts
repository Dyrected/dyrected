import type { DatabaseAdapter, DyrectedConfig } from "../types/index.js";

/**
 * The conformance suite.
 *
 * Dyrected promises that a config behaves the same wherever it runs: in-process in a self-hosted app, or
 * inside a hosting platform's isolates. The suite makes that promise testable. Each case describes a config
 * (written with plain functions) and a scripted conversation with the HTTP API, and asserts what the API and
 * the database end up looking like. A runtime passes by producing the same observable results as the
 * in-process reference.
 *
 * To plug a runtime in, implement {@link ConformanceHarness}: build an app for a config the way that runtime
 * would run it (for example: extract the functions, bundle them, and route calls through an isolate).
 */

/** What a case sees of a running app. */
export interface ConformanceApp {
  /** Sends a request to the app, exactly like `app.request`. Paths start with `/api`. */
  request(path: string, init?: RequestInit): Promise<Response>;
  /**
   * The database behind the app, for assertions on persisted state. Cases never write through it, so it
   * shows only what the app itself did.
   */
  db: DatabaseAdapter;
}

export interface ConformanceHarness {
  /** Builds an app for `config` under the runtime being tested. `config.db` is supplied by the harness. */
  start(config: Omit<DyrectedConfig, "db">): Promise<ConformanceApp>;
}

/** Minimal assertions so the suite runs under any test runner and in any repo. */
export interface ConformanceAssert {
  equal(actual: unknown, expected: unknown, message?: string): void;
  deepEqual(actual: unknown, expected: unknown, message?: string): void;
  ok(value: unknown, message?: string): void;
}

export interface ConformanceCase {
  /** Stable identifier, for example `hooks.beforeChange.order`. */
  id: string;
  title: string;
  /** The behavior being pinned, in a sentence a reader can check against the docs. */
  contract: string;
  run(harness: ConformanceHarness, assert: ConformanceAssert): Promise<void>;
}
