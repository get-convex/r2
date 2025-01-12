import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

export const getMetadata = query({
  args: {
    key: v.string(),
    bucket: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      ...schema.tables.metadata.validator.fields,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metadata")
      .withIndex("bucket_key", (q) =>
        q.eq("bucket", args.bucket).eq("key", args.key)
      )
      .unique();
  },
});

export const insertMetadata = mutation({
  args: schema.tables.metadata.validator,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("metadata", {
      key: args.key,
      contentType: args.contentType,
      size: args.size,
      sha256: args.sha256,
      bucket: args.bucket,
    });
  },
});

export const deleteMetadata = mutation({
  args: {
    bucket: v.string(),
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("metadata")
      .withIndex("bucket_key", (q) =>
        q.eq("bucket", args.bucket).eq("key", args.key)
      )
      .unique();
    if (metadata) {
      await ctx.db.delete(metadata._id);
    }
  },
});
