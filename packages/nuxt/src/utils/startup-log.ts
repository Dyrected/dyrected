/**
 * The lines printed when the dev server starts: where the admin and the API live.
 *
 * @param serverUrl - URL the dev server is listening on.
 * @param options - `adminPath` (default `cms`) and `apiBase` (default `/dyrected`) from the module options.
 */
export function formatStartupLines(
  serverUrl: string,
  options: { adminPath?: string; apiBase?: string },
): string[] {
  const base = serverUrl.replace(/\/$/, "");
  const adminSlug = options.adminPath || "cms";
  const apiSlug = options.apiBase || "/dyrected";
  const apiUrl = apiSlug.startsWith("http") ? apiSlug : `${base}${apiSlug}`;
  return [`\n  ➜  Dyrected admin:  ${base}/${adminSlug}`, `  ➜  Dyrected API:    ${apiUrl}\n`];
}
