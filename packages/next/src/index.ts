export { dyrectedNextHandler, getDyrectedClient } from "./server.js";
export type { DyrectedNextHandlerOptions } from "./server.js";

export * from "./components/DyrectedMedia.js";
export * from "./components/DyrectedImage.js";

// Re-export React integration layer so Next.js users have one package to import from
export { DyrectedProvider, useDyrected, useLivePreview } from "@dyrected/react";
// Icon and rich-text render components (framework-agnostic — sourced from @dyrected/react)
export { DyrectedIcon, DyrectedRichText } from "@dyrected/react";
export type { DyrectedIconProps, DyrectedRichTextProps } from "@dyrected/react";
// Live-preview click-to-edit helpers
export { Blocks, DyPathProvider, useDyPath } from "@dyrected/react";
export type { BlocksProps, BlocksItem } from "@dyrected/react";
export type { DyrectedImageProps, DyrectedMediaProps } from "@dyrected/react";
export type {
  DyrectedAdminProps,
  AdminComponents,
  AdminSchemas,
  CollectionListSlotProps,
  DashboardSlotProps,
} from "@dyrected/react/admin";

export * from "@dyrected/sdk";
