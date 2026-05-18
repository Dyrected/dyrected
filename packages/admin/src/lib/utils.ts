import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  prefix: "dy-",
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}

export function getMediaUrl(val: string | any, baseUrl: string) {
  if (!val) return "";

  const mergeBaseAndPath = (base: string, path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith('/') ? path : '/' + path;

    let isAbsolute = false;
    let origin = '';
    let basePathname = '';

    if (normalizedBase.startsWith('http://') || normalizedBase.startsWith('https://')) {
      isAbsolute = true;
      try {
        const urlObj = new URL(normalizedBase);
        origin = urlObj.origin;
        basePathname = urlObj.pathname;
        if (basePathname.endsWith('/')) basePathname = basePathname.slice(0, -1);
      } catch (e) {
        const firstSlash = normalizedBase.indexOf('/', 8);
        if (firstSlash !== -1) {
          origin = normalizedBase.substring(0, firstSlash);
          basePathname = normalizedBase.substring(firstSlash);
        } else {
          origin = normalizedBase;
          basePathname = '';
        }
      }
    } else {
      basePathname = normalizedBase;
    }

    if (basePathname && basePathname !== '/') {
      const escapedSubpath = basePathname.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('^' + escapedSubpath + '(\\/|$)');
      if (regex.test(normalizedPath)) {
        return isAbsolute ? `${origin}${normalizedPath}` : normalizedPath;
      }
    }

    return `${normalizedBase}${normalizedPath}`;
  };

  // Handle object with direct URL
  if (typeof val === 'object' && (val.url || val.filename)) {
    const url = val.url || val.filename;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return mergeBaseAndPath(baseUrl, url);
    return mergeBaseAndPath(baseUrl, `/media/${val.filename || val.url}`);
  }

  const valueStr = typeof val === 'string' ? val : val.id || val.filename || val.url;
  if (!valueStr) return "";

  if (valueStr.startsWith('http')) return valueStr;

  if (valueStr.startsWith('/')) {
    return mergeBaseAndPath(baseUrl, valueStr);
  }

  return mergeBaseAndPath(baseUrl, `/media/${valueStr}`);
}

