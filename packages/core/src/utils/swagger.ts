/**
 * Returns a standalone HTML string for Swagger UI loading from a CDN.
 *
 * @param specUrl - Explicit URL to the OpenAPI JSON. When omitted, the spec is
 *   resolved **at runtime, relative to the docs page** (`/api/docs` →
 *   `/api/openapi.json`). This preserves any mount prefix the app is served
 *   under (e.g. a Nuxt `apiBase: "/dyrected"` serving `/dyrected/api/docs`),
 *   which an absolute `/api/openapi.json` would drop.
 */
export function getSwaggerHtml(specUrl?: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>Dyrected API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
<script>
  window.onload = () => {
    // Forward the apikey query param when loading the spec and making API calls
    const params = new URLSearchParams(window.location.search);
    const apiKey = params.get('apikey');
    // Resolve the spec relative to this docs page so any mount prefix
    // (e.g. "/dyrected/api/docs") is preserved. Falls back to an explicit URL
    // when one is supplied by the caller.
    const explicitSpecUrl = ${JSON.stringify(specUrl ?? '')};
    const specUrl = explicitSpecUrl || (window.location.pathname.replace(/\\/docs\\/?$/, '') + '/openapi.json');
    const specUrlWithKey = apiKey ? specUrl + '?apikey=' + encodeURIComponent(apiKey) : specUrl;

    window.ui = SwaggerUIBundle({
      url: specUrlWithKey,
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout",
      deepLinking: true,
      showExtensions: true,
      showCommonExtensions: true,
      // Inject x-api-key header on every request made from the Swagger UI
      requestInterceptor: (request) => {
        if (apiKey) {
          request.headers['x-api-key'] = apiKey;
        }
        return request;
      }
    });
  };
</script>
</body>
</html>
  `;
}

