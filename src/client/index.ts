import {
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
} from "convex/server";
import { GenericId, v } from "convex/values";
import { api } from "../component/_generated/api";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class R2 {
  public readonly bucket: string;
  public readonly endpoint: string;
  public readonly accessKeyId: string;
  public readonly secretAccessKey: string;
  public r2: S3Client;
  constructor(
    public component: UseApi<typeof api>,
    options: {
      R2_BUCKET?: string;
      R2_ENDPOINT?: string;
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
    } = {}
  ) {
    this.bucket = options?.R2_BUCKET ?? process.env.R2_BUCKET!;
    this.endpoint = options?.R2_ENDPOINT ?? process.env.R2_ENDPOINT!;
    this.accessKeyId =
      options?.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID!;
    this.secretAccessKey =
      options?.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY!;

    this.r2 = new S3Client({
      region: "auto",
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }
  async generateUploadUrl() {
    const key = crypto.randomUUID();
    const url = await getSignedUrl(
      this.r2,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    return { key, url };
  }
  async getUrl(key: string) {
    return await getSignedUrl(
      this.r2,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
  async delete(ctx: RunActionCtx, key: string) {
    await ctx.runAction(this.component.lib.deleteObject, {
      key,
      bucket: this.bucket,
      endpoint: this.endpoint,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });
  }

  /**
   * For easy re-exporting.
   * Apps can do
   * ```ts
   * export const { generateUploadUrl } = r2.api();
   * ```
   */
  api() {
    return {
      generateUploadUrl: () => {
        return this.generateUploadUrl();
      },
      getUrl: (key: string) => {
        return this.getUrl(key);
      },
      delete: (ctx: RunActionCtx, key: string) => {
        return this.delete(ctx, key);
      },
    };
  }
}

/* Type utils follow */
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
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
