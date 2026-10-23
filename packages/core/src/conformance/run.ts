import { assert, ConformanceFailure } from "./assert.js";
import { conformanceCases } from "./cases.js";
import type { ConformanceCase, ConformanceHarness } from "./types.js";

export interface ConformanceResult {
  id: string;
  title: string;
  ok: boolean;
  error?: string;
}

/**
 * Runs the suite (or a subset) against one runtime and reports each case. Test runners can instead iterate
 * {@link conformanceCases} and call `run` directly to get one test per case.
 */
export async function runConformance(
  harness: ConformanceHarness,
  cases: ConformanceCase[] = conformanceCases,
): Promise<ConformanceResult[]> {
  const results: ConformanceResult[] = [];
  for (const testCase of cases) {
    try {
      await testCase.run(harness, assert);
      results.push({ id: testCase.id, title: testCase.title, ok: true });
    } catch (error) {
      results.push({
        id: testCase.id,
        title: testCase.title,
        ok: false,
        error: error instanceof ConformanceFailure || error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
