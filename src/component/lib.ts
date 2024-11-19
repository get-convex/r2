import { action, query } from "./_generated/server";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";

export const generateUploadUrl = action({
  args: {
    bucket: v.string(),
    endpoint: v.string(),
    accessKeyId: v.string(),
    secretAccessKey: v.string(),
  },
  handler: async (ctx, args) => {
    const r2 = new S3Client({
      region: "auto",
      endpoint: args.endpoint,
      credentials: {
        accessKeyId: args.accessKeyId,
        secretAccessKey: args.secretAccessKey,
      },
    });
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

export const getUrl = query({
  args: {
    key: v.string(),
    bucket: v.string(),
    endpoint: v.string(),
    accessKeyId: v.string(),
    secretAccessKey: v.string(),
  },
  handler: async (ctx, args) => {
    const r2 = new S3Client({
      region: "auto",
      endpoint: args.endpoint,
      credentials: {
        accessKeyId: args.accessKeyId,
        secretAccessKey: args.secretAccessKey,
      },
    });
    return await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      })
    );
  },
});
