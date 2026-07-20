import { describe, expect, it } from "vitest"
import type { WorkflowConfig, WorkflowMetadata } from "@dyrected/core"
import {
  getAvailableWorkflowTransitions,
  getCommonWorkflowTransitions,
  getPrimaryWorkflowTransition,
  groupWorkflowTransitions,
  resolvePublishingStatus,
} from "./workflow-ui"

const workflowConfig: WorkflowConfig = {
  initialState: "draft",
  states: [
    { name: "draft", label: "Draft", color: "warning" },
    { name: "review", label: "In review", color: "info" },
    { name: "published", label: "Published", color: "success", published: true },
  ],
  transitions: [
    { name: "submit", label: "Send to review", from: "draft", to: "review" },
    { name: "publish", label: "Go live now", from: "review", to: "published" },
    { name: "retract", label: "Pull from site", from: "published", to: "draft", unpublish: true },
  ],
}

describe("workflow-ui helpers", () => {
  it("keeps transition labels exactly as configured when resolving available transitions", () => {
    const workflowMeta: WorkflowMetadata = {
      state: "review",
      revision: 3,
      availableTransitions: ["publish"],
    }

    const transitions = getAvailableWorkflowTransitions(workflowConfig, workflowMeta)

    expect(transitions).toHaveLength(1)
    expect(transitions[0]?.label).toBe("Go live now")
  })

  it("prefers the first non-unpublish transition for the primary action", () => {
    const primary = getPrimaryWorkflowTransition([
      workflowConfig.transitions[2]!,
      workflowConfig.transitions[1]!,
    ])

    expect(primary?.name).toBe("publish")
  })

  it("falls back to the first available transition when all options unpublish", () => {
    const primary = getPrimaryWorkflowTransition([
      workflowConfig.transitions[2]!,
    ])

    expect(primary?.name).toBe("retract")
  })

  it("groups unpublish actions after normal transitions without changing labels", () => {
    const grouped = groupWorkflowTransitions([
      workflowConfig.transitions[0]!,
      workflowConfig.transitions[2]!,
      workflowConfig.transitions[1]!,
    ])

    expect(grouped.normal.map((transition) => transition.label)).toEqual([
      "Send to review",
      "Go live now",
    ])
    expect(grouped.unpublish.map((transition) => transition.label)).toEqual([
      "Pull from site",
    ])
  })

  it("returns only transitions shared by every selected workflow document", () => {
    const shared = getCommonWorkflowTransitions(workflowConfig, [
      {
        id: "1",
        _workflow: { state: "review", revision: 2, availableTransitions: ["publish", "retract"] },
      },
      {
        id: "2",
        _workflow: { state: "review", revision: 4, availableTransitions: ["publish"] },
      },
    ])

    expect(shared.map((transition) => transition.name)).toEqual(["publish"])
  })

  it("derives published, draft, and changed publishing badges", () => {
    const schema = { slug: "posts", workflow: workflowConfig, fields: [] }

    expect(resolvePublishingStatus(schema, {
      _workflow: { state: "published", revision: 1 },
      status: "draft",
    })).toMatchObject({ label: "Published" })

    expect(resolvePublishingStatus(schema, {
      _workflow: { state: "review", revision: 2, publishedRevision: 1 },
      status: "draft",
    })).toMatchObject({
      label: "Changed",
      workflowStateLabel: "In review",
    })

    expect(resolvePublishingStatus({ slug: "posts", drafts: true, fields: [] }, {
      status: "draft",
    })).toMatchObject({ label: "Draft" })
  })
})
