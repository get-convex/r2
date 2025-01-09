import {
  ActionBuilder,
  createFunctionHandle,
  Expand,
  FunctionHandle,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  httpActionGeneric,
  HttpRouter,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  MutationBuilder,
  QueryBuilder,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import { GenericId, Infer, v } from "convex/values";
import { corsRouter } from "convex-helpers/server/cors";
import { api } from "../component/_generated/api";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createR2Client,
  DeleteArgs,
  ListArgs,
  ListResult,
  r2ConfigValidator,
  UploadArgs,
} from "../shared";
import { DataModel, Id } from "../component/_generated/dataModel";

export const DEFAULT_BATCH_SIZE = 10;

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
  async generateUploadUrl() {
    const key = crypto.randomUUID();
    const url = await getSignedUrl(
      this.r2,
      new PutObjectCommand({
        Bucket: this.r2Config.bucket,
        Key: key,
      })
    );
    return { key, url };
  }
  async store(ctx: RunActionCtx, url: string) {
    return await ctx.runAction(this.component.lib.store, {
      url,
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
  async getMetadata(ctx: RunActionCtx, key: string) {
    return await ctx.runAction(this.component.lib.getMetadata, {
      key,
      ...this.r2Config,
    });
  }
  listConvexFiles({
    batchSize: functionDefaultBatchSize,
  }: {
    batchSize?: number;
  } = {}) {
    const defaultBatchSize =
      functionDefaultBatchSize ??
      this.options?.defaultBatchSize ??
      DEFAULT_BATCH_SIZE;
    return (internalQueryGeneric as QueryBuilder<DataModel, "internal">)({
      args: {
        batchSize: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        const numItems = args.batchSize || defaultBatchSize;
        if (args.batchSize === 0) {
          console.warn(`Batch size is zero. Using the default: ${numItems}\n`);
        }
        return await ctx.db.system.query("_storage").take(numItems);
      },
    }) satisfies RegisteredQuery<
      "internal",
      { batchSize: number },
      Promise<
        {
          _id: Id<"_storage">;
          _creationTime: number;
          contentType?: string | undefined;
          sha256: string;
          size: number;
        }[]
      >
    >;
  }
  uploadFile() {
    return (internalActionGeneric as ActionBuilder<DataModel, "internal">)({
      args: {
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
      },
      handler: async (ctx, args) => {
        const deleteFn = args.deleteFn as FunctionHandle<
          "mutation",
          { fileId: Id<"_storage"> },
          void
        >;
        await Promise.all(
          args.files.map(async (file) => {
            const blob = await ctx.storage.get(file._id);
            if (!blob) {
              return;
            }
            await this.r2.send(
              new PutObjectCommand({
                Bucket: this.r2Config.bucket,
                Key: file._id,
                Body: blob,
                ContentType: file.contentType ?? undefined,
                ChecksumSHA256: file.sha256,
              })
            );
            const metadata = await this.r2.send(
              new HeadObjectCommand({
                Bucket: this.r2Config.bucket,
                Key: file._id,
              })
            );
            if (metadata.ChecksumSHA256 !== file.sha256) {
              throw new Error("Checksum mismatch");
            }
            await ctx.runMutation(deleteFn, { fileId: file._id });
          })
        );
      },
    }) satisfies RegisteredAction<
      "internal",
      {
        files: {
          contentType?: string | undefined;
          sha256: string;
          size: number;
          _creationTime: number;
          _id: Id<"_storage">;
        }[];
        deleteFn: string;
      },
      Promise<void>
    >;
  }
  deleteFile() {
    return (internalMutationGeneric as MutationBuilder<DataModel, "internal">)({
      args: {
        fileId: v.id("_storage"),
      },
      handler: async (ctx, args) => {
        await ctx.storage.delete(args.fileId);
      },
    }) satisfies RegisteredMutation<
      "internal",
      { fileId: Id<"_storage"> },
      Promise<void>
    >;
  }
  async exportConvexFilesToR2<T extends DataModel>(
    ctx: GenericActionCtx<T>,
    {
      listFn,
      uploadFn,
      nextFn,
      deleteFn,
      batchSize,
    }: {
      listFn: FunctionReference<"query", "internal", ListArgs, ListResult>;
      uploadFn: FunctionReference<"action", "internal", UploadArgs>;
      deleteFn: FunctionReference<"mutation", "internal", DeleteArgs>;
      nextFn: FunctionReference<"action", "internal">;
      batchSize?: number;
    }
  ) {
    return await ctx.runAction(this.component.lib.exportConvexFilesToR2, {
      ...this.r2Config,
      listFn: await createFunctionHandle(listFn),
      uploadFn: await createFunctionHandle(uploadFn),
      nextFn: await createFunctionHandle(nextFn),
      deleteFn: await createFunctionHandle(deleteFn),
      batchSize:
        batchSize ?? this.options?.defaultBatchSize ?? DEFAULT_BATCH_SIZE,
    });
  }
  registerRoutes(
    http: HttpRouter,
    {
      pathPrefix = "/r2",
      onSend,
    }: {
      onSend?: FunctionReference<
        "mutation",
        "internal",
        { key: string; requestUrl: string }
      >;
      pathPrefix?: string;
    } = {}
  ) {
    const cors = corsRouter(http);
    cors.route({
      pathPrefix: `${pathPrefix}/get/`,
      method: "GET",
      handler: httpActionGeneric(async (_ctx, request) => {
        const { pathname } = new URL(request.url);
        const key = pathname.split("/").pop()!;
        const command = new GetObjectCommand({
          Bucket: this.r2Config.bucket,
          Key: key,
        });
        const response = await this.r2.send(command);

        if (!response.Body) {
          return new Response("Image not found", {
            status: 404,
          });
        }
        return new Response(await response.Body.transformToByteArray());
      }),
    });
    cors.route({
      path: `${pathPrefix}/send`,
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const blob = await request.blob();
        const key = crypto.randomUUID();
        const command = new PutObjectCommand({
          Bucket: this.r2Config.bucket,
          Key: key,
          Body: blob,
          ContentType: request.headers.get("Content-Type") ?? undefined,
        });
        await this.r2.send(command);
        if (onSend) {
          await ctx.runMutation(onSend, { key, requestUrl: request.url });
        }
        return new Response(null);
      }),
    });
  }
}

/* Type utils follow */
type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
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
