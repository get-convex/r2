import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import { DataModel } from "./_generated/dataModel";
const r2 = new R2(components.r2);

export const {
  generateUploadUrl,
  syncMetadata,

  // These aren't used in the example, but can be exported this way to utilize
  // the permission check callbacks.
  getMetadata,
  listMetadata,
  pageMetadata,
  deleteObject,
} = r2.clientApi<DataModel>({
  // The checkUpload callback is used for both `generateUploadUrl` and
  // `syncMetadata`.
  checkUpload: async (ctx, bucket) => {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can upload to this bucket
  },
  checkReadKey: async (ctx, bucket, key) => {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can read this key
  },
  checkReadBucket: async (ctx, bucket) => {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can read this bucket
  },
  checkDelete: async (ctx, bucket, key) => {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can delete this key
  },
  onUpload: async (ctx, key) => {
    // ...do something with the key
    // This technically runs in the `syncMetadata` mutation, as the upload
    // is performed from the client side. Will run if using the `useUploadFile`
    // hook, or if `syncMetadata` function is called directly.
  },
});

export const getRecentImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").take(10);
    return Promise.all(
      images.map(async (image) => ({
        ...image,
        url: await r2.getUrl(image.key),
      }))
    );
  },
});

export const sendImage = mutation({
  args: { key: v.string(), author: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("images", args);
  },
});

export const deleteImageRef = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .withIndex("key", (q) => q.eq("key", args.key))
      .first();
    if (image) {
      await ctx.db.delete(image._id);
    }
  },
});

export const deleteImage = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await r2.deleteObject(ctx, args.key);
    await ctx.runMutation(internal.example.deleteImageRef, { key: args.key });
  },
});
