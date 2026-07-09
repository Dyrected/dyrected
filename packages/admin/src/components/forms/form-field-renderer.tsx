import * as React from "react"
import { useWatch } from "react-hook-form"
import type { Control, FieldValues, ControllerRenderProps } from "react-hook-form"
import { useDyrected } from "../../providers/dyrected-context"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { JoinField } from "./fields/join-field"
import { cn } from "../../lib/utils"
import jexl from 'jexl'
import type { Field as FieldSchema } from "@dyrected/sdk"
import { FieldRenderer } from "./field-renderer"
import { BlockBuilder } from "./fields/block-builder"
import { ObjectFieldRenderer } from "./fields/object-field-renderer"
import { ArrayFieldRenderer } from "./fields/array-field-renderer"

import { Input } from "../ui/input"

interface FormFieldRendererProps {
  schema: FieldSchema
  basePath: string
  control: Control<FieldValues>
  collection: string
  documentId?: string
}

/**
 * FormFieldRenderer (Field Orchestrator)
 * 
 * This component handles the high-level logic for a single form field, including:
 * - Field Lifecycle: Manages registration and state via react-hook-form Controller.
 * - Conditional Visibility: Evaluates 'admin.condition' to show/hide fields dynamically.
 * - Layout & Presentation: Renders labels, descriptions, and error states.
 * - Validation: Displays Zod validation errors.
 * 
 * It delegates the actual rendering of the input UI to the FieldRenderer.
 */
export function FormFieldRenderer({ schema, basePath, control, collection, documentId }: FormFieldRendererProps) {
  const { user } = useDyrected()

  const formValues = useWatch({ control })
  const siblingData = useWatch({ control, name: (basePath || undefined) as string }) || {}
  const conditionData = basePath
    ? { ...formValues, ...siblingData, ...(documentId ? { id: documentId } : {}) }
    : { ...formValues, ...(documentId ? { id: documentId } : {}) }

  const condition = schema.admin?.condition
  const readAccess = (schema.access as Record<string, unknown> | undefined)?.read
  const updateAccess = (schema.access as Record<string, unknown> | undefined)?.update
  const createAccess = (schema.access as Record<string, unknown> | undefined)?.create
  // A new document (no id yet) is governed by the field's create rule, falling
  // back to update; an existing document is governed by update.
  const writeAccess = documentId ? updateAccess : (createAccess ?? updateAccess)

  // Memoize compilation of JEXL conditions to avoid parsing overhead on every keystroke
  const compiledCondition = React.useMemo(() => {
    if (typeof condition !== "string") return null
    try {
      const sanitized = condition.replace(/===/g, "==").replace(/!==/g, "!=")
      return { expr: jexl.compile(sanitized), error: null }
    } catch (e: unknown) {
      return { expr: null, error: `Condition compile error: ${(e as Error).message || String(e)}` }
    }
  }, [condition])

  const compiledReadAccess = React.useMemo(() => {
    if (typeof readAccess !== "string") return null
    try {
      return { expr: jexl.compile(readAccess), error: null }
    } catch (e: unknown) {
      return { expr: null, error: `Read access compile error: ${(e as Error).message || String(e)}` }
    }
  }, [readAccess])

  const compiledUpdateAccess = React.useMemo(() => {
    if (typeof writeAccess !== "string") return null
    try {
      return { expr: jexl.compile(writeAccess), error: null }
    } catch (e: unknown) {
      return { expr: null, error: `Update access compile error: ${(e as Error).message || String(e)}` }
    }
  }, [writeAccess])

  if (schema.admin?.hidden) return null

  let isVisible = true
  let jexlError: string | null = null

  if (compiledCondition) {
    if (compiledCondition.error) {
      jexlError = compiledCondition.error
    } else if (compiledCondition.expr) {
      try {
        isVisible = compiledCondition.expr.evalSync(conditionData)
      } catch (e: unknown) {
        jexlError = `Condition eval error: ${(e as Error).message || String(e)}`
      }
    }
  } else if (typeof condition === "function") {
    isVisible = condition(conditionData, siblingData)
  }

  if (!isVisible && !jexlError) return null

  // Evaluate Read Access
  let canRead = true
  if (readAccess === false) {
    canRead = false
  } else if (compiledReadAccess) {
    if (compiledReadAccess.error) {
      jexlError = jexlError ? `${jexlError} | ${compiledReadAccess.error}` : compiledReadAccess.error
    } else if (compiledReadAccess.expr) {
      try {
        canRead = compiledReadAccess.expr.evalSync({ user, ...conditionData })
      } catch (e: unknown) {
        jexlError = jexlError ? `${jexlError} | Read eval error: ${(e as Error).message || String(e)}` : `Read eval error: ${(e as Error).message || String(e)}`
      }
    }
  }

  if (!canRead && !jexlError) return null

  // Evaluate Update/Write Access
  let canUpdate = true
  if (writeAccess === false) {
    canUpdate = false
  } else if (compiledUpdateAccess) {
    if (compiledUpdateAccess.error) {
      jexlError = jexlError ? `${jexlError} | ${compiledUpdateAccess.error}` : compiledUpdateAccess.error
    } else if (compiledUpdateAccess.expr) {
      try {
        canUpdate = compiledUpdateAccess.expr.evalSync({ user, ...conditionData })
      } catch (e: unknown) {
        jexlError = jexlError ? `${jexlError} | Update eval error: ${(e as Error).message || String(e)}` : `Update eval error: ${(e as Error).message || String(e)}`
      }
    }
  }

  const innerContent = (
    <FormFieldRendererInner
      schema={schema}
      basePath={basePath}
      control={control}
      collection={collection}
      canUpdate={canUpdate}
      documentId={documentId}
    />
  )

  if (jexlError) {
    return (
      <div className="dy-space-y-2 dy-border dy-border-destructive/30 dy-bg-destructive/5 dy-p-3 dy-rounded-xl dy-my-2">
        <div className="dy-text-xs dy-font-semibold dy-text-destructive dy-flex dy-items-center dy-gap-2">
          <span>⚠️ JEXL Rule Evaluation Error on field "{schema.label || schema.name}":</span>
          <span className="dy-font-mono dy-text-[11px] dy-bg-destructive/10 dy-px-1.5 dy-py-0.5 dy-rounded">{jexlError}</span>
        </div>
        <div className="dy-opacity-50 dy-pointer-events-none">
          {innerContent}
        </div>
      </div>
    )
  }

  return innerContent
}

