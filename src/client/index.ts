import {
  actionGeneric,
  ApiFromModules,
  Expand,
  FunctionReference,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  queryGeneric,
} from "convex/server";
import { GenericId, Infer, v } from "convex/values";
import { api } from "../component/_generated/api";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, r2ConfigValidator } from "../shared";
import schema from "../component/schema";

export const DEFAULT_BATCH_SIZE = 10;

export type Api = ApiFromModules<{
  api: ReturnType<R2["api"]>;
}>["api"];

// e.g. `ctx` from a Convex mutation or action.
export type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
export type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export class R2 {
  public readonly r2Config: Infer<typeof r2ConfigValidator>;
  public readonly r2: S3Client;
  constructor(
    public component: UseApi<typeof api>,
    public options: {
      R2_BUCKET?: string;
      R2_ENDPOINT?: string;
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
      defaultBatchSize?: number;
    } = {}
  ) {
    this.r2Config = {
      bucket: options?.R2_BUCKET ?? process.env.R2_BUCKET!,
      endpoint: options?.R2_ENDPOINT ?? process.env.R2_ENDPOINT!,
      accessKeyId: options?.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey:
        options?.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY!,
    };
    this.r2 = createR2Client(this.r2Config);
  }
  async getUrl(key: string) {
    return await getSignedUrl(
      this.r2,
      new GetObjectCommand({ Bucket: this.r2Config.bucket, Key: key })
    );
  }
  async generateUploadUrl() {
    const key = crypto.randomUUID();
    const url = await getSignedUrl(
      this.r2,
      new PutObjectCommand({ Bucket: this.r2Config.bucket, Key: key })
    );
    return { key, url };
  }
  async syncMetadata(ctx: RunMutationCtx, key: string) {
    const command = new HeadObjectCommand({
      Bucket: this.r2Config.bucket,
      Key: key,
    });
    const response = await this.r2.send(command);
    await ctx.runMutation(this.component.lib.insertMetadata, {
      key: key,
      bucket: this.r2Config.bucket,
      contentType: response.ContentType,
      size: response.ContentLength,
      sha256: response.ChecksumSHA256,
    });
  }
  async getMetadata(ctx: RunQueryCtx, key: string) {
    return ctx.runQuery(this.component.lib.getMetadata, {
      key: key,
      bucket: this.r2Config.bucket,
    });
  }
  async deleteObject(ctx: RunMutationCtx, key: string) {
    await this.r2.send(
      new DeleteObjectCommand({ Bucket: this.r2Config.bucket, Key: key })
    );
    await ctx.runMutation(this.component.lib.deleteMetadata, {
      bucket: this.r2Config.bucket,
      key: key,
    });
  }
  api() {
    return {
      generateUploadUrl: actionGeneric({
        args: {},
        returns: v.object({
          key: v.string(),
          url: v.string(),
        }),
        handler: () => this.generateUploadUrl(),
      }),
      syncMetadata: actionGeneric({
        args: {
          key: v.string(),
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          await this.syncMetadata(ctx, args.key);
        },
      }),
      getMetadata: queryGeneric({
        args: {
          key: v.string(),
        },
        returns: v.union(schema.tables.metadata.validator, v.null()),
        handler: async (ctx, args) => {
          return this.getMetadata(ctx, args.key);
        },
      }),
      deleteObject: actionGeneric({
        args: {
          key: v.string(),
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          await this.deleteObject(ctx, args.key);
        },
      }),
    };
  }
}

/* Type utils follow */

export type OpaqueIds<T> =
  T extends GenericId<infer _T>
    ? string
    : T extends (infer U)[]
      ? OpaqueIds<U>[]
      : T extends object
        ? { [K in keyof T]: OpaqueIds<T[K]> }
        : T;

export type UseApi<API> = Expand<{
  [mod in keyof API]: API[mod] extends FunctionReference<
    infer FType,
    "public",
    infer FArgs,
    infer FReturnType,
    infer FComponentPath
  >
    ? FunctionReference<
        FType,
        "internal",
        OpaqueIds<FArgs>,
        OpaqueIds<FReturnType>,
        FComponentPath
      >
    : UseApi<API[mod]>;
}>;
