import * as React from "react"
import { Filter, Plus, Trash2 } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Badge } from "./badge"
import type { CollectionConfig, Field } from "@dyrected/core"
import type { FilterRule } from "../../lib/filter-rules"

interface FilterBuilderProps {
  schema: CollectionConfig; // Collection schema
  rules: FilterRule[];
  onChange: (rules: FilterRule[]) => void;
}

const NEVER_FILTERABLE = ['password', 'richText', 'json', 'file', 'image', 'join', 'collapsible', 'row', 'group', 'array', 'blocks'];

const OPERATORS_BY_TYPE: Record<string, string[]> = {
  text: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  textarea: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  email: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  url: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  slug: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  code: ['equals', 'not_equals', 'contains', 'starts_with', 'exists'],
  number: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'exists'],
  date: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'exists'],
  datetime: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'exists'],
  boolean: ['equals', 'exists'],
  select: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
  radio: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
  multiSelect: ['in', 'not_in', 'exists'],
  relationship: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
  color: ['equals', 'not_equals', 'exists']
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  starts_with: 'Starts with',
  gt: 'Greater than',
  gte: 'Greater than or equals',
  lt: 'Less than',
  lte: 'Less than or equals',
  in: 'In list',
  not_in: 'Not in list',
  exists: 'Exists',
};

