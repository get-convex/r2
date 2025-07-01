import { ClientApi } from "../client";
import { useConvexClient } from "convex-svelte";

/**
 * A hook that allows you to upload a file to R2.
 *
 * @param api - The client API object from the R2 component, including at least
 * `generateUploadUrl` and `syncMetadata`.
 * @returns A function that uploads a file to R2.
 */
export function useUploadFile(
  api: Pick<ClientApi, "generateUploadUrl" | "syncMetadata">
) {
  const client = useConvexClient();

  return async (file: File) => {
    const { url, key } = await client.mutation(api.generateUploadUrl, {});
    try {
      const result = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) {
        throw new Error(`Failed to upload image: ${result.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to upload image: ${error}`);
    }
    await client.mutation(api.syncMetadata, { key });
    return key;
  };
}
