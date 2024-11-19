import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    storageId: v.string(),
    author: v.string(),
  }).index("storageId", ["storageId"]),
});
