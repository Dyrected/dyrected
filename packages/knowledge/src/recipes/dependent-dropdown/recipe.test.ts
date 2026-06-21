import { describe, expect, it } from "vitest";
import { Locations } from "./recipe.js";

describe("dependent dropdown recipe", () => {
  it("returns options for the selected country", async () => {
    const region = Locations.fields.find((field) => field.name === "region");
    const options = await region?.admin?.hooks?.options?.({
      siblingData: { country: "ng" },
      data: {},
    });
    expect(options).toEqual(["Lagos", "Abuja", "Oyo"]);
  });
});
