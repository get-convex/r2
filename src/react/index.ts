import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";
import { Api } from "../client";

export function useUploadFile(api: Api) {
  const generateUploadUrl = useMutation(api.generateUploadUrl);
  const syncMetadata = useAction(api.syncMetadata);

  const upload = useCallback(
    async (file: File) => {
      const { url, key } = await generateUploadUrl();
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
  return upload;
}
