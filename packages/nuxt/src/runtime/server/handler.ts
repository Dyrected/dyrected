import { eventHandler, toRequest } from "h3";
import { createDyrectedApp } from "@dyrected/core";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

let app: any;

export default eventHandler(async (event) => {
  if (!app) {
    const config = useRuntimeConfig().dyrected;
    app = createDyrectedApp(config);
  }

  return app.fetch(toRequest(event.req));
});
