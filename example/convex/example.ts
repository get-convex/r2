import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
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
  deleteObject,
} = r2.clientApi<DataModel>({
  // The checkUpload callback is used for both `generateUploadUrl` and
  // `syncMetadata`.
  // In any of these checks, throw an error to reject the request.
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
    //
    // Note: If you want to associate the newly uploaded file with some other
    // data, like a message, useUploadFile returns the key in the client so you
    // can do it there.
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
      .withIndex("bucket_key", (q) => q.eq("bucket", bucket).eq("key", key))
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

export const insertImage = internalMutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("images", { key: args.key, bucket: r2.config.bucket });
  },
});

// Insert an image server side (the insertImage mutation is just an example use
// case, not required). When running the example app, you can run `npx convex run
// example:store` (or run it in the dashboard) to insert an image this way.
export const store = internalAction({
  handler: async (ctx) => {
    // Download a random image from picsum.photos
    const url = 'https://picsum.photos/200/300'
    const response = await fetch(url);
    const blob = await response.blob();

    // This function call is the only required part, it uploads the blob to R2,
    // syncs the metadata, and returns the key.
    const key =await r2.store(ctx, blob);

    await ctx.runMutation(internal.example.insertImage, { key });
  },
});
