import * as React from "react"
import Papa from "papaparse"
import { useQueryClient } from "@tanstack/react-query"
import {
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Download,
  AlertTriangle
} from "lucide-react"
import { useDyrected } from "../../providers/dyrected-context"
import type { CollectionConfig, Field } from "@dyrected/core"
import { Button } from "./button"
import { Progress } from "./progress"
import { Badge } from "./badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./select"
import { ScrollArea } from "./scroll-area"
import { cn } from "../../lib/utils"

interface CsvImporterProps {
  slug: string
  schema: CollectionConfig
  onClose: () => void
}

type Step = "upload" | "map" | "preview" | "importing" | "complete"

interface Mapping {
  [csvHeader: string]: string // Maps CSV Header -> Schema Field Name (or "" to ignore)
}

interface ValidationResult {
  rowNumber: number
  data: Record<string, unknown>
  errors: Record<string, string>
  isValid: boolean
}

export function CsvImporter({ slug, schema, onClose }: CsvImporterProps) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  const [step, setStep] = React.useState<Step>("upload")
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([])
  const [parsedRows, setParsedRows] = React.useState<Record<string, string>[]>([])
  const [mapping, setMapping] = React.useState<Mapping>({})
  const [validatedData, setValidatedData] = React.useState<ValidationResult[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [confirmedSkip, setConfirmedSkip] = React.useState(false)

  // Progress state
  const [totalRows, setTotalRows] = React.useState(0)
  const [processedCount, setProcessedCount] = React.useState(0)
  const [successCount, setSuccessCount] = React.useState(0)
  const [failedRows, setFailedRows] = React.useState<{ row: number; data: unknown; error: string }[]>([])
  const [retryableRows, setRetryableRows] = React.useState<ValidationResult[]>([])

  const importableFields = React.useMemo(() => {
    return schema.fields.filter(
      (f: Field) =>
        f.name !== "id" &&
        f.name !== "createdAt" &&
        f.name !== "updatedAt" &&
        f.type !== "row" &&
        f.type !== "join" &&
        !f.admin?.hidden
    )
  }, [schema])

  const requiredFields = React.useMemo(() => {
    return importableFields.filter((f) => f.required)
  }, [importableFields])

  // Step 1: Handle File Selection
  const processFile = (file: File) => {
    setFileError(null)
    const isCSV = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
    if (!isCSV) {
      setFileError(`Unsupported file type: "${file.name}". Please upload a CSV file.`)
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, string>[]

        if (rows.length === 0) {
          setFileError("This CSV file has no importable rows. Please upload a file with at least one data row.")
          return
        }

        setCsvHeaders(headers)
        setParsedRows(rows)

        const initialMapping: Mapping = {}
        headers.forEach((header) => {
          const match = importableFields.find(
            (f) =>
              f.name?.toLowerCase() === header.toLowerCase() ||
              (f as { label?: string }).label?.toLowerCase() === header.toLowerCase()
          )
          initialMapping[header] = match?.name ?? "__ignore__"
        })
        setMapping(initialMapping)
        setStep("map")
      },
      error: (error) => {
        setFileError(`Failed to parse CSV: ${error.message}`)
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
    e.target.value = ""
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // Step 2: Mapping Configuration
  const handleMapChange = (header: string, fieldName: string) => {
    setMapping((prev) => ({ ...prev, [header]: fieldName }))
  }

  const isMapValid = React.useMemo(() => {
    // Every required field must be mapped to at least one CSV header
    const mappedFields = Object.values(mapping)
    return requiredFields.every((f) => mappedFields.includes(f.name))
  }, [requiredFields, mapping])

  // Coerce and validate single value helper
  const coerceAndValidate = (val: unknown, field: Field): { value: unknown; error?: string } => {
    if (val === undefined || val === null || String(val).trim() === "") {
      if (field.required) {
        return { value: null, error: `${(field as { label?: string }).label || field.name} is required` }
      }
      return { value: null }
    }

    const strVal = String(val).trim()

    switch (field.type) {
      case "number": {
        const num = Number(strVal.replace(/[$€£¥₹₦₩₪₺₽฿,]/g, ""))
        if (isNaN(num)) return { value: null, error: "Must be a valid number" }
        return { value: num }
      }
      case "boolean": {
        const lower = strVal.toLowerCase()
        if (lower === "true" || lower === "yes" || lower === "1") return { value: true }
        if (lower === "false" || lower === "no" || lower === "0") return { value: false }
        return { value: null, error: "Must be a boolean (true/false, yes/no, 1/0)" }
      }
      case "date":
      case "datetime": {
        const date = new Date(strVal)
        if (isNaN(date.getTime())) return { value: null, error: "Must be a valid date" }
        return { value: date.toISOString() }
      }
      case "image": {
        try {
          new URL(strVal)
          return { value: strVal }
        } catch {
          return { value: null, error: "Must be a valid image URL" }
        }
      }
      case "url": {
        try {
          new URL(strVal)
          return { value: { type: "custom", url: strVal, label: "" } }
        } catch {
          return { value: null, error: "Must be a valid URL (e.g. https://example.com)" }
        }
      }
      case "select":
      case "radio": {
        if (field.options && Array.isArray(field.options) && field.options.length > 0) {
          const found = field.options.find((opt: unknown) => {
            const optVal = typeof opt === "string" ? opt : (opt as { value: unknown }).value
            return String(optVal).toLowerCase() === strVal.toLowerCase()
          })
          if (!found) {
            return {
              value: null,
              error: `Must be one of: ${field.options
                .map((opt: unknown) => (typeof opt === "string" ? opt : (opt as { label?: string; value: unknown }).label || (opt as { value: unknown }).value))
                .join(", ")}`
            }
          }
          return { value: typeof found === "string" ? found : (found as { value: unknown }).value }
        }
        return { value: strVal }
      }
      default:
        return { value: strVal }
    }
  }

  // Run validation on all rows
  const handleProceedToPreview = () => {
    const results: ValidationResult[] = parsedRows.map((row, idx) => {
      const coercedRow: Record<string, unknown> = {}
      const errors: Record<string, string> = {}
      let isValid = true

      // Apply mapping
      Object.entries(mapping).forEach(([csvHeader, targetField]) => {
        if (!targetField || targetField === "__ignore__") return
        const fieldSchema = importableFields.find((f) => f.name === targetField)
        if (!fieldSchema) return

        const rawValue = row[csvHeader]
        const { value, error } = coerceAndValidate(rawValue, fieldSchema)

        if (error) {
          errors[targetField] = error
          isValid = false
        } else {
          coercedRow[targetField] = value
        }
      })

      // Check required fields that were ignored/unmapped completely
      requiredFields.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(coercedRow, field.name) || coercedRow[field.name] === null) {
          errors[field.name] = `${(field as { label?: string }).label || field.name} is required`
          isValid = false
        }
      })

      return {
        rowNumber: idx + 1,
        data: coercedRow,
        errors,
        isValid
      }
    })

    setValidatedData(results)
    setConfirmedSkip(false)
    setStep("preview")
  }

  // Step 3: Trigger batch/sequential import
  const startImport = async (rows = validatedData) => {
    setStep("importing")
    setTotalRows(rows.length)
    setProcessedCount(0)
    setSuccessCount(0)
    setFailedRows([])
    setRetryableRows([])

    let success = 0
    const failures: typeof failedRows = []
    const apiFailures: ValidationResult[] = []

    // Sequential loop through rows
    for (let i = 0; i < rows.length; i++) {
      const rowResult = rows[i]
      setProcessedCount(i + 1)

      if (!rowResult.isValid) {
        failures.push({
          row: rowResult.rowNumber,
          data: rowResult.data,
          error: `Validation error: ${Object.values(rowResult.errors).join(", ")}`
        })
        setFailedRows([...failures])
        continue
      }

      try {
        const data = { ...rowResult.data }

        for (const field of importableFields) {
          if (field.type !== "image") continue
          const url = data[field.name]
          if (!url || typeof url !== "string") continue
          const mediaCollection = (field as { relationTo?: string }).relationTo || "media"
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Failed to fetch image: ${url}`)
          const blob = await response.blob()
          const filename = url.split("/").pop()?.split("?")[0] || "image"
          const file = new File([blob], filename, { type: blob.type })
          const media = await client!.collection(mediaCollection).upload(file)
          data[field.name] = media.id
        }

        await client!.collection(slug).create(data)
        success++
        setSuccessCount(success)
      } catch (error: unknown) {
        const message = (error as Error).message || "Failed to create entry"
        failures.push({ row: rowResult.rowNumber, data: rowResult.data, error: message })
        setFailedRows([...failures])
        apiFailures.push(rowResult)
      }
    }

    setRetryableRows(apiFailures)
    queryClient.invalidateQueries({ queryKey: ["collection", slug] })
    setStep("complete")
  }

  const handleRetryFailed = () => {
    setValidatedData(retryableRows)
    startImport(retryableRows)
  }

  // Download Failed Rows CSV helper
  const downloadFailedCsv = () => {
    if (failedRows.length === 0) return

    // Convert back to CSV rows containing original data and validation error
    const headers = [...csvHeaders, "Import Error"]
    const rows = failedRows.map((f) => {
      const origRow = parsedRows[f.row - 1]
      return {
        ...origRow,
        "Import Error": f.error
      }
    })

    const csvContent = Papa.unparse({ fields: headers, data: rows })
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${slug}_failed_imports.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewRows = React.useMemo(() => {
    return validatedData.slice(0, 100)
  }, [validatedData])

  const totalErrors = React.useMemo(() => {
    return validatedData.filter((r) => !r.isValid).length
  }, [validatedData])

  return (
    <div className="dy-space-y-6">
      {/* STEP 1: UPLOAD */}
      {step === "upload" && (
        <div className="dy-space-y-4">
          <div
            className={cn(
              "dy-text-center dy-py-10 dy-border-2 dy-border-dashed dy-rounded-xl dy-transition-colors",
              isDragging
                ? "dy-border-primary dy-bg-primary/5"
                : "dy-border-border hover:dy-bg-muted/30"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className="dy-cursor-pointer dy-block dy-space-y-4 dy-px-6">
              <Upload className={cn("dy-h-10 dy-w-10 dy-mx-auto", isDragging ? "dy-text-primary" : "dy-text-muted-foreground")} />
              <div className="dy-space-y-1">
                <p className="dy-text-sm dy-font-semibold">Click to upload or drag & drop</p>
                <p className="dy-text-xs dy-text-muted-foreground">CSV files only</p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="dy-hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
          {fileError && (
            <div className="dy-flex dy-items-center dy-gap-2 dy-p-3 dy-rounded-lg dy-bg-destructive/10 dy-border dy-border-destructive/20 dy-text-destructive dy-text-sm">
              <AlertCircle className="dy-h-4 dy-w-4 dy-shrink-0" />
              {fileError}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAP FIELDS */}
      {step === "map" && (
        <div className="dy-space-y-4">
          <div className="dy-p-4 dy-bg-muted/40 dy-border dy-border-border dy-rounded-xl dy-text-sm dy-text-muted-foreground">
            Map the columns in your CSV file to the corresponding fields of the collection. All required fields must be mapped to proceed.
          </div>

          <div className="dy-h-[300px] dy-overflow-y-auto dy-border dy-border-border dy-rounded-xl">
            <div className="dy-divide-y dy-divide-border">
              {csvHeaders.map((header) => {
                const mappedVal = mapping[header] ?? "__ignore__"
                return (
                  <div key={header} className="dy-flex dy-items-center dy-justify-between dy-p-3.5">
                    <div className="dy-space-y-1 dy-flex-1 dy-pr-4">
                      <p className="dy-text-sm dy-font-semibold dy-text-foreground">{header}</p>
                      {parsedRows[0] && (
                        <p className="dy-text-xs dy-text-muted-foreground dy-truncate">
                          Sample: {parsedRows[0][header]}
                        </p>
                      )}
                    </div>
                    <div className="dy-w-[200px]">
                      <Select
                        value={mappedVal}
                        onValueChange={(val) => handleMapChange(header, val)}
                      >
                        <SelectTrigger className="dy-w-full">
                          <SelectValue placeholder="Ignore field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ignore__">Ignore field</SelectItem>
                          {importableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.required ? "* " : ""}
                              {(field as { label?: string }).label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {requiredFields.length > 0 && (
            <div className="dy-space-y-2">
              <p className="dy-text-xs dy-font-semibold dy-text-muted-foreground">Required Fields:</p>
              <div className="dy-flex dy-flex-wrap dy-gap-2">
                {requiredFields.map((f) => {
                  const isMapped = Object.values(mapping).includes(f.name)
                  return (
                    <Badge
                      key={f.name}
                      variant={isMapped ? "secondary" : "destructive"}
                      className="dy-rounded-md"
                    >
                      {isMapped ? "✓ " : "✗ "}
                      {(f as { label?: string }).label || f.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          <div className="dy-flex dy-justify-between dy-pt-4">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button onClick={handleProceedToPreview} disabled={!isMapValid}>
              Preview Validation <ArrowRight className="dy-h-4 dy-w-4 dy-ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATION */}
      {step === "preview" && (
        <div className="dy-space-y-4">
          <div className="dy-flex dy-items-center dy-justify-between">
            <div className="dy-space-y-1">
              <h3 className="dy-text-sm dy-font-semibold">Validation Preview</h3>
              <p className="dy-text-xs dy-text-muted-foreground">
                Showing the first 100 rows. {totalErrors > 0 ? `${totalErrors} rows have errors and will be skipped.` : "All rows are valid."}
              </p>
            </div>
            {totalErrors > 0 && (
              <Badge variant="destructive" className="dy-rounded-md dy-gap-1.5">
                <AlertTriangle className="dy-h-3.5 dy-w-3.5" /> {totalErrors} Invalid
              </Badge>
            )}
          </div>

          <div className="dy-overflow-x-auto dy-overflow-y-auto dy-max-h-[60vh] dy-border dy-border-border dy-rounded-xl">
            <table className="dy-min-w-max dy-w-full dy-text-left dy-border-collapse">
              <thead className="dy-sticky dy-top-0 dy-z-10">
                <tr className="dy-border-b dy-border-border dy-bg-muted/40 dy-text-xs dy-font-semibold dy-text-muted-foreground">
                  <th className="dy-p-3 dy-w-16">Row</th>
                  {importableFields
                    .filter((f) => Object.values(mapping).includes(f.name))
                    .map((f) => (
                      <th key={f.name} className="dy-p-3">
                        {(f as { label?: string }).label || f.name}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="dy-text-sm">
                {previewRows.map((rowResult) => (
                  <tr
                    key={rowResult.rowNumber}
                    className="dy-border-b dy-border-border hover:dy-bg-muted/20"
                  >
                    <td className="dy-p-3 dy-font-medium dy-text-muted-foreground">
                      {rowResult.rowNumber}
                    </td>
                    {importableFields
                      .filter((f) => Object.values(mapping).includes(f.name))
                      .map((f) => {
                        const val = rowResult.data[f.name]
                        const error = rowResult.errors[f.name]
                        return (
                          <td key={f.name} className="dy-p-3">
                            {error ? (
                              <span className="dy-flex dy-items-center dy-gap-1.5 dy-text-destructive dy-font-medium">
                                <AlertCircle className="dy-h-3.5 dy-w-3.5" />
                                {error}
                              </span>
                            ) : (
                              String(val ?? "")
                            )}
                          </td>
                        )
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalErrors > 0 && totalErrors < validatedData.length && (
            <label className="dy-flex dy-items-start dy-gap-3 dy-p-3 dy-rounded-lg dy-border dy-border-amber-300/60 dy-bg-amber-500/10 dy-cursor-pointer">
              <input
                type="checkbox"
                className="dy-mt-0.5 dy-accent-amber-500"
                checked={confirmedSkip}
                onChange={(e) => setConfirmedSkip(e.target.checked)}
              />
              <span className="dy-text-xs dy-text-amber-700 dark:dy-text-amber-400">
                I understand that <strong>{totalErrors} row{totalErrors !== 1 ? "s" : ""}</strong> with validation errors will be skipped. Only the {validatedData.length - totalErrors} valid row{validatedData.length - totalErrors !== 1 ? "s" : ""} will be imported.
              </span>
            </label>
          )}

          {totalErrors === validatedData.length && (
            <div className="dy-flex dy-items-center dy-gap-2 dy-p-3 dy-rounded-lg dy-bg-destructive/10 dy-border dy-border-destructive/20 dy-text-destructive dy-text-sm">
              <AlertCircle className="dy-h-4 dy-w-4 dy-shrink-0" />
              All {totalErrors} rows have validation errors. Fix your CSV and re-upload before importing.
            </div>
          )}

          <div className="dy-flex dy-justify-between dy-pt-4">
            <Button variant="outline" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button
              onClick={() => startImport()}
              variant="default"
              className="dy-gap-2"
              disabled={totalErrors === validatedData.length || (totalErrors > 0 && !confirmedSkip)}
            >
              <Play className="dy-h-4 dy-w-4" /> Start Import ({validatedData.length - totalErrors} Row{validatedData.length - totalErrors !== 1 ? "s" : ""})
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING */}
      {step === "importing" && (
        <div className="dy-space-y-6 dy-py-6">
          <div className="dy-space-y-2">
            <div className="dy-flex dy-items-center dy-justify-between dy-text-sm dy-font-semibold">
              <span>Importing rows...</span>
              <span>
                {processedCount} / {totalRows}
              </span>
            </div>
            <Progress value={(processedCount / totalRows) * 100} className="dy-h-2" />
          </div>
          <div className="dy-grid dy-grid-cols-2 dy-gap-4">
            <div className="dy-p-4 dy-bg-muted/30 dy-border dy-border-border dy-rounded-xl dy-text-center">
              <p className="dy-text-2xl dy-font-bold dy-text-primary">{successCount}</p>
              <p className="dy-text-xs dy-text-muted-foreground">Successful</p>
            </div>
            <div className="dy-p-4 dy-bg-muted/30 dy-border dy-border-border dy-rounded-xl dy-text-center">
              <p className="dy-text-2xl dy-font-bold dy-text-destructive">{failedRows.length}</p>
              <p className="dy-text-xs dy-text-muted-foreground">Failed/Skipped</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: COMPLETE SUMMARY */}
      {step === "complete" && (
        <div className="dy-space-y-6">
          <div className="dy-flex dy-flex-col dy-items-center dy-text-center dy-space-y-3 dy-py-6">
            <CheckCircle2 className="dy-h-12 dy-w-12 dy-text-green-500" />
            <h3 className="dy-text-lg dy-font-semibold">Import Process Completed</h3>
            <p className="dy-text-sm dy-text-muted-foreground dy-max-w-md">
              Successfully imported {successCount} rows. {failedRows.length} rows failed or were skipped due to validation/server errors.
            </p>
          </div>

          {failedRows.length > 0 && (
            <div className="dy-space-y-3">
              <div className="dy-flex dy-items-center dy-justify-between">
                <p className="dy-text-xs dy-font-bold dy-text-destructive uppercase tracking-wide">
                  Failure Logs ({failedRows.length} rows)
                </p>
                <div className="dy-flex dy-items-center dy-gap-2">
                  {retryableRows.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="dy-h-8 dy-text-xs dy-gap-1.5"
                      onClick={handleRetryFailed}
                    >
                      <RotateCcw className="dy-h-3.5 dy-w-3.5" /> Retry {retryableRows.length} Failed Row{retryableRows.length !== 1 ? "s" : ""}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="dy-h-8 dy-text-xs dy-gap-1.5"
                    onClick={downloadFailedCsv}
                  >
                    <Download className="dy-h-3.5 dy-w-3.5" /> Download Errors CSV
                  </Button>
                </div>
              </div>

              <ScrollArea className="dy-h-[180px] dy-border dy-border-border dy-rounded-xl">
                <div className="dy-divide-y dy-divide-border">
                  {failedRows.map((f, idx) => (
                    <div key={idx} className="dy-flex dy-items-start dy-gap-3 dy-p-3 dy-text-xs">
                      <Badge variant="destructive" className="dy-rounded dy-shrink-0">
                        Row {f.row}
                      </Badge>
                      <p className="dy-text-muted-foreground font-medium dy-pt-0.5">{f.error}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="dy-flex dy-justify-end dy-gap-2 dy-pt-4">
            <Button
              variant="outline"
              className="dy-gap-2"
              onClick={() => {
                setCsvHeaders([])
                setParsedRows([])
                setMapping({})
                setValidatedData([])
                setFailedRows([])
                setStep("upload")
              }}
            >
              <RotateCcw className="dy-h-4 dy-w-4" /> Import Another File
            </Button>
            <Button onClick={onClose}>Close Importer</Button>
          </div>
        </div>
      )}
    </div>
  )
}
