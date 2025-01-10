import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    key: v.string(),
    sha256: v.string(),
    contentType: v.string(),
    size: v.number(),
    bucket: v.string(),
  }).index("key", ["key"]),
});
