import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ClientApi } from "../client/index.js";

const mockMutation = vi.fn();
const mockClient = { mutation: mockMutation };

vi.mock("convex-vue", () => ({
  useConvexClient: vi.fn(() => mockClient),
}));

vi.mock("../client/upload.js", () => ({
  uploadWithProgress: vi.fn(),
}));

import { useUploadFile } from "./index.js";
import { uploadWithProgress } from "../client/upload.js";

const mockApi = {
  generateUploadUrl: "generateUploadUrl" as unknown,
  syncMetadata: "syncMetadata" as unknown,
} as Pick<ClientApi, "generateUploadUrl" | "syncMetadata">;

describe("vue useUploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateUploadUrl, uploads, and syncs metadata", async () => {
    const url = "https://upload.example.com";
    const key = "file-key-123";
    mockMutation.mockResolvedValueOnce({ url, key });
    mockMutation.mockResolvedValueOnce(undefined);

    const upload = useUploadFile(mockApi);
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = await upload(file);

    expect(mockMutation).toHaveBeenCalledWith(mockApi.generateUploadUrl, {});
    expect(uploadWithProgress).toHaveBeenCalledWith(url, file, undefined);
    expect(mockMutation).toHaveBeenCalledWith(mockApi.syncMetadata, { key });
    expect(result).toBe(key);
  });

  it("forwards progress callback to uploadWithProgress", async () => {
    const url = "https://upload.example.com";
    const key = "file-key-456";
    mockMutation.mockResolvedValueOnce({ url, key });
    mockMutation.mockResolvedValueOnce(undefined);

    const upload = useUploadFile(mockApi);
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const onProgress = vi.fn();
    await upload(file, { onProgress });

    expect(uploadWithProgress).toHaveBeenCalledWith(url, file, onProgress);
  });
});
