import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, r2ConfigValidator } from "../shared";
import { api } from "./_generated/api";

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

export const syncMetadata = action({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { key, ...r2Config } = args;
    const r2 = createR2Client(r2Config);
    const command = new HeadObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
    });
    const response = await r2.send(command);
    await ctx.runMutation(api.lib.insertMetadata, {
      key,
      contentType: response.ContentType,
      size: response.ContentLength,
      sha256: response.ChecksumSHA256,
      bucket: r2Config.bucket,
    });
  },
});

export const deleteMetadata = mutation({
  args: {
    key: v.string(),
    bucket: v.string(),
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

export const deleteObject = action({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { key, ...r2Config } = args;
    const r2 = createR2Client(r2Config);
    await r2.send(
      new DeleteObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
      })
    );
    await ctx.runMutation(api.lib.deleteMetadata, {
      key,
      bucket: r2Config.bucket,
    });
  },
});
