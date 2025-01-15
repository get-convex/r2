import {
  ApiFromModules,
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
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
} from "../shared";
import schema from "../component/schema";

export const DEFAULT_BATCH_SIZE = 10;

export type ClientApi = ApiFromModules<{
  client: ReturnType<R2["clientApi"]>;
}>["client"];

// e.g. `ctx` from a Convex mutation or action.
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};
type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};

export class R2 {
  public readonly r2Config: Infer<typeof r2ConfigValidator>;
  public readonly r2: S3Client;
  /**
   * Backend API for the R2 component.
   * Responsible for exposing the `client` API to the client, and having
   * convenience methods for interacting with the component from the backend.
   *
   * Typically used like:
   *
   * ```ts
   * const r2 = new R2(components.r2);
   * export const {
   * ... // see {@link clientApi} docstring for details
   * } = r2.clientApi({...});
   * ```
   *
   * @param component - Generally `components.r2` from
   * `./_generated/api` once you've configured it in `convex.config.ts`.
   * @param options - Optional config object, most properties usually set via
   * environment variables.
   *   - `R2_BUCKET` - The bucket to use for the R2 component.
   *   - `R2_ENDPOINT` - The endpoint to use for the R2 component.
   *   - `R2_ACCESS_KEY_ID` - The access key ID to use for the R2 component.
   *   - `R2_SECRET_ACCESS_KEY` - The secret access key to use for the R2 component.
   *   - `defaultBatchSize` - The default batch size to use for pagination.
   */
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
    if (
      !this.r2Config.bucket ||
      !this.r2Config.endpoint ||
      !this.r2Config.accessKeyId ||
      !this.r2Config.secretAccessKey
    ) {
      throw new Error(
        "R2 configuration is missing required fields.\n" +
          "R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
      );
    }
    this.r2 = createR2Client(this.r2Config);
  }
  /**
   * Get a signed URL for serving an object from R2.
   *
   * @param key - The R2 object key.
   * @returns A promise that resolves to a signed URL for the object.
   */
  async getUrl(key: string) {
    return await getSignedUrl(
      this.r2,
      new GetObjectCommand({ Bucket: this.r2Config.bucket, Key: key })
    );
  }
  /**
   * Generate a signed URL for uploading an object to R2.
   *
   * @returns A promise that resolves to an object with the following fields:
   *   - `key` - The R2 object key.
   *   - `url` - A signed URL for uploading the object.
   */
  async generateUploadUrl() {
    const key = crypto.randomUUID();
    const url = await getSignedUrl(
      this.r2,
      new PutObjectCommand({ Bucket: this.r2Config.bucket, Key: key })
    );
    return { key, url };
  }
  /**
   * Retrieve R2 object metadata and store in Convex.
   *
   * @param ctx - A Convex action context.
   * @param key - The R2 object key.
   * @returns A promise that resolves when the metadata is synced.
   */
  async syncMetadata(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.syncMetadata, {
      key: key,
      ...this.r2Config,
    });
  }
  /**
   * Retrieve R2 object metadata from Convex.
   *
   * @param ctx - A Convex query context.
   * @param key - The R2 object key.
   * @returns A promise that resolves to the metadata for the object.
   */
  async getMetadata(ctx: RunQueryCtx, key: string) {
    return ctx.runQuery(this.component.lib.getMetadata, {
      key: key,
      ...this.r2Config,
    });
  }
  /**
   * Retrieve all metadata from Convex for a given bucket.
   *
   * @param ctx - A Convex query context.
   * @param limit (optional) - The maximum number of documents to return.
   * @returns A promise that resolves to an array of metadata documents.
   */
  async listMetadata(ctx: RunQueryCtx, limit?: number, cursor?: string | null) {
    return ctx.runQuery(this.component.lib.listMetadata, {
      ...this.r2Config,
      limit: limit,
      cursor: cursor ?? undefined,
    });
  }
  /**
   * Delete an object from R2.
   *
   * @param ctx - A Convex action context.
   * @param key - The R2 object key.
   * @returns A promise that resolves when the object is deleted.
   */
  async deleteObject(ctx: RunMutationCtx, key: string) {
    await ctx.runMutation(this.component.lib.deleteObject, {
      key: key,
      ...this.r2Config,
    });
  }
  /**
   * Expose the client API to the client for use with the `useUploadFile` hook.
   * If you export these in `convex/r2.ts`, pass `api.r2`
   * to the `useUploadFile` hook.
   *
   * It allows you to define optional read, upload, and delete permissions.
   *
   * You can pass the optional type argument `<DataModel>` to have the `ctx`
   * parameter specific to your tables.
   *
   * ```ts
   * import { DataModel } from "./convex/_generated/dataModel";
   * // ...
   * export const { ... } = r2.clientApi<DataModel>({...});
   * ```
   *
   * To define just one function to use for both, you can define it like this:
   * ```ts
   * async function checkPermissions(ctx: QueryCtx, id: string) {
   *   const user = await getAuthUser(ctx);
   *   if (!user || !(await canUserAccessDocument(user, id))) {
   *     throw new Error("Unauthorized");
   *   }
   * }
   * ```
   * @param opts - Optional callbacks.
   * @returns functions to export, so the `useUploadFile` hook can use them, or
   * for direct use in your own client code.
   */
  clientApi<DataModel extends GenericDataModel>(opts?: {
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
    onUpload?: (
      ctx: GenericMutationCtx<DataModel>,
      bucket: string,
      key: string
    ) => void | Promise<void>;
    onDelete?: (
      ctx: GenericMutationCtx<DataModel>,
      bucket: string,
      key: string
    ) => void | Promise<void>;
  }) {
    return {
      /**
       * Generate a signed URL for uploading an object to R2.
       */
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
      /**
       * Retrieve R2 object metadata and store in Convex.
       */
      syncMetadata: mutationGeneric({
        args: {
          key: v.string(),
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          if (opts?.checkUpload) {
            await opts.checkUpload(ctx, this.r2Config.bucket);
          }
          if (opts?.onUpload) {
            await opts.onUpload(ctx, this.r2Config.bucket, args.key);
          }
          await ctx.scheduler.runAfter(0, this.component.lib.syncMetadata, {
            key: args.key,
            ...this.r2Config,
          });
        },
      }),
      /**
       * Retrieve metadata for an R2 object from Convex.
       */
      getMetadata: queryGeneric({
        args: {
          key: v.string(),
        },
        returns: v.union(
          v.object({
            ...schema.tables.metadata.validator.fields,
            url: v.string(),
            bucketLink: v.string(),
          }),
          v.null()
        ),
        handler: async (ctx, args) => {
          if (opts?.checkReadKey) {
            await opts.checkReadKey(ctx, this.r2Config.bucket, args.key);
          }
          return this.getMetadata(ctx, args.key);
        },
      }),
      /**
       * Retrieve all metadata for a given bucket from Convex.
       */
      listMetadata: queryGeneric({
        args: { paginationOpts: paginationOptsValidator },
        returns: paginationReturnValidator(
          v.object({
            ...schema.tables.metadata.validator.fields,
            url: v.string(),
            bucketLink: v.string(),
          })
        ),
        handler: async (ctx, args) => {
          if (opts?.checkReadBucket) {
            await opts.checkReadBucket(ctx, this.r2Config.bucket);
          }
          return this.listMetadata(
            ctx,
            args.paginationOpts.numItems,
            args.paginationOpts.cursor
          );
        },
      }),
      /**
       * Delete an object from R2 and remove its metadata from Convex.
       */
      deleteObject: mutationGeneric({
        args: {
          key: v.string(),
        },
        returns: v.null(),
        handler: async (ctx, args) => {
          if (opts?.checkDelete) {
            await opts.checkDelete(ctx, this.r2Config.bucket, args.key);
          }
          if (opts?.onDelete) {
            await opts.onDelete(ctx, this.r2Config.bucket, args.key);
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
