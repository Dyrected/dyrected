/// <reference types="react" />
/// <reference types="react-dom" />

declare module "react-dom/client" {
  export * from "react-dom/client";
  export function createRoot(container: HTMLElement): {
    render: (element: React.ReactNode) => void;
    unmount: () => void;
  };
}
