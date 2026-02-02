import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ClientApi } from "../client/index.js";

const mockGenerateUploadUrl = vi.fn();
const mockSyncMetadata = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn((ref: unknown) => {
    if (ref === "generateUploadUrl") return mockGenerateUploadUrl;
    if (ref === "syncMetadata") return mockSyncMetadata;
    return vi.fn();
  }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: vi.fn((fn: unknown) => fn),
  };
});

vi.mock("../client/upload.js", () => ({
  uploadWithProgress: vi.fn(),
}));

import { useUploadFile } from "./index.js";
import { uploadWithProgress } from "../client/upload.js";

const mockApi = {
  generateUploadUrl: "generateUploadUrl" as unknown,
  syncMetadata: "syncMetadata" as unknown,
} as Pick<ClientApi, "generateUploadUrl" | "syncMetadata">;

describe("react useUploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateUploadUrl, uploads, and syncs metadata", async () => {
    const url = "https://upload.example.com";
    const key = "file-key-123";
    mockGenerateUploadUrl.mockResolvedValueOnce({ url, key });
    mockSyncMetadata.mockResolvedValueOnce(undefined);

    const upload = useUploadFile(mockApi);
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = await upload(file);

    expect(mockGenerateUploadUrl).toHaveBeenCalled();
    expect(uploadWithProgress).toHaveBeenCalledWith(url, file, undefined);
    expect(mockSyncMetadata).toHaveBeenCalledWith({ key });
    expect(result).toBe(key);
  });

  it("forwards progress callback to uploadWithProgress", async () => {
    const url = "https://upload.example.com";
    const key = "file-key-456";
    mockGenerateUploadUrl.mockResolvedValueOnce({ url, key });
    mockSyncMetadata.mockResolvedValueOnce(undefined);

    const upload = useUploadFile(mockApi);
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const onProgress = vi.fn();
    await upload(file, { onProgress });

    expect(uploadWithProgress).toHaveBeenCalledWith(url, file, onProgress);
  });
});
