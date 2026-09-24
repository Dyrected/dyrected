/**
 * Formats resolved metric values for display in stat cards.
 */
export function formatMetricValue(
  value: number | string | null | undefined,
  format: string | undefined,
  currency: string | undefined,
): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number" && Number.isNaN(value)) return "—"

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      }
    }
    const num = Number(value)
    if (!isNaN(num) && value.trim() !== "") {
      value = num
    } else {
      return value
    }
  }

  switch (format) {
    case "currency": {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency || "USD",
          maximumFractionDigits: 2,
        }).format(value)
      } catch {
        // Unknown currency code — fall back to a plain numeric format.
        return `${currency ?? ""}${formatNumberValue(value)}`.trim()
      }
    }
    case "percent":
      return `${formatNumberValue(value)}%`
    default:
      return formatNumberValue(value)
  }
}

function formatNumberValue(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(rounded)
}
