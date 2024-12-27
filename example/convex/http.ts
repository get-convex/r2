import { R2 } from "@convex-dev/r2";
import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";

const http = httpRouter();

const r2 = new R2(components.r2);

r2.registerRoutes(http, {
  onSend: internal.example.httpSendImage,
});

export default http;
