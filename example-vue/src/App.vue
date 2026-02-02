<script setup lang="ts">
import { ref } from "vue";
import { useConvexQuery, useConvexMutation } from "@convex-vue/core";
import { useUploadFile } from "@convex-dev/r2/vue";
import { api } from "../convex/_generated/api";

// Type assertion needed because vue-tsc has trouble with FilterApi inference
const r2Api = api.r2 as typeof api.r2 & {
  generateUploadUrl: typeof api.r2.listImages;
  syncMetadata: typeof api.r2.listImages;
  deleteObject: typeof api.r2.listImages;
};

const uploadFile = useUploadFile(r2Api);
const uploadProgress = ref<number | null>(null);

const { data: images, isLoading } = useConvexQuery(api.r2.listImages, {});
const { mutate: deleteImage } = useConvexMutation(r2Api.deleteObject);

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadProgress.value = 0;
  const key = await uploadFile(file, {
    onProgress: ({ loaded, total }) => {
      uploadProgress.value = Math.round((loaded / total) * 100);
    },
  });
  uploadProgress.value = null;
  console.log("Uploaded:", key);
}
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 2rem; font-family: system-ui">
    <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem">R2 Vue Example</h1>

    <div style="margin-bottom: 1.5rem">
      <label style="padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; display: inline-block">
        {{ uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Upload Image" }}
        <input type="file" accept="image/*" @change="handleUpload" style="display: none" :disabled="uploadProgress !== null" />
      </label>
    </div>

    <div v-if="isLoading" style="color: #666">Loading...</div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem">
      <div v-for="image in images" :key="image._id" style="position: relative">
        <img :src="image.url" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px" />
        <button @click="deleteImage({ key: image.key })" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer">×</button>
      </div>
    </div>
  </div>
</template>
