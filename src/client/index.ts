import {
  ApiFromModules,
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
  mutationGeneric,
  PaginationOptions,
  paginationOptsValidator,
  queryGeneric,
} from "convex/server";
import { GenericId, Infer, v } from "convex/values";
import { api } from "../component/_generated/api";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createR2Client,
  paginationReturnValidator,
  r2ConfigValidator,
  withSystemFields,
} from "../shared";
import schema from "../component/schema";

export const DEFAULT_BATCH_SIZE = 10;

export type Api = ApiFromModules<{
  api: ReturnType<R2["api"]>;
}>["api"];

// e.g. `ctx` from a Convex mutation or action.
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
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
  async syncMetadata(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.syncMetadata, {
      key: key,
      ...this.r2Config,
    });
  }
  async getMetadata(ctx: RunQueryCtx, bucket: string, key: string) {
    return ctx.runQuery(this.component.lib.getMetadata, {
      key: key,
      bucket: bucket,
    });
  }
  async listMetadata(ctx: RunQueryCtx, bucket: string, limit?: number) {
    return ctx.runQuery(this.component.lib.listMetadata, {
      bucket: bucket,
      limit: limit,
    });
  }
  async pageMetadata(
    ctx: RunQueryCtx,
    bucket: string,
    paginationOpts: PaginationOptions
  ) {
    return ctx.runQuery(this.component.lib.pageMetadata, {
      bucket,
      paginationOpts,
    });
  }
  async deleteObject(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.deleteObject, {
      key: key,
      ...this.r2Config,
    });
  }
  api<DataModel extends GenericDataModel>(opts?: {
    checkReadKey?: (
      ctx: GenericQueryCtx<DataModel>,
      bucket: string,
      key: string
    ) => void | Promise<void>;
    checkReadBucket?: (
      ctx: GenericQueryCtx<DataModel>,
      bucket: string
    ) => void | Promise<void>;
    checkUpload?: (
      ctx: GenericQueryCtx<DataModel>,
      bucket: string
    ) => void | Promise<void>;
    checkDelete?: (
      ctx: GenericQueryCtx<DataModel>,
      bucket: string,
      key: string
    ) => void | Promise<void>;
  }) {
    return {
      generateUploadUrl: mutationGeneric({
        args: {},
        returns: v.object({
          key: v.string(),
          url: v.string(),
        }),
        handler: async (ctx) => {
          if (opts?.checkUpload) {
            await opts.checkUpload(ctx, this.r2Config.bucket);
          }
          return this.generateUploadUrl();
        },
      }),
      syncMetadata: mutationGeneric({
        args: {
          key: v.string(),
          ...r2ConfigValidator.fields,
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          if (opts?.checkUpload) {
            await opts.checkUpload(ctx, this.r2Config.bucket);
          }
          await ctx.scheduler.runAfter(0, this.component.lib.syncMetadata, {
            key: args.key,
            ...this.r2Config,
          });
        },
      }),
      getMetadata: queryGeneric({
        args: {
          key: v.string(),
        },
        returns: v.union(
          v.object(withSystemFields(schema.tables.metadata.validator.fields)),
          v.null()
        ),
        handler: async (ctx, args) => {
          if (opts?.checkReadKey) {
            await opts.checkReadKey(ctx, this.r2Config.bucket, args.key);
          }
          return this.getMetadata(ctx, this.r2Config.bucket, args.key);
        },
      }),
      listMetadata: queryGeneric({
        args: {
          limit: v.optional(v.number()),
        },
        returns: v.array(
          v.object(withSystemFields(schema.tables.metadata.validator.fields))
        ),
        handler: async (ctx, args) => {
          if (opts?.checkReadBucket) {
            await opts.checkReadBucket(ctx, this.r2Config.bucket);
          }
          return this.listMetadata(ctx, this.r2Config.bucket, args.limit);
        },
      }),
      pageMetadata: queryGeneric({
        args: {
          paginationOpts: paginationOptsValidator,
        },
        returns: paginationReturnValidator(
          v.object({
            _creationTime: v.number(),
            ...schema.tables.metadata.validator.fields,
          })
        ),
        handler: async (ctx, args) => {
          if (opts?.checkReadBucket) {
            await opts.checkReadBucket(ctx, this.r2Config.bucket);
          }
          return this.pageMetadata(
            ctx,
            this.r2Config.bucket,
            args.paginationOpts
          );
        },
      }),
      deleteObject: mutationGeneric({
        args: {
          key: v.string(),
          ...r2ConfigValidator.fields,
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          if (opts?.checkDelete) {
            await opts.checkDelete(ctx, this.r2Config.bucket, args.key);
          }
          await ctx.scheduler.runAfter(0, this.component.lib.deleteObject, {
            key: args.key,
            ...this.r2Config,
          });
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
