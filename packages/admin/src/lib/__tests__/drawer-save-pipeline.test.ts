import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  saveDrawerDocument,
  updateDrawerField,
  deleteDrawerDocument,
  invalidateParentAndJoinQueries,
} from "../drawer-save-pipeline"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("drawer-save-pipeline", () => {
  let mockClient: any
  let mockQueryClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockClient = {
      collection: vi.fn().mockReturnValue({
        create: vi.fn().mockImplementation(async (data: any) => ({ id: "child-123", ...data })),
        update: vi.fn().mockImplementation(async (id: string, data: any) => ({ id, ...data })),
        delete: vi.fn().mockResolvedValue(true),
        changePassword: vi.fn().mockResolvedValue(true),
      }),
    }

    mockQueryClient = {
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe("saveDrawerDocument", () => {
    it("creates a new document with relation onField attached and invalidates parent queries", async () => {
      const context = {
        client: mockClient,
        queryClient: mockQueryClient,
        targetCollection: "tasks",
        parentCollection: "projects",
        parentDocId: "proj-1",
        parentFieldName: "tasks",
        onField: "project",
        singularLabel: "Task",
      }

      const result = await saveDrawerDocument(
        context,
        { title: "New Task", status: "todo" },
        { isCreating: true },
      )

      expect(mockClient.collection).toHaveBeenCalledWith("tasks")
      expect(mockClient.collection("tasks").create).toHaveBeenCalledWith({
        title: "New Task",
        status: "todo",
        project: "proj-1",
      })

      expect(result.doc).toEqual({
        id: "child-123",
        title: "New Task",
        status: "todo",
        project: "proj-1",
      })
      expect(result.passwordChanged).toBe(false)

      // Seeds child document cache
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["collections", "tasks", "entry", "child-123"],
        expect.objectContaining({ id: "child-123", title: "New Task" }),
      )
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["collections", "tasks", "detail", "child-123"],
        expect.any(Function),
      )
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["collection", "tasks", "detail", "child-123"],
        expect.any(Function),
      )

      // Invalidates target collection queries
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "tasks"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "tasks"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["operational-view", "tasks"],
      })

      // Invalidates parent collection & document queries
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "projects", "detail", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "projects", "entry", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "projects", "detail", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "projects"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "projects"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["operational-view", "projects"],
      })

      // Invalidates relation join queries
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "tasks", "join", "project", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["join", "tasks", "project", "proj-1"],
      })

      expect(toast.success).toHaveBeenCalledWith("Task created successfully", {
        description: "Task has been saved.",
      })
    })

    it("updates an existing document, strips password fields, dispatches changePassword if present", async () => {
      const context = {
        client: mockClient,
        queryClient: mockQueryClient,
        targetCollection: "users",
        parentCollection: "organizations",
        parentDocId: "org-1",
        onField: "org",
        singularLabel: "User",
      }

      const result = await saveDrawerDocument(
        context,
        {
          name: "Alice",
          email: "alice@example.com",
          oldPassword: "old-secret-123",
          newPassword: "new-secret-456",
          confirmPassword: "new-secret-456",
        },
        { isCreating: false, activeDocId: "user-99" },
      )

      // Update call excludes password fields
      expect(mockClient.collection("users").update).toHaveBeenCalledWith("user-99", {
        name: "Alice",
        email: "alice@example.com",
      })

      // Change password call dispatched separately
      expect(mockClient.collection("users").changePassword).toHaveBeenCalledWith("user-99", {
        oldPassword: "old-secret-123",
        newPassword: "new-secret-456",
        confirmPassword: "new-secret-456",
      })

      expect(result.passwordChanged).toBe(true)

      // Both toasts called
      expect(toast.success).toHaveBeenCalledWith("User updated successfully", {
        description: "User has been saved.",
      })
      expect(toast.success).toHaveBeenCalledWith("Password changed successfully")

      // Parent queries invalidated
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "organizations", "detail", "org-1"],
      })
    })

    it("surfaces errors with toast.error and throws", async () => {
      mockClient.collection().update.mockRejectedValueOnce(new Error("Validation failed: Title is required"))

      const context = {
        client: mockClient,
        queryClient: mockQueryClient,
        targetCollection: "tasks",
        singularLabel: "Task",
      }

      await expect(
        saveDrawerDocument(context, { title: "" }, { isCreating: false, activeDocId: "task-1" }),
      ).rejects.toThrow("Validation failed: Title is required")

      expect(toast.error).toHaveBeenCalledWith("Failed to save Task", {
        description: "Validation failed: Title is required",
      })
    })
  })

  describe("updateDrawerField", () => {
    it("updates inline field, seeds cache, and invalidates parent queries", async () => {
      const context = {
        client: mockClient,
        queryClient: mockQueryClient,
        targetCollection: "tasks",
        parentCollection: "projects",
        parentDocId: "proj-1",
        onField: "project",
        singularLabel: "Task",
      }

      const updated = await updateDrawerField(context, "task-5", "status", "done")

      expect(mockClient.collection("tasks").update).toHaveBeenCalledWith("task-5", {
        status: "done",
      })
      expect(updated).toEqual({ id: "task-5", status: "done" })

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["collections", "tasks", "entry", "task-5"],
        { id: "task-5", status: "done" },
      )

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "projects", "detail", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "tasks", "join", "project", "proj-1"],
      })
    })
  })

  describe("deleteDrawerDocument", () => {
    it("deletes child doc, removes cache, and invalidates parent queries", async () => {
      const context = {
        client: mockClient,
        queryClient: mockQueryClient,
        targetCollection: "tasks",
        parentCollection: "projects",
        parentDocId: "proj-1",
        onField: "project",
        singularLabel: "Task",
      }

      await deleteDrawerDocument(context, "task-5")

      expect(mockClient.collection("tasks").delete).toHaveBeenCalledWith("task-5")

      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "tasks", "entry", "task-5"],
      })
      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "tasks", "detail", "task-5"],
      })
      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "tasks", "detail", "task-5"],
      })

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "projects", "detail", "proj-1"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "tasks", "join", "project", "proj-1"],
      })

      expect(toast.success).toHaveBeenCalledWith("Task deleted", {
        description: "Task has been removed.",
      })
    })
  })

  describe("invalidateParentAndJoinQueries", () => {
    it("invalidates all target join keys and parent keys gracefully when partially provided", async () => {
      await invalidateParentAndJoinQueries({
        queryClient: mockQueryClient,
        targetCollection: "comments",
        parentCollection: "posts",
        parentDocId: "post-10",
        onField: "post",
      })

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "comments", "join", "post", "post-10"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["join", "comments", "post", "post-10"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "comments", "join"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["join", "comments"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "posts", "detail", "post-10"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "posts", "entry", "post-10"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "posts", "detail", "post-10"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collections", "posts"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["collection", "posts"],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["operational-view", "posts"],
      })
    })
  })
})
