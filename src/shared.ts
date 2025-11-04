import { v, type GenericValidator, type Infer } from "convex/values";
import { S3Client } from "@aws-sdk/client-s3";

export const r2ConfigValidator = v.object({
  bucket: v.string(),
  endpoint: v.string(),
  accessKeyId: v.string(),
  secretAccessKey: v.string(),
});

export const createR2Client = (args: Infer<typeof r2ConfigValidator>) => {
  return new S3Client({
    region: "auto",
    endpoint: args.endpoint,
    credentials: {
      accessKeyId: args.accessKeyId,
      secretAccessKey: args.secretAccessKey,
    },
  });
};

export const paginationReturnValidator = (docValidator: GenericValidator) =>
  v.object({
    page: v.array(docValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.null(), v.string())),
    pageStatus: v.optional(
      v.union(
        v.null(),
        v.literal("SplitRecommended"),
        v.literal("SplitRequired")
      )
    ),
  });
