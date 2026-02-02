/**
 * Upload a file to a signed URL using XMLHttpRequest, with optional progress
 * tracking.
 *
 * @param url - The signed upload URL.
 * @param file - The file to upload.
 * @param onProgress - Optional callback invoked with `{ loaded, total }` in
 *   bytes as the upload progresses.
 */
export async function uploadWithProgress(
  url: string,
  file: File,
  onProgress?: (progress: { loaded: number; total: number }) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        onProgress({ loaded: event.loaded, total: event.total });
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Failed to upload file: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Failed to upload file"));
    xhr.send(file);
  });
}
