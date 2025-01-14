import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  createR2Client,
  paginationReturnValidator,
  r2ConfigValidator,
  withoutSystemFields,
} from "../shared";
import { api, components } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asyncMap } from "convex-helpers";
import { ActionRetrier } from "@convex-dev/action-retrier";

const retrier = new ActionRetrier(components.actionRetrier);

const getUrl = async (r2: S3Client, bucket: string, key: string) => {
  return await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
};

export const getMetadata = query({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  returns: v.union(
    v.object({
      ...schema.tables.metadata.validator.fields,
      url: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { key, ...r2Config } = args;
    const r2 = createR2Client(r2Config);
    const metadata = await ctx.db
      .query("metadata")
      .withIndex("bucket_key", (q) =>
        q.eq("bucket", args.bucket).eq("key", args.key)
      )
      .unique();
    if (!metadata) {
      return null;
    }
    return {
      ...withoutSystemFields(metadata),
      url: await getUrl(r2, r2Config.bucket, key),
    };
  },
});

export const listMetadata = query({
  args: {
    limit: v.optional(v.number()),
    ...r2ConfigValidator.fields,
  },
  returns: v.array(
    v.object({
      ...schema.tables.metadata.validator.fields,
      url: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const { limit, ...r2Config } = args;
    const r2 = createR2Client(r2Config);
    const listQuery = ctx.db
      .query("metadata")
      .withIndex("bucket", (q) => q.eq("bucket", r2Config.bucket));
    const list =
      typeof limit === "number"
        ? await listQuery.take(limit)
        : await listQuery.collect();
    return asyncMap(list, async (doc) => ({
      ...withoutSystemFields(doc),
      url: await getUrl(r2, r2Config.bucket, doc.key),
    }));
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
      lastModified: args.lastModified,
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
      lastModified: response.LastModified?.toISOString() ?? "",
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

export const deleteR2Object = action({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { key, ...r2Config } = args;
    const r2 = createR2Client(r2Config);
    await r2.send(
      new DeleteObjectCommand({ Bucket: r2Config.bucket, Key: key })
    );
  },
});

export const deleteObject = mutation({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
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
    await retrier.run(ctx, api.lib.deleteR2Object, args);
  },
});
