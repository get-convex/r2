import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({ key: v.string(), bucket: v.string(), caption: v.optional(v.string()) })
    .index("bucket_key", ["bucket", "key"]),
});
