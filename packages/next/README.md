# @dyrected/next

Next.js App Router integration for Dyrected CMS.

```ts
// app/dyrected/[...route]/route.ts
import { dyrectedNextHandler } from "@dyrected/next";
import config from "../../../dyrected.config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } =
  dyrectedNextHandler(config);
```

The handler lazily initializes Dyrected and mounts it at `/dyrected`. Pass
`{ basePath: "/cms" }` as the second argument when using a different route prefix.
