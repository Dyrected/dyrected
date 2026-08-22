/**
 * Formats resolved metric values for display in stat cards.
 */
export function formatMetricValue(
  value: number | null | undefined,
  format: string | undefined,
  currency: string | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"

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
