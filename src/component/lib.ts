import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  createR2Client,
  paginationReturnValidator,
  r2ConfigValidator,
  withSystemFields,
} from "../shared";
import { api } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

export const getMetadata = query({
  args: {
    bucket: v.string(),
    key: v.string(),
  },
  returns: v.union(
    v.object(withSystemFields(schema.tables.metadata.validator.fields)),
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

export const listMetadata = query({
  args: {
    bucket: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object(withSystemFields(schema.tables.metadata.validator.fields))
  ),
  handler: async (ctx, args) => {
    const listQuery = ctx.db
      .query("metadata")
      .withIndex("bucket", (q) => q.eq("bucket", args.bucket));
    if (typeof args.limit === "number") {
      return listQuery.take(args.limit);
    }
    return listQuery.collect();
  },
});

export const pageMetadata = query({
  args: {
    bucket: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationReturnValidator(
    v.object({
      _creationTime: v.number(),
      ...schema.tables.metadata.validator.fields,
    })
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("metadata")
      .withIndex("bucket", (q) => q.eq("bucket", args.bucket))
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map(({ _id, ...doc }) => doc),
    };
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
