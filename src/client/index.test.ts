import { describe, expect, it } from "vitest";
import type { ComponentApi } from "../component/_generated/component.js";
import { R2 } from "./index.js";

const mockComponent = {} as ComponentApi;

describe("R2 lazy initialization", () => {
  it("constructs without throwing when env vars are missing", () => {
    expect(() => new R2(mockComponent)).not.toThrow();
  });

  it("throws with descriptive error when accessing r2 getter with missing config", () => {
    const r2 = new R2(mockComponent);

    expect(() => r2.r2).toThrow("R2 configuration is missing required fields");
    expect(() => r2.r2).toThrow("R2_BUCKET");
  });

  it("creates S3Client when config is provided via options", () => {
    const r2 = new R2(mockComponent, {
      R2_BUCKET: "test-bucket",
      R2_ENDPOINT: "https://test.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "test-key",
      R2_SECRET_ACCESS_KEY: "test-secret",
    });

    expect(r2.config.bucket).toBe("test-bucket");
    expect(() => r2.r2).not.toThrow();
  });
});
