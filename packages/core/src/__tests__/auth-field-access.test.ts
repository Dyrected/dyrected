import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../utils/config.js";
import { applyFieldWriteAccess } from "../utils/access-control.js";

function setup() {
  const config = normalizeConfig({
    collections: [
      {
        slug: "staff",
        auth: true,
        fields: [
          { name: "role", type: "select", options: ["admin", "editor", "viewer"] },
          { name: "status", type: "select", options: ["active", "pending"] },
        ],
      },
    ],
    globals: [],
  });
  const staff = config.collections.find((c) => c.slug === "staff")!;
  const write = (user: any, id: string) =>
    applyFieldWriteAccess(
      { config, fields: staff.fields, user, req: {} as any, id },
      { role: "editor", status: "active" },
    );
  return { write };
}

describe("auth-managed field access (role/status)", () => {
  const { write } = setup();

  it.each(["admin", "super_admin", "super admin", "owner"])(
    "lets a %s change another user's role and status",
    async (role) => {
      const result = await write({ id: "u1", role, collection: "staff" }, "u2");
      expect(result).toMatchObject({ role: "editor", status: "active" });
    },
  );

  it("blocks an admin from editing their own role and status", async () => {
    const result = await write({ id: "u1", role: "owner", collection: "staff" }, "u1");
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("status");
  });

  it("blocks non-admins, including roles that merely contain 'admin'", async () => {
    for (const role of ["editor", "guest_admin_viewer"]) {
      const result = await write({ id: "u1", role, collection: "staff" }, "u2");
      expect(result).not.toHaveProperty("role");
      expect(result).not.toHaveProperty("status");
    }
  });
});
