// @vitest-environment jsdom
import * as React from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { JoinField } from "./join-field"
import { afterEach } from "vitest"

const navigateSpy = vi.fn()
const useWatchSpy = vi.fn()
const paramsRef: { current: { id?: string } } = { current: { id: "post-1" } }
const dyrectedRef: {
  current: {
    schemas: {
      collections: Array<Record<string, unknown>>
      globals: Array<Record<string, unknown>>
    }
  }
} = {
  current: {
    schemas: {
      collections: [
        {
          slug: "comments",
          admin: { useAsTitle: "title" },
          labels: { singular: "Comment", plural: "Comments" },
        },
      ],
      globals: [],
    },
  },
}

vi.mock("react-hook-form", () => ({
  useWatch: (...args: unknown[]) => useWatchSpy(...args),
}))

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateSpy,
  useParams: () => paramsRef.current,
}))

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => dyrectedRef.current,
}))

afterEach(() => {
  cleanup()
})

describe("JoinField", () => {
  beforeEach(() => {
    navigateSpy.mockReset()
    useWatchSpy.mockReset()
    paramsRef.current = { id: "post-1" }
    dyrectedRef.current = {
      schemas: {
        collections: [
          {
            slug: "comments",
            admin: { useAsTitle: "title" },
            labels: { singular: "Comment", plural: "Comments" },
          },
        ],
        globals: [],
      },
    }
    useWatchSpy.mockReturnValue({
      docs: [
        { id: "comment-1", title: "First comment" },
      ],
    })
  })

  it("renders both action buttons by default", () => {
    render(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Create new Comment" })).toBeTruthy()
  })

  it("hides only the create button when configured", () => {
    render(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showCreateButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })

  it("hides only the view button when configured", () => {
    render(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showViewButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.getByRole("button", { name: "Create new Comment" })).toBeTruthy()
  })

  it("hides the action row when both buttons are disabled", () => {
    render(
      <JoinField
        schema={{
          name: "comments",
          collection: "comments",
          on: "post",
          admin: { showCreateButton: false, showViewButton: false },
        }}
        control={{}}
      />,
    )

    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })

  it("navigates to the filtered list page from View all", async () => {
    const user = userEvent.setup()

    render(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await user.click(screen.getByRole("button", { name: "View all" }))

    expect(navigateSpy).toHaveBeenCalledWith(
      "/collections/comments?where=%7B%22post%22%3A%7B%22equals%22%3A%22post-1%22%7D%7D",
    )
  })

  it("preserves the create-new prefill behavior", async () => {
    const user = userEvent.setup()

    render(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Create new Comment" }))

    expect(navigateSpy).toHaveBeenCalledWith("/collections/comments/new?post=post-1")
  })

  it("shows the save-first message before a document exists", () => {
    paramsRef.current = {}

    render(
      <JoinField
        schema={{ name: "comments", collection: "comments", on: "post" }}
        control={{}}
      />,
    )

    expect(screen.getByText("Save this document first to view related comments.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "View all" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Create new Comment" })).toBeNull()
  })
})
