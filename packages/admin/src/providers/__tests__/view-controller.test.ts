import { describe, expect, it, vi } from "vitest"
import {
  createViewController,
  type CollectionViewState,
  type ViewControllerHandlers,
  type ViewDataSlice,
} from "../view-controller"

const handlers = (): ViewControllerHandlers => ({
  refetch: vi.fn().mockResolvedValue(undefined),
  setPage: vi.fn(),
  setSort: vi.fn(),
  setSearch: vi.fn(),
  setFilters: vi.fn(),
  setSelection: vi.fn(),
  updateDocument: vi.fn(),
  open: vi.fn(),
  runAction: vi.fn().mockResolvedValue(true),
})

const base: CollectionViewState = {
  collection: { slug: "guests" },
  viewSlug: "all",
  config: {},
  documents: [],
  total: 0,
  isLoading: true,
  isFetching: false,
  isTruncated: false,
  pagination: { page: 1, pageSize: 0, totalPages: 1 },
  search: "",
  where: undefined,
  selectedIds: [],
  permissions: { canCreate: true, canUpdate: true, canDelete: true },
  urls: { collection: "/collections/guests", create: "/collections/guests/new" },
  actions: [],
  runningActions: [],
}

const slice = (overrides: Partial<ViewDataSlice> = {}): ViewDataSlice => ({
  documents: [{ id: "1", name: "Ada" }],
  total: 1,
  isLoading: false,
  isFetching: false,
  isTruncated: false,
  pagination: { page: 1, pageSize: 20, totalPages: 1 },
  ...overrides,
})

describe("view controller", () => {
  it("returns the host snapshot itself until a layout publishes data", () => {
    const controller = createViewController(base, handlers())
    expect(controller.getState()).toBe(base)
  })

  it("merges the data a layout publishes and keeps the snapshot stable between reads", () => {
    const controller = createViewController(base, handlers())
    const owner = Symbol("layout")
    controller.setData(owner, slice())

    const first = controller.getState()
    expect(first.documents).toHaveLength(1)
    expect(first.isLoading).toBe(false)
    expect(first.permissions).toBe(base.permissions)
    expect(controller.getState()).toBe(first)
  })

  it("does not notify when a layout republishes an equal slice", () => {
    const controller = createViewController(base, handlers())
    const owner = Symbol("layout")
    const listener = vi.fn()
    controller.subscribe(listener)

    controller.setData(owner, slice({ documents: [] }))
    controller.setData(owner, slice({ documents: [] }))
    controller.setData(owner, slice({ documents: [], pagination: { page: 1, pageSize: 20, totalPages: 1 } }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("only lets the current data owner clear the data", () => {
    const controller = createViewController(base, handlers())
    const first = Symbol("first")
    const second = Symbol("second")

    controller.setData(first, slice())
    controller.setData(second, slice({ documents: [{ id: "2" }] }))
    controller.clearData(first)
    expect(controller.getState().documents).toEqual([{ id: "2" }])

    controller.clearData(second)
    expect(controller.getState()).toBe(base)
  })

  it("shows a patch on the document until it is released", () => {
    const controller = createViewController(base, handlers())
    controller.setData(Symbol("layout"), slice())

    const release = controller.addPatch("1", { name: "Grace" })
    expect(controller.getState().documents[0].name).toBe("Grace")

    release()
    expect(controller.getState().documents[0].name).toBe("Ada")
  })

  it("routes data handlers to the layout that owns the data and falls back to the host's", () => {
    const host = handlers()
    const controller = createViewController(base, host)
    const setSort = vi.fn()

    controller.handlers.setPage(2)
    expect(host.setPage).toHaveBeenCalledWith(2)

    controller.setData(Symbol("layout"), slice(), { setSort })
    controller.handlers.setSort({ field: "name", direction: "asc" })
    expect(setSort).toHaveBeenCalledWith({ field: "name", direction: "asc" })
    expect(host.setSort).not.toHaveBeenCalled()
  })
})
