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
      { key: string },
      any
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
      any
    >;
    getMetadata: FunctionReference<"query", "public", { key: string }, any>;
    insertMetadata: FunctionReference<
      "mutation",
      "public",
      {
        bucket: string;
        contentType: string;
        key: string;
        sha256: string;
        size: number;
      },
      any
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
