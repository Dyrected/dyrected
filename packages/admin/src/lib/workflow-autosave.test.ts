import { describe, expect, it } from "vitest"
import {
  classifyWorkflowAutosaveError,
  DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
  isWorkflowEnabledCollection,
  resolveWorkflowAutosaveSettings,
} from "./workflow-autosave"

describe("workflow autosave helpers", () => {
  it("defaults autosave on for workflow-enabled collections", () => {
    expect(resolveWorkflowAutosaveSettings({
      drafts: true,
      admin: {},
    })).toEqual({
      enabled: true,
      delayMs: DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
    })

    expect(resolveWorkflowAutosaveSettings({
      workflow: {
        initialState: "draft",
      },
      admin: {},
    })).toEqual({
      enabled: true,
      delayMs: DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
    })
  })

  it("honors an explicit collection-level autosave disable", () => {
    expect(resolveWorkflowAutosaveSettings({
      workflow: {},
      admin: {
        autosave: false,
        autosaveDelayMs: 3200,
      },
    })).toEqual({
      enabled: false,
      delayMs: 3200,
    })
  })

  it("keeps autosave off for non-workflow collections", () => {
    expect(isWorkflowEnabledCollection({ admin: {} })).toBe(false)
    expect(resolveWorkflowAutosaveSettings({
      admin: {
        autosaveDelayMs: 900,
      },
    })).toEqual({
      enabled: false,
      delayMs: DEFAULT_WORKFLOW_AUTOSAVE_DELAY_MS,
    })
  })

  it("maps revision conflicts to a dedicated autosave state", () => {
    expect(classifyWorkflowAutosaveError({ statusCode: 409 })).toBe("conflict")
    expect(classifyWorkflowAutosaveError(new Error("boom"))).toBe("error")
  })
})
