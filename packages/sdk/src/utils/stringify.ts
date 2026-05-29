export function stringify(obj: any, prefix = ""): string {
  if (obj === null || obj === undefined) {
    return "";
  }

  const pairs: string[] = [];

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const enKey = prefix ? `${prefix}[${encodeURIComponent(key)}]` : encodeURIComponent(key);

    if (value === null || value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const val = value[i];
        if (typeof val === "object" && val !== null) {
          pairs.push(stringify(val, `${enKey}[${i}]`));
        } else if (val !== null && val !== undefined) {
          pairs.push(`${enKey}[${i}]=${encodeURIComponent(val)}`);
        }
      }
    } else if (typeof value === "object") {
      pairs.push(stringify(value, enKey));
    } else {
      pairs.push(`${enKey}=${encodeURIComponent(value)}`);
    }
  }

  return pairs.filter(Boolean).join("&");
}

export function stringifyQuery(obj: any, options?: { addQueryPrefix?: boolean }): string {
  const result = stringify(obj);
  if (options?.addQueryPrefix && result) {
    return `?${result}`;
  }
  return result;
}
