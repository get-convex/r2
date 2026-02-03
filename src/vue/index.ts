import { useConvexClient } from "convex-vue";
import type { ClientApi } from "../client/index.js";
import { uploadWithProgress } from "../client/upload.js";

/**
 * A hook that allows you to upload a file to R2.
 *
 * @param api - The client API object from the R2 component, including at least
 * `generateUploadUrl` and `syncMetadata`.
 * @returns A function that uploads a file to R2.
 */
export function useUploadFile(
  api: Pick<ClientApi, "generateUploadUrl" | "syncMetadata">,
) {
  const client = useConvexClient();

  return async (
    file: File,
    options?: {
      onProgress?: (progress: { loaded: number; total: number }) => void;
    },
  ) => {
    const { url, key } = await client.mutation(api.generateUploadUrl, {});
    await uploadWithProgress(url, file, options?.onProgress);
    await client.mutation(api.syncMetadata, { key });
    return key;
  };
}
