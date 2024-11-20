import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    key: v.string(),
    author: v.string(),
  }).index("key", ["key"]),
});
