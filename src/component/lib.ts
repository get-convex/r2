import { action, query } from "./_generated/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import {
  r2ConfigValidator,
  createR2Client,
  exportArgs,
  ListArgs,
  ListResult,
  UploadArgs,
} from "../shared";
import { FunctionHandle } from "convex/server";

export const generateUploadUrl = action({
  args: {
    ...r2ConfigValidator.fields,
  },
  handler: async (ctx, args) => {
    const r2 = createR2Client(args);
    const key = crypto.randomUUID();
    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: args.bucket,
        Key: key,
      })
    );
    return { key, url };
  },
});

export const store = action({
  args: {
    ...r2ConfigValidator.fields,
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const r2 = createR2Client(args);
    const response = await fetch(args.url);
    const blob = await response.blob();
    const key = crypto.randomUUID();
    const command = new PutObjectCommand({
      Bucket: args.bucket,
      Key: key,
      Body: blob,
      ContentType: response.headers.get("Content-Type") ?? undefined,
    });
    await r2.send(command);
    return key;
  },
});

export const getUrl = query({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  handler: async (_ctx, args) => {
    const r2 = createR2Client(args);
    return await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      })
    );
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
  },
});

export const getMetadata = action({
  args: {
    key: v.string(),
    ...r2ConfigValidator.fields,
  },
  handler: async (ctx, args) => {
    const r2 = createR2Client(args);
    const command = new HeadObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });
    const response = await r2.send(command);
    return {
      ContentType: response.ContentType,
      ContentLength: response.ContentLength,
      LastModified: response.LastModified?.toISOString(),
    };
  },
});

export const exportConvexFilesToR2 = action({
  args: exportArgs,
  handler: async (ctx, args) => {
    const files = await ctx.runQuery(
      args.listFn as FunctionHandle<"query", ListArgs, ListResult>,
      { batchSize: args.batchSize }
    );
    if (files.length === 0) {
      return;
    }
    await ctx.runAction(args.uploadFn as FunctionHandle<"action", UploadArgs>, {
      files,
      deleteFn: args.deleteFn,
    });
    await ctx.scheduler.runAfter(
      0,
      args.nextFn as FunctionHandle<"action", typeof args>,
      args
    );
  },
});
