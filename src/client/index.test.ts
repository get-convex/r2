import { describe, expect, it } from "vitest";
import type { ComponentApi } from "../component/_generated/component.js";
import { R2 } from "./index.js";

const mockComponent = {} as ComponentApi;

describe("R2 lazy initialization", () => {
  it("constructs without throwing when env vars are missing", () => {
    expect(() => new R2(mockComponent)).not.toThrow();
  });

  it("throws with descriptive error when accessing client with missing config", () => {
    const client = new R2(mockComponent);

    expect(() => client.client).toThrow(
      "R2 configuration is missing required fields",
    );
    expect(() => client.client).toThrow("R2_BUCKET");
  });

  it("creates S3Client when config is provided via deprecated option names", () => {
    const client = new R2(mockComponent, {
      R2_BUCKET: "test-bucket",
      R2_ENDPOINT: "https://test.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "test-key",
      R2_SECRET_ACCESS_KEY: "test-secret",
    });

    expect(client.config.bucket).toBe("test-bucket");
    expect(() => client.client).not.toThrow();
  });

  it("creates S3Client when config is provided via clean option names", () => {
    const client = new R2(mockComponent, {
      bucket: "test-bucket",
      endpoint: "https://test.r2.cloudflarestorage.com",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    });

    expect(client.config.bucket).toBe("test-bucket");
    expect(client.config.endpoint).toBe(
      "https://test.r2.cloudflarestorage.com",
    );
    expect(client.config.accessKeyId).toBe("test-key");
    expect(client.config.secretAccessKey).toBe("test-secret");
    expect(() => client.client).not.toThrow();
  });

  it("clean option names take precedence over deprecated names", () => {
    const client = new R2(mockComponent, {
      bucket: "clean-bucket",
      endpoint: "https://clean.r2.cloudflarestorage.com",
      accessKeyId: "clean-key",
      secretAccessKey: "clean-secret",
      R2_BUCKET: "deprecated-bucket",
      R2_ENDPOINT: "https://deprecated.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "deprecated-key",
      R2_SECRET_ACCESS_KEY: "deprecated-secret",
    });

    expect(client.config.bucket).toBe("clean-bucket");
    expect(client.config.endpoint).toBe(
      "https://clean.r2.cloudflarestorage.com",
    );
    expect(client.config.accessKeyId).toBe("clean-key");
    expect(client.config.secretAccessKey).toBe("clean-secret");
  });

  it("exposes deprecated r2 getter as alias for client", () => {
    const client = new R2(mockComponent, {
      bucket: "test-bucket",
      endpoint: "https://test.r2.cloudflarestorage.com",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    });

    expect(client.r2).toBe(client.client);
  });
});
