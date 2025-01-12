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

export type ClientApi = ApiFromModules<{
  client: ReturnType<R2["clientApi"]>;
}>["client"];

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
      bucket: this.r2Config.bucket,
      key: key,
    });
  }
  /**
   * Retrieve all metadata from Convex for a given bucket.
   *
   * @param ctx - A Convex query context.
   * @param limit (optional) - The maximum number of documents to return.
   * @returns A promise that resolves to an array of metadata documents.
   */
  async listMetadata(ctx: RunQueryCtx, limit?: number) {
    return ctx.runQuery(this.component.lib.listMetadata, {
      bucket: this.r2Config.bucket,
      limit: limit,
    });
  }
  /**
   * Retrieve paginated metadata from Convex for a given bucket.
   *
   * @param ctx - A Convex query context.
   * @param paginationOpts - The pagination options.
   * @returns A promise that resolves to a paginated list of metadata documents.
   */
  async pageMetadata(ctx: RunQueryCtx, paginationOpts: PaginationOptions) {
    return ctx.runQuery(this.component.lib.pageMetadata, {
      bucket: this.r2Config.bucket,
      paginationOpts,
    });
  }
  /**
   * Delete an object from R2.
   *
   * @param ctx - A Convex action context.
   * @param key - The R2 object key.
   * @returns A promise that resolves when the object is deleted.
   */
  async deleteObject(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.deleteObject, {
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
   * @returns functions to export, so the `useUploadFile` hook can use them.
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
          v.object(withSystemFields(schema.tables.metadata.validator.fields)),
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
          return this.listMetadata(ctx, args.limit);
        },
      }),
      /**
       * Retrieve paginated metadata for a given bucket from Convex.
       */
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
          return this.pageMetadata(ctx, args.paginationOpts);
        },
      }),
      /**
       * Delete an object from R2 and remove its metadata from Convex.
       */
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
