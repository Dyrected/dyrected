import type { NextConfig } from "next";
import { withDyrected } from "@dyrected/next/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withDyrected(
  nextConfig as unknown as Parameters<typeof withDyrected>[0],
) as unknown as NextConfig;
