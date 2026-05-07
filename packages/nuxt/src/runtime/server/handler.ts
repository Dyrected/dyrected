import { eventHandler, toRequest } from "h3";
import { createDyrectedApp } from "@dyrected/core";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

export default eventHandler(async (event) => {
  const config = useRuntimeConfig().dyrected;
  const app = createDyrectedApp(config);

  return app.fetch(toRequest(event.req));
});
