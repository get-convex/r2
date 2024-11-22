import { Infer, ObjectType, v } from "convex/values";
import { S3Client } from "@aws-sdk/client-s3";
import { Id } from "./component/_generated/dataModel";

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

export const listArgs = {
  batchSize: v.optional(v.number()),
};
export type ListArgs = ObjectType<typeof listArgs>;

export type ListResult = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
}[];

export const uploadArgs = {
  files: v.array(
    v.object({
      _id: v.id("_storage"),
      _creationTime: v.number(),
      contentType: v.optional(v.string()),
      sha256: v.string(),
      size: v.number(),
    })
  ),
  deleteFn: v.string(),
};
export type UploadArgs = ObjectType<typeof uploadArgs>;

export const exportArgs = {
  ...r2ConfigValidator.fields,
  listFn: v.string(),
  uploadFn: v.string(),
  deleteFn: v.string(),
  nextFn: v.string(),
  batchSize: v.optional(v.number()),
};
export type ExportArgs = ObjectType<typeof exportArgs>;

export const deleteArgs = {
  fileId: v.id("_storage"),
};
export type DeleteArgs = ObjectType<typeof deleteArgs>;
