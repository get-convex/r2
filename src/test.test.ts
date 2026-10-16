import { describe, expect, it, vi } from "vitest";
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import r2Test from "./test.js";

type TestInstance = TestConvex<SchemaDefinition<GenericSchema, boolean>>;

function registeredNames(name?: string) {
  const registerComponent = vi.fn();
  const t = { registerComponent } as unknown as TestInstance;
  if (name === undefined) {
    r2Test.register(t);
  } else {
    r2Test.register(t, name);
  }
  return registerComponent.mock.calls.map((call) => call[0] as string);
}

describe("register", () => {
  it("registers action-retrier as a child of the r2 component", () => {
    const names = registeredNames();

    expect(names).toContain("r2");
    expect(names).toContain("r2/actionRetrier");
    expect(names).not.toContain("actionRetrier");
  });

  it("nests action-retrier under a custom component name", () => {
    const names = registeredNames("storage");

    expect(names).toContain("storage");
    expect(names).toContain("storage/actionRetrier");
    expect(names).not.toContain("actionRetrier");
  });
});
