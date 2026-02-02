import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";

const r2 = new R2(components.r2);

const clientApi = r2.clientApi<DataModel>({
  onUpload: async (ctx, bucket, key) => {
    await ctx.db.insert("images", { bucket, key });
  },
  onDelete: async (ctx, bucket, key) => {
    const image = await ctx.db.query("images").withIndex("bucket_key", (q) => q.eq("bucket", bucket).eq("key", key)).unique();
    if (image) await ctx.db.delete(image._id);
  },
});

export const generateUploadUrl = clientApi.generateUploadUrl;
export const syncMetadata = clientApi.syncMetadata;
export const deleteObject = clientApi.deleteObject;
export const listMetadata = clientApi.listMetadata;

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    return Promise.all(images.map(async (image) => ({ ...image, url: await r2.getUrl(image.key) })));
  },
});
