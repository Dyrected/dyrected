import { describe, it, expect } from "vitest";
import { groupDocuments } from "../group-documents";

describe("groupDocuments", () => {
  it("keeps declared select options, even when empty, in authored order", () => {
    const collection = { fields: [{ name: "status", type: "select", options: ["new", { label: "Done", value: "done" }] }] };
    const result = groupDocuments([{ id: "1", status: "done" }], "status", collection);
    expect(result.groups.map((g) => [g.key, g.label, g.docs.length])).toEqual([
      ["new", "new", 0],
      ["done", "Done", 1],
    ]);
  });

  it("collects empty values into ungrouped", () => {
    const result = groupDocuments([{ id: "1" }, { id: "2", table: "" }, { id: "3", table: 4 }], "table");
    expect(result.ungrouped.map((d) => d.id)).toEqual(["1", "2"]);
    expect(result.groups).toEqual([{ key: "4", label: "4", docs: [{ id: "3", table: 4 }] }]);
  });

  it("labels populated relationships and places array values in every group", () => {
    const docs = [
      { id: "a", host: { id: "h1", name: "Ada" } },
      { id: "b", tags: ["x", "y"] },
    ];
    expect(groupDocuments(docs, "host").groups[0]).toMatchObject({ key: "h1", label: "Ada" });
    expect(groupDocuments(docs, "tags").groups.map((g) => g.key)).toEqual(["x", "y"]);
  });
});
