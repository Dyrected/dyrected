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

  // Determine which fields are filterable
  const filterableFields = React.useMemo(() => {
    if (!schema?.fields) return [];
    return schema.fields.filter((f: Field) => {
      if (NEVER_FILTERABLE.includes(f.type)) return false;
      if (f.admin?.filterable === false) return false;
      return true;
    });
  }, [schema]);

  const handleAddRule = () => {
    if (filterableFields.length === 0) return;
    const firstField = filterableFields[0];
    const operators = OPERATORS_BY_TYPE[firstField.type] || OPERATORS_BY_TYPE.text;
    onChange([
      ...rules,
      { field: firstField.name, operator: operators[0] as FilterRule['operator'], value: '' }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    onChange(newRules);
  };

  const handleUpdateRule = (index: number, key: keyof FilterRule, val: string | boolean) => {
    const newRules = [...rules];
    const rule = { ...newRules[index], [key]: val };

    // Reset operator and value if field changes
    if (key === 'field') {
      const fieldDef = filterableFields.find((f: Field) => f.name === val);
      if (fieldDef) {
        const operators = OPERATORS_BY_TYPE[fieldDef.type] || OPERATORS_BY_TYPE.text;
        rule.operator = operators[0] as FilterRule['operator'];
        rule.value = '';
      }
    }

    // Reset value if operator changes to exists
    if (key === 'operator' && val === 'exists') {
      rule.value = true;
    }

    newRules[index] = rule;
    onChange(newRules);
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
      <PopoverContent align="end" className="dy-w-[500px] dy-p-4">
        <div className="dy-space-y-4">
          <div className="dy-flex dy-items-center dy-justify-between">
            <h4 className="dy-font-medium dy-text-sm">Filters</h4>
            {rules.length > 0 && (
              <Button variant="ghost" size="sm" className="dy-h-6 dy-text-xs dy-text-muted-foreground" onClick={() => onChange([])}>
                Clear all
              </Button>
            )}
          </div>

          <div className="dy-space-y-3">
            {rules.length === 0 ? (
              <p className="dy-text-sm dy-text-muted-foreground dy-py-2">No active filters.</p>
            ) : (
              rules.map((rule, i) => {
                const fieldDef = filterableFields.find((f: Field) => f.name === rule.field);
                const operators = fieldDef ? (OPERATORS_BY_TYPE[fieldDef.type] || OPERATORS_BY_TYPE.text) : OPERATORS_BY_TYPE.text;

                return (
                  <div key={i} className="dy-flex dy-items-start dy-gap-2">
                    <Select value={rule.field} onValueChange={(val) => handleUpdateRule(i, 'field', val)}>
                      <SelectTrigger className="dy-w-[140px] dy-h-8 dy-text-xs">
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
                      <SelectTrigger className="dy-w-[130px] dy-h-8 dy-text-xs">
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
                          <SelectTrigger className="dy-h-8 dy-text-xs">
                            <SelectValue placeholder="Value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="dy-text-xs">Is not empty</SelectItem>
                            <SelectItem value="false" className="dy-text-xs">Is empty</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : fieldDef?.type === 'boolean' ? (
                        <Select value={String(rule.value)} onValueChange={(val) => handleUpdateRule(i, 'value', val === 'true')}>
                          <SelectTrigger className="dy-h-8 dy-text-xs">
                            <SelectValue placeholder="Value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="dy-text-xs">True</SelectItem>
                            <SelectItem value="false" className="dy-text-xs">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="dy-h-8 dy-text-xs"
                          placeholder="Value..."
                          value={(rule.value as string | number) || ''}
                          onChange={(e) => handleUpdateRule(i, 'value', e.target.value)}
                          type={fieldDef?.type === 'number' ? 'number' : fieldDef?.type === 'date' || fieldDef?.type === 'datetime' ? fieldDef.type : 'text'}
                        />
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="dy-h-8 dy-w-8 dy-text-muted-foreground hover:dy-text-destructive" onClick={() => handleRemoveRule(i)}>
                      <Trash2 className="dy-h-4 dy-w-4" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <Button variant="outline" size="sm" className="dy-w-full dy-h-8 dy-text-xs dy-border-dashed" onClick={handleAddRule} disabled={filterableFields.length === 0}>
            <Plus className="dy-mr-2 dy-h-3 dy-w-3" />
            Add Filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
