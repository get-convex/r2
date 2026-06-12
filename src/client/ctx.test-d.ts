import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { R2 } from "./index.js";

// Regression test for the ctx helper types: runQuery/runMutation on
// query/mutation ctxs gained an extra optional options argument in convex
// 1.41.0 that action ctxs don't have, which broke passing an action ctx to
// store/syncMetadata/deleteObject. Hand-rolling the minimal signature per
// method keeps every ctx variant assignable. Plain assignments (rather than
// expectTypeOf) because they exercise the exact relation used at real call
// sites.
declare const queryCtx: GenericQueryCtx<GenericDataModel>;
declare const mutationCtx: GenericMutationCtx<GenericDataModel>;
declare const actionCtx: GenericActionCtx<GenericDataModel>;

type GetMetadataCtx = Parameters<R2["getMetadata"]>[0];
export const queryCtxReadsMetadata: GetMetadataCtx = queryCtx;
export const mutationCtxReadsMetadata: GetMetadataCtx = mutationCtx;
export const actionCtxReadsMetadata: GetMetadataCtx = actionCtx;

type DeleteObjectCtx = Parameters<R2["deleteObject"]>[0];
export const mutationCtxDeletesObjects: DeleteObjectCtx = mutationCtx;
export const actionCtxDeletesObjects: DeleteObjectCtx = actionCtx;

type StoreCtx = Parameters<R2["store"]>[0];
export const actionCtxStores: StoreCtx = actionCtx;

type SyncMetadataCtx = Parameters<R2["syncMetadata"]>[0];
export const actionCtxSyncsMetadata: SyncMetadataCtx = actionCtx;