function FormFieldRendererInner({
  schema,
  basePath,
  control,
  collection,
  canUpdate,
  documentId,
}: FormFieldRendererProps & { canUpdate: boolean }) {
  const { user, schemas } = useDyrected()

  const formValues = useWatch({ control })
  const siblingData = useWatch({ control, name: (basePath || undefined) as string }) || {}
  const conditionData = basePath ? { ...formValues, ...siblingData } : formValues

  // Password fields should be hidden completely if the user does not have update access
  if (schema.name === "password" && !canUpdate) {
    return null
  }

  const fullPath = basePath ? `${basePath}.${schema.name!}` : schema.name!
  const renderNestedField = (subField: FieldSchema, nextBasePath: string) => (
    <FormFieldRenderer
      schema={subField}
      basePath={nextBasePath}
      control={control}
      collection={collection}
      documentId={documentId}
    />
  )

  if (schema.name === "password" || (schema.type as string) === "password") {
    const isEdit = !!formValues?.id
    const isSelf = user && formValues?.id === user.id
    return (
      <div className="dy-space-y-4 dy-border dy-border-border/40 dy-p-5 dy-rounded-2xl dy-bg-background/40">
        <div className="dy-text-xs dy-font-semibold dy-text-foreground/70 dy-mb-2">
          {isEdit ? "Change Password" : "Password Configuration"}
        </div>
        {isEdit && isSelf && (
          <FormField
            control={control}
            name="oldPassword"
            render={({ field: formField }: { field: ControllerRenderProps<FieldValues, string> }) => (
              <FormItem className="dy-space-y-1.5">
                <FormLabel className="dy-text-xs dy-font-medium dy-text-foreground/70">Current Password</FormLabel>
                <FormControl>
                  <Input type="password" {...formField} value={formField.value ?? ""} placeholder="Enter current password..." autoComplete="current-password" />
                </FormControl>
                <FormMessage className="dy-text-xs dy-font-medium" />
              </FormItem>
            )}
          />
        )}
        <div className="dy-grid dy-grid-cols-1 md:dy-grid-cols-2 dy-gap-4">
          <FormField
            control={control}
            name={fullPath}
            render={({ field: formField }: { field: ControllerRenderProps<FieldValues, string> }) => (
              <FormItem className="dy-space-y-1.5">
                <FormLabel className="dy-text-xs dy-font-medium dy-text-foreground/70">
                  {isEdit ? "New Password" : "Password"}
                  {schema.required && !isEdit && <span className="dy-text-destructive dy-ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input type="password" {...formField} value={formField.value ?? ""} placeholder={isEdit ? "Enter new password..." : "Enter password..."} autoComplete="new-password" />
                </FormControl>
                <FormMessage className="dy-text-xs dy-font-medium" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="confirmPassword"
            render={({ field: formField }: { field: ControllerRenderProps<FieldValues, string> }) => (
              <FormItem className="dy-space-y-1.5">
                <FormLabel className="dy-text-xs dy-font-medium dy-text-foreground/70">
                  {isEdit ? "Confirm New Password" : "Confirm Password"}
                  {schema.required && !isEdit && <span className="dy-text-destructive dy-ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input type="password" {...formField} value={formField.value ?? ""} placeholder="Confirm password..." autoComplete="new-password" />
                </FormControl>
                <FormMessage className="dy-text-xs dy-font-medium" />
              </FormItem>
            )}
          />
        </div>
      </div>
    )
  }

  if ((schema.type as string) === "row") {
    return (
      <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6 dy-items-start">
        {schema.fields?.map((subField, i) => (
          <div
            key={subField.name ?? i}
            className="dy-min-w-0 dy-px-3"
            style={{
              width: subField.admin?.width || "100%",
            }}
          >
            <FormFieldRenderer
              schema={subField}
              basePath={basePath}
              control={control}
              collection={collection}
              documentId={documentId}
            />
          </div>
        ))}
      </div>
    )
  }

  if ((schema.type as string) === "join") {
    return (
      <div className="dy-space-y-3">
        <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2 dy-mb-1">
          <label className="dy-text-sm dy-font-semibold dy-text-foreground/80">
            {schema.label || schema.name?.charAt(0).toUpperCase() + (schema.name?.slice(1) ?? '')}
          </label>
          {schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-italic">{schema.admin.description}</p>
          )}
        </div>
        <JoinField schema={schema} control={control} />
      </div>
    )
  }

  if (schema.type === "object") {
    return <ObjectFieldRenderer schema={schema} basePath={fullPath} control={control} renderField={renderNestedField} />
  }

  if (schema.type === "array") {
    return <ArrayFieldRenderer schema={schema} basePath={fullPath} control={control} renderField={renderNestedField} />
  }

  if (schema.type === "blocks" && schema.blocks) {
    return <BlockBuilder schema={schema} basePath={fullPath} control={control} collection={collection} documentId={documentId} />
  }

  const isBoolean = schema.type === "boolean"
  const isSwitchBoolean = isBoolean && schema.admin?.layout === "switch"
  const hideLabel = schema.admin?.hideLabel === true

  return (
    <FormField
      control={control}
      name={fullPath}
      render={({ field: formField }: { field: ControllerRenderProps<FieldValues, string> }) => (
        <FormItem
          data-dy-field={schema.name}
          className={cn(
            isSwitchBoolean
              ? "dy-flex dy-flex-row dy-items-center dy-justify-between dy-rounded-xl dy-border dy-border-border/40 dy-p-4 dy-bg-background/50 dy-shadow-sm dy-space-y-0"
              : isBoolean
                ? "dy-flex dy-flex-row-reverse dy-items-start dy-justify-end dy-gap-3 dy-space-y-0"
                : hideLabel
                  ? "dy-space-y-0"
                  : "dy-space-y-3"
          )}
        >
          {!hideLabel && (
          <div className={cn(isBoolean ? "dy-space-y-1" : "dy-flex dy-items-center dy-flex-wrap dy-gap-2 dy-mb-1")}>
            <FormLabel className="dy-text-sm dy-font-semibold dy-text-foreground/80 dy-cursor-pointer">
              {schema.label || schema.name!.charAt(0).toUpperCase() + schema.name!.slice(1)}
              {schema.required && <span className="dy-text-destructive dy-ml-1">*</span>}
            </FormLabel>
            {schema.admin?.description && (
              <p className={cn(
                "dy-text-muted-foreground/60 dy-italic",
                isBoolean ? "dy-text-[11px] dy-leading-tight" : "dy-text-[11px] dy-leading-relaxed"
              )}>
                {schema.admin.description}
              </p>
            )}
            {!isBoolean && schema.unique && (
              <span className="dy-inline-flex dy-items-center dy-rounded-full dy-bg-primary/10 dy-px-1.5 dy-py-0.5 dy-text-[10px] dy-font-medium dy-text-primary dy-ring-1 dy-ring-inset dy-ring-primary/10">
                Unique
              </span>
            )}
          </div>
          )}
          <FormControl>
            <FieldRenderer
              schema={schema}
              field={formField}
              collection={collection}
              context={{
                user,
                schemas,
                siblingData: conditionData
              }}
            />
          </FormControl>
          {!isBoolean && schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/70 dy-leading-relaxed dy-italic">{schema.admin.description}</p>
          )}
          <FormMessage className="dy-text-xs dy-font-medium" />
        </FormItem>
      )}
    />
  )
}
