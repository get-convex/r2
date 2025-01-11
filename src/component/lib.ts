import { action, mutation, query } from "./_generated/server";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { v } from "convex/values";
import { r2ConfigValidator, createR2Client } from "../shared";
import { api } from "./_generated/api";

export const insertMetadata = mutation({
  args: {
    key: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.string(),
    bucket: v.string(),
  },
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
    ...r2ConfigValidator.fields,
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const r2 = createR2Client(args);
    const command = new HeadObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });
    const response = await r2.send(command);
    await ctx.scheduler.runAfter(0, api.lib.insertMetadata, {
      key: args.key,
      contentType: response.ContentType ?? "",
      size: response.ContentLength ?? 0,
      sha256: response.ChecksumSHA256 ?? "",
      bucket: args.bucket,
    });
  },
});

export const deleteMetadata = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("metadata")
      .withIndex("key", (q) => q.eq("key", args.key))
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
  handler: async (ctx, args) => {
    const r2 = createR2Client(args);
    await r2.send(
      new DeleteObjectCommand({ Bucket: args.bucket, Key: args.key })
    );
    await ctx.scheduler.runAfter(0, api.lib.deleteMetadata, {
      key: args.key,
    });
  },
});

export const getMetadata = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metadata")
      .withIndex("key", (q) => q.eq("key", args.key))
      .unique();
  },
});
