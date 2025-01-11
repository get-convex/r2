import {
  actionGeneric,
  ApiFromModules,
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
  mutationGeneric,
} from "convex/server";
import { GenericId, Infer, v } from "convex/values";
import { Mounts } from "../component/_generated/api";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, r2ConfigValidator } from "../shared";

export const DEFAULT_BATCH_SIZE = 10;

export type Api = ApiFromModules<{
  api: ReturnType<R2["api"]>;
}>["api"];

export class R2 {
  public readonly r2Config: Infer<typeof r2ConfigValidator>;
  public readonly r2: S3Client;
  constructor(
    public component: UseApi<Mounts>,
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
  async syncMetadata(ctx: RunActionCtx, key: string) {
    return await ctx.runAction(this.component.lib.syncMetadata, {
      key,
      ...this.r2Config,
    });
  }
  async getUrl(key: string) {
    return await getSignedUrl(
      this.r2,
      new GetObjectCommand({
        Bucket: this.r2Config.bucket,
        Key: key,
      })
    );
  }
  async deleteByKey(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.deleteObject, {
      key,
      ...this.r2Config,
    });
  }
  async getMetadata(ctx: RunQueryCtx, key: string) {
    return await ctx.runQuery(this.component.lib.getMetadata, {
      key,
    });
  }
  api() {
    return {
      generateUploadUrl: mutationGeneric({
        args: {},
        returns: v.object({
          key: v.string(),
          url: v.string(),
        }),
        handler: async () => {
          const key = crypto.randomUUID();
          const url = await getSignedUrl(
            this.r2,
            new PutObjectCommand({
              Bucket: this.r2Config.bucket,
              Key: key,
            })
          );
          return { key, url };
        },
      }),
      syncMetadata: actionGeneric({
        args: {
          key: v.string(),
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          await ctx.runAction(this.component.lib.syncMetadata, {
            key: args.key,
            ...this.r2Config,
          });
        },
      }),
    };
  }
}

/* Type utils follow */
type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

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
