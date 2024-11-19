import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import { Doc } from "./_generated/dataModel";
const r2 = new R2(components.r2);

export const generateUploadUrl = action({
  args: {},
  handler: async () => {
    return await r2.generateUploadUrl();
  },
});

export const getRecentImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").take(10);
    return Promise.all(
      images.map(async (image) => ({
        ...image,
        url: await r2.getUrl(image.storageId),
      }))
    );
  },
});

export const sendImage = mutation({
  args: { storageId: v.string(), author: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("images", args);
  },
});
