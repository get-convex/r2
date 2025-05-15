import { useMutation } from "convex/react";
import { useCallback } from "react";
import { ClientApi } from "../client";

/**
 * A hook that allows you to upload a file to R2.
 *
 * This hook can be used as is, or copied into your own code for customization
 * and tighter control.
 *
 * @param api - The client API object from the R2 component, including at least
 * `generateUploadUrl` and `syncMetadata`.
 * @param customKey - An optional key to use for the uploaded file. If not
 * provided, a random key will be generated.
 * @returns A function that uploads a file to R2.
 */
export function useUploadFile(
  api: Pick<ClientApi, "generateUploadUrl" | "syncMetadata">,
  customKey?: string
) {
  const generateUploadUrl = useMutation(api.generateUploadUrl);
  const syncMetadata = useMutation(api.syncMetadata);

  return useCallback(
    async (file: File) => {
      const { url, key } = await generateUploadUrl(customKey);
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
      await syncMetadata({ key });
      return key;
    },
    [generateUploadUrl, syncMetadata]
  );
}
