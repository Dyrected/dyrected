import jexl from "jexl"

let sandboxIframe: HTMLIFrameElement | null = null
const messageHandlers = new Map<string, (result: any) => void>()
const SERIALIZED_ADMIN_HOOK_PREFIX = "__dyrected_fn__:"

function initSandbox() {
  if (typeof window === "undefined" || sandboxIframe) return

  sandboxIframe = document.createElement("iframe")
  sandboxIframe.style.display = "none"
  sandboxIframe.setAttribute("sandbox", "allow-scripts")

  const sandboxHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script>
        window.addEventListener('message', async (event) => {
          const { hookId, code, value, siblingData, data } = event.data;
          try {
            const fn = new Function('context', 'const { value, siblingData, data } = context; return (' + code + ')(context);');
            const result = await fn({ value, siblingData, data });
            window.parent.postMessage({ hookId, result }, '*');
          } catch (err) {
            window.parent.postMessage({ hookId, error: err.message }, '*');
          }
        });
      </script>
    </head>
    <body></body>
    </html>
  `

  sandboxIframe.srcdoc = sandboxHtml
  document.body.appendChild(sandboxIframe)

  window.addEventListener("message", (event) => {
    if (!sandboxIframe?.contentWindow || event.source !== sandboxIframe.contentWindow) {
      return
    }

    if (event.data && typeof event.data === "object" && "hookId" in event.data) {
      const { hookId, result, error } = event.data
      const handler = messageHandlers.get(hookId)
      if (handler) {
        handler(error ? undefined : result)
        messageHandlers.delete(hookId)
      }
    }
  })
}

export function runHookSandboxed(
  hookCode: string,
  value: any,
  siblingData: any,
  data: any
): Promise<any> {
  initSandbox()
  const hookId = Math.random().toString(36).substring(7)
  return new Promise((resolve) => {
    messageHandlers.set(hookId, resolve)
    sandboxIframe?.contentWindow?.postMessage(
      { hookId, code: hookCode, value, siblingData, data },
      "*"
    )
  })
}

export function runDeclarativeHookExpression(
  hookCode: string,
  value: any,
  siblingData: any,
  data: any
) {
  return jexl.evalSync(hookCode, { value, siblingData, data })
}

export function isSerializedFunctionHook(hookCode: string) {
  return hookCode.startsWith(SERIALIZED_ADMIN_HOOK_PREFIX)
}

export function stripSerializedFunctionHookPrefix(hookCode: string) {
  return hookCode.startsWith(SERIALIZED_ADMIN_HOOK_PREFIX)
    ? hookCode.slice(SERIALIZED_ADMIN_HOOK_PREFIX.length)
    : hookCode
}