export function FilterBuilder({ schema, rules, onChange }: FilterBuilderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftRules, setDraftRules] = React.useState<FilterRule[]>(rules);

  // Determine which fields are filterable
  const filterableFields = React.useMemo(() => {
    if (!schema?.fields) return [];
    return schema.fields.filter((f: Field) => {
      if (NEVER_FILTERABLE.includes(f.type)) return false;
      if (f.admin?.filterable === false) return false;
      return true;
    });
  }, [schema]);

  React.useEffect(() => {
    if (!isOpen) {
      setDraftRules(rules);
    }
  }, [isOpen, rules]);

  const getDefaultValue = (field: Field | undefined, operator: FilterRule['operator']): unknown => {
    if (operator === 'exists') return true;
    if (field?.type === 'boolean') return true;
    return '';
  };

  const handleAddRule = () => {
    if (filterableFields.length === 0) return;
    const firstField = filterableFields[0];
    if (!firstField?.name) return;

    const operators = OPERATORS_BY_TYPE[firstField.type] || OPERATORS_BY_TYPE.text;
    const operator = operators[0] as FilterRule['operator'];
    setDraftRules([
      ...draftRules,
      { field: firstField.name, operator, value: getDefaultValue(firstField, operator) }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...draftRules];
    newRules.splice(index, 1);
    setDraftRules(newRules);
  };

  const handleUpdateRule = (index: number, key: keyof FilterRule, val: string | boolean) => {
    const newRules = [...draftRules];
    if (!newRules[index]) return;

    const rule = { ...newRules[index], [key]: val };

    // Reset operator and value if field changes
    if (key === 'field') {
      const fieldDef = filterableFields.find((f: Field) => f.name === val);
      if (fieldDef) {
        const operators = OPERATORS_BY_TYPE[fieldDef.type] || OPERATORS_BY_TYPE.text;
        rule.operator = operators[0] as FilterRule['operator'];
        rule.value = getDefaultValue(fieldDef, rule.operator);
      }
    }

    // Reset value if operator changes to exists
    if (key === 'operator' && val === 'exists') {
      rule.value = true;
    }

    newRules[index] = rule;
    setDraftRules(newRules);
  };

  const handleClearDraft = () => {
    setDraftRules([]);
  };

  const handleApply = () => {
    onChange(draftRules);
    setIsOpen(false);
  };

  if (schema?.admin?.filterable === false) {
    return null; // Opted out entirely
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="dy-h-8 dy-gap-2">
          <Filter className="dy-h-4 dy-w-4" />
          Filter
          {rules.length > 0 && (
            <Badge variant="secondary" className="dy-ml-1 dy-h-5 dy-px-1.5 dy-text-[10px]">
              {rules.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="dy-w-[min(640px,calc(100vw-2rem))] dy-p-0">
        <div className="dy-flex dy-max-h-[min(620px,calc(100vh-6rem))] dy-flex-col">
          <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-px-5 dy-py-4">
            <div>
              <h4 className="dy-text-sm dy-font-medium">Filters</h4>
              <p className="dy-mt-1 dy-text-xs dy-text-muted-foreground">Build rules, then apply them to the list.</p>
            </div>
            {draftRules.length > 0 && (
              <Button variant="ghost" size="sm" className="dy-h-8 dy-text-xs dy-text-muted-foreground" onClick={handleClearDraft}>
                Clear all
              </Button>
            )}
          </div>

          <div className="dy-flex-1 dy-space-y-4 dy-overflow-y-auto dy-p-5">
            {draftRules.length === 0 ? (
              <div className="dy-rounded-md dy-border dy-border-dashed dy-bg-muted/20 dy-px-4 dy-py-6">
                <p className="dy-text-sm dy-text-muted-foreground">No active filters.</p>
              </div>
            ) : (
              draftRules.map((rule, i) => {
                const fieldDef = filterableFields.find((f: Field) => f.name === rule.field);
                const operators = fieldDef ? (OPERATORS_BY_TYPE[fieldDef.type] || OPERATORS_BY_TYPE.text) : OPERATORS_BY_TYPE.text;

                return (
                  <div key={i} className="dy-grid dy-grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2rem] dy-items-start dy-gap-3">
                    <Select value={rule.field} onValueChange={(val) => handleUpdateRule(i, 'field', val)}>
                      <SelectTrigger className="dy-h-9 dy-text-xs">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterableFields.map((f: Field) => (
                          <SelectItem key={f.name} value={f.name} className="dy-text-xs">
                            {f.label || f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={rule.operator} onValueChange={(val) => handleUpdateRule(i, 'operator', val)}>
                      <SelectTrigger className="dy-h-9 dy-text-xs">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op} value={op} className="dy-text-xs">
                            {OPERATOR_LABELS[op] || op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="dy-flex-1">
                      {rule.operator === 'exists' ? (
                        <Select value={String(rule.value)} onValueChange={(val) => handleUpdateRule(i, 'value', val === 'true')}>
                          <SelectTrigger className="dy-h-9 dy-text-xs">
                            <SelectValue placeholder="Value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="dy-text-xs">Is not empty</SelectItem>
                            <SelectItem value="false" className="dy-text-xs">Is empty</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : fieldDef?.type === 'boolean' ? (
                        <Select value={String(rule.value)} onValueChange={(val) => handleUpdateRule(i, 'value', val === 'true')}>
                          <SelectTrigger className="dy-h-9 dy-text-xs">
                            <SelectValue placeholder="Value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="dy-text-xs">True</SelectItem>
                            <SelectItem value="false" className="dy-text-xs">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="dy-h-9 dy-text-xs"
                          placeholder="Value..."
                          value={(rule.value as string | number) || ''}
                          onChange={(e) => handleUpdateRule(i, 'value', e.target.value)}
                          type={fieldDef?.type === 'number' ? 'number' : fieldDef?.type === 'date' || fieldDef?.type === 'datetime' ? fieldDef.type : 'text'}
                        />
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="dy-h-9 dy-w-8 dy-text-muted-foreground hover:dy-text-destructive" onClick={() => handleRemoveRule(i)}>
                      <Trash2 className="dy-h-4 dy-w-4" />
                    </Button>
                  </div>
                )
              })
            )}

            <Button variant="outline" size="sm" className="dy-h-9 dy-w-full dy-border-dashed dy-text-xs" onClick={handleAddRule} disabled={filterableFields.length === 0}>
              <Plus className="dy-mr-2 dy-h-3 dy-w-3" />
              Add Filter
            </Button>
          </div>

          <div className="dy-flex dy-items-center dy-justify-end dy-gap-2 dy-border-t dy-bg-muted/20 dy-px-5 dy-py-4">
            <Button variant="ghost" size="sm" className="dy-h-8 dy-text-xs" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="dy-h-8 dy-px-4 dy-text-xs" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
