import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
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
  onUpload: async (ctx, bucket, key) => {
    // ...do something with the key
    // This technically runs in the `syncMetadata` mutation, as the upload
    // is performed from the client side. Will run if using the `useUploadFile`
    // hook, or if `syncMetadata` function is called directly. Runs after the
    // `checkUpload` callback.
    await ctx.db.insert("images", {
      bucket,
      key,
    });
  },
  onDelete: async (ctx, bucket, key) => {
    // Delete related data from your database, etc.
    // Runs after the `checkDelete` callback.
    // Alternatively, you could have your own `deleteImage` mutation that calls
    // the r2 component's `deleteObject` function.
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("key"), key))
      .unique();
    if (image) {
      await ctx.db.delete(image._id);
    }
  },
});

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    return Promise.all(
      images.map(async (image) => ({
        ...image,
        url: await r2.getUrl(image.key),
      }))
    );
  },
});

export const updateImageCaption = mutation({
  args: {
    id: v.id("images"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      caption: args.caption,
    });
  },
});
