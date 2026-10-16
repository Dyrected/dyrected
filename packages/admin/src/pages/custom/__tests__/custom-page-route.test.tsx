import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CustomPageRoute } from "../custom-page-route";
import { DyrectedContext } from "../../../providers/dyrected-context";
import type { CompiledNavTree } from "@dyrected/sdk";

describe("CustomPageRoute Component", () => {
  afterEach(() => {
    cleanup();
  });

  const mockNavTree: CompiledNavTree = {
    groups: [
      {
        id: "group:ops",
        name: "Operations",
        slug: "operations",
        order: 1,
        items: [
          {
            id: "page:arrivals",
            type: "page",
            slug: "arrivals",
            label: "Today's Arrivals",
            order: 1,
            views: [],
            page: {
              slug: "arrivals",
              label: "Today's Arrivals",
              component: "arrivals-board",
              layout: "contained",
              chrome: true,
              options: { liveInterval: 5000 },
            },
          },
          {
            id: "page:kiosk",
            type: "page",
            slug: "kiosk",
            label: "Check-in Kiosk",
            order: 2,
            views: [],
            page: {
              slug: "kiosk",
              label: "Check-in Kiosk",
              component: "kiosk-screen",
              layout: "full",
              chrome: false,
            },
          },
        ],
      },
    ],
    ungrouped: [],
  };

  const ArrivalsBoard = ({ slug }: { slug: string }) => (
    <div data-testid="arrivals-component">Arrivals Board for {slug}</div>
  );

  const KioskScreen = ({ slug }: { slug: string }) => (
    <div data-testid="kiosk-component">Kiosk Screen for {slug}</div>
  );

  const mockContextValue: any = {
    navigation: mockNavTree,
    schemas: { collections: [], globals: [] },
    components: {
      pages: {
        "arrivals-board": ArrivalsBoard,
        "kiosk-screen": KioskScreen,
      },
    },
  };

  it("renders page header, breadcrumbs, and resolved custom component", () => {
    render(
      <DyrectedContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={["/pages/arrivals"]}>
          <Routes>
            <Route path="/pages/:slug/*" element={<CustomPageRoute />} />
            <Route path="/pages/:slug" element={<CustomPageRoute />} />
          </Routes>
        </MemoryRouter>
      </DyrectedContext.Provider>
    );

    expect(screen.getAllByText("Today's Arrivals").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("arrivals-component")).toBeDefined();
    expect(screen.getByText("Arrivals Board for arrivals")).toBeDefined();
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("honors chrome: false and layout: full for kiosk pages", () => {
    render(
      <DyrectedContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={["/pages/kiosk"]}>
          <Routes>
            <Route path="/pages/:slug/*" element={<CustomPageRoute />} />
            <Route path="/pages/:slug" element={<CustomPageRoute />} />
          </Routes>
        </MemoryRouter>
      </DyrectedContext.Provider>
    );

    expect(screen.getByTestId("kiosk-component")).toBeDefined();
    // Chrome (breadcrumbs / page header) should not be rendered
    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("renders AdminNotFound when page slug is not found", () => {
    render(
      <DyrectedContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={["/pages/non-existent"]}>
          <Routes>
            <Route path="/pages/:slug/*" element={<CustomPageRoute />} />
            <Route path="/pages/:slug" element={<CustomPageRoute />} />
          </Routes>
        </MemoryRouter>
      </DyrectedContext.Provider>
    );

    expect(screen.getByText("Page not found")).toBeDefined();
  });
});

