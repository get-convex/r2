import { createApp } from "vue";
import { createConvexVue } from "@convex-vue/core";
import App from "./App.vue";

const app = createApp(App);
app.use(
  createConvexVue({ convexUrl: import.meta.env.VITE_CONVEX_URL as string }),
);
app.mount("#app");
