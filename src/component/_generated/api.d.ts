/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib from "../lib.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  lib: typeof lib;
}>;
export type Mounts = {
  lib: {
    deleteMetadata: FunctionReference<
      "mutation",
      "public",
      { bucket: string; key: string },
      null
    >;
    deleteObject: FunctionReference<
      "action",
      "public",
      {
        accessKeyId: string;
        bucket: string;
        endpoint: string;
        key: string;
        secretAccessKey: string;
      },
      null
    >;
    getMetadata: FunctionReference<
      "query",
      "public",
      { bucket: string; key: string },
      {
        _creationTime: number;
        _id: string;
        bucket: string;
        contentType?: string;
        key: string;
        sha256?: string;
        size?: number;
      } | null
    >;
    insertMetadata: FunctionReference<
      "mutation",
      "public",
      {
        bucket: string;
        contentType?: string;
        key: string;
        sha256?: string;
        size?: number;
      },
      null
    >;
    listMetadata: FunctionReference<
      "query",
      "public",
      { bucket: string; limit?: number },
      Array<{
        _creationTime: number;
        _id: string;
        bucket: string;
        contentType?: string;
        key: string;
        sha256?: string;
        size?: number;
      }>
    >;
    pageMetadata: FunctionReference<
      "query",
      "public",
      {
        bucket: string;
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          _creationTime: number;
          bucket: string;
          contentType?: string;
          key: string;
          sha256?: string;
          size?: number;
        }>;
        pageStatus?: null | "SplitRecommended" | "SplitRequired";
        splitCursor?: null | string;
      }
    >;
    syncMetadata: FunctionReference<
      "action",
      "public",
      {
        accessKeyId: string;
        bucket: string;
        endpoint: string;
        key: string;
        secretAccessKey: string;
      },
      null
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
