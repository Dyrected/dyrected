import { dyrectedNextHandler } from "@dyrected/next/server";
import config from "../../../../dyrected.config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = dyrectedNextHandler(config);
