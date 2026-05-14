import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  prefix: "dy-",
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}

export function getMediaUrl(val: string | any, baseUrl: string) {
  if (!val) return "";
  
  // Handle object with direct URL
  if (typeof val === 'object' && (val.url || val.filename)) {
    const url = val.url || val.filename;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    // If it's just a filename in the object, use proxy
    return `${baseUrl}/media/${val.filename || val.url}`;
  }

  const valueStr = typeof val === 'string' ? val : val.id || val.filename || val.url;
  if (!valueStr) return "";

  if (valueStr.startsWith('http')) return valueStr;
  
  // Check if it's a relative path starting with /
  if (valueStr.startsWith('/')) {
    return `${baseUrl}${valueStr}`;
  }

  // Default fallback to proxy endpoint
  return `${baseUrl}/media/${valueStr}`;
}
