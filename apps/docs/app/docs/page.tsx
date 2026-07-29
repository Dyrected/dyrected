import { redirect } from "next/navigation";
import {
  DOCS_DEFAULT_RUNTIME,
  getRuntimeOverviewUrl,
} from "@/lib/docs-runtime";

export default function LegacyDocsIndexPage() {
  redirect(getRuntimeOverviewUrl(DOCS_DEFAULT_RUNTIME));
}
