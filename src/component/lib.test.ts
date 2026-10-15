/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

const r2Config = {
  bucket: "test-bucket",
  endpoint: "https://test.r2.cloudflarestorage.com",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
};

describe("listMetadata", () => {
  it("respects endCursor", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("metadata", {
          key: `key-${i}`,
          bucket: r2Config.bucket,
          lastModified: new Date(0).toISOString(),
          link: `https://example.com/objects/key-${i}`,
        });
      }
    });
    const first = await t.query(api.lib.listMetadata, {
      ...r2Config,
      limit: 2,
    });
    expect(first.page.map((d) => d.key)).toEqual(["key-0", "key-1"]);
    expect(first.isDone).toBe(false);

    // With endCursor, the page ends at that cursor regardless of limit.
    const refetched = await t.query(api.lib.listMetadata, {
      ...r2Config,
      limit: 1,
      endCursor: first.continueCursor,
    });
    expect(refetched.page.map((d) => d.key)).toEqual(["key-0", "key-1"]);
    expect(refetched.continueCursor).toBe(first.continueCursor);

    const rest = await t.query(api.lib.listMetadata, {
      ...r2Config,
      cursor: first.continueCursor,
    });
    expect(rest.page.map((d) => d.key)).toEqual(["key-2", "key-3", "key-4"]);
    expect(rest.isDone).toBe(true);
  });
});
