import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
const r2 = new R2(components.r2);

export const listConvexFiles = r2.listConvexFiles();
export const uploadFile = r2.uploadFile();
export const deleteFile = r2.deleteFile();

export const generateUploadUrl = action(() => {
  return r2.generateUploadUrl();
});

export const syncMetadata = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await r2.syncMetadata(ctx, args.key);
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

export const httpSendImage = internalMutation({
  args: { key: v.string(), requestUrl: v.string() },
  handler: async (ctx, args) => {
    const author = new URL(args.requestUrl).searchParams.get("author");
    if (!author) {
      throw new Error("Author is required");
    }
    await ctx.db.insert("images", {
      key: args.key,
      author,
    });
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
    await r2.deleteByKey(ctx, args.key);
    await ctx.runMutation(internal.example.deleteImageRef, args);
  },
});
