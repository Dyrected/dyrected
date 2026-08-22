/**
 * Filter operator definitions ported from tablecn's data-table configuration
 * (src/config/data-table.ts), scoped to the variants operational views use.
 */
export interface FilterOperatorOption {
  label: string
  value: string
}

export const TEXT_OPERATORS: FilterOperatorOption[] = [
  { label: "Contains", value: "iLike" },
  { label: "Does not contain", value: "notILike" },
  { label: "Is", value: "eq" },
  { label: "Is not", value: "ne" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
]

export const NUMERIC_OPERATORS: FilterOperatorOption[] = [
  { label: "Is", value: "eq" },
  { label: "Is not", value: "ne" },
  { label: "Is less than", value: "lt" },
  { label: "Is less than or equal to", value: "lte" },
  { label: "Is greater than", value: "gt" },
  { label: "Is greater than or equal to", value: "gte" },
  { label: "Is between", value: "isBetween" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
]

export const DATE_OPERATORS: FilterOperatorOption[] = [
  { label: "Is", value: "eq" },
  { label: "Is not", value: "ne" },
  { label: "Is before", value: "lt" },
  { label: "Is after", value: "gt" },
  { label: "Is between", value: "isBetween" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
]

export function getFilterOperators(variant: string): FilterOperatorOption[] {
  switch (variant) {
    case "number":
      return NUMERIC_OPERATORS
    case "date":
      return DATE_OPERATORS
    default:
      return TEXT_OPERATORS
  }
}

export function getDefaultFilterOperator(variant: string): string {
  return getFilterOperators(variant)[0]?.value ?? "iLike"
}
