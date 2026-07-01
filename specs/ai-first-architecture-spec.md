# Specification: AI-First CMS Architecture

This specification outlines the architecture, constraints, and developer tooling design to make Dyrected natively optimized and easily extensible by AI coding agents (such as Claude, Gemini, Cursor, or Antigravity).

---

## 1. Context & Motivation

Traditional Headless CMS platforms require manual UI clicks, database schema configurations, and visual dashboard inputs. Because AI coding agents are restricted to codebase modifications, integrating or evolving a traditional CMS is highly friction-prone.

Dyrected is uniquely positioned for AI-driven development because it is **declarative and schema-driven** (defined entirely as TypeScript/JSON configuration files). This spec defines how we leverage this superpower to make Dyrected AI-First.

---

## 2. Core Pillars of AI-First CMS

Our design focuses on three layered integration levels:
* **Pillar 1: Repository-Level Rules (Passive, Universal):** Zero-setup guides (`.cursorrules`, `.dyrected/ai-rules.md`) that teach any AI agent reading the workspace how to work with Dyrected safely.
* **Pillar 2: Model Context Protocol Server (Active, Tool-Enabled):** A cross-platform MCP Server (`@dyrected/mcp`) that equips AIs (in Claude, Cursor, Windsurf) with native tools to inspect schemas, validate configurations, and run migrations.
* **Pillar 3: Schema & Block Auto-Generator (CLI Tooling):** CLI commands (`npx dyrected generate:block`) to scaffold config files and design templates from text instructions.

---

## 3. Pillar 1: Repository-Level AI Context (`.dyrected/ai-rules.md`)

To enable workspace LLMs to build pages and blocks without instruction, we introduce a standard AI manifest at `.dyrected/ai-rules.md` (or `.cursorrules`).

### Guidelines for the AI Manifest:
1. **CMS Core Syntax:**
   * Require imports of `defineCollection`, `defineGlobal`, and `defineConfig` from `@dyrected/core`.
   * Standard definitions for field types: `text`, `textarea`, `richText`, `number`, `boolean`, `date`, `email`, `url`, `json`, `select`, `multiSelect`, `relationship`, and `blocks`.
2. **Safe Schema Evolution Rules:**
   * **No Destructive Actions:** Never delete or rename existing fields (to prevent production data loss). Mark unused schemas/fields as deprecated.
   * **Mandatory Defaults:** Every new field added to an existing schema *must* have a `defaultValue`.
3. **Zero-State Resilience:**
   * Always write queries using `initialData` fallbacks so the frontend handles missing values or newly created fields gracefully.

---

## 4. Pillar 2: Model Context Protocol (MCP) Server

To turn the AI into an active collaborator with system capabilities, Dyrected publishes an official `@dyrected/mcp` package. This exposes core resources and tools directly to LLMs.

### 4.1 Schema / Resource URI Definitions
* **`dyrected://docs`:** Serves the compiled Markdown API documentation, guides, and schema examples directly to the model's context.
* **`dyrected://schema`:** Serves the project's compiled active config schema, showing the exact structure of all collections, globals, and blocks.

### 4.2 Tool Specifications
* **`dyrected_validate_config`:**
  * *Purpose:* Performs static analysis on the local `dyrected.config.ts`.
  * *Safety Guard:* Verifies that changes do not violate schema evolution rules (e.g. checks that newly added fields contain default values).
* **`dyrected_generate_block`:**
  * *Purpose:* Instructs the agent to append a newly designed block schema configuration into the config file.
* **`dyrected_sync_schema`:**
  * *Purpose:* Executes the database migration/synchronization command (`npx dyrected sync:schema`) directly on behalf of the developer.

---

## 5. Pillar 3: Schema & Block Auto-Generator (CLI Tooling)

We provide a developer-facing CLI tool to automate block and schema creation.

### Example CLI Workflow
```bash
npx dyrected generate:block "testimonial-slider" "A carousel of client reviews featuring a rating value, quote text, and client avatar image relationship"
```

### The Generation Pipeline

1. **Context Extraction:**
   * The CLI reads the current `dyrected.config.ts` to identify existing relationships (like a `media` collection) and style configurations.
2. **LLM Synthesis:**
   * Sends the user's description + project's config file context to the LLM.
   * The model returns a typed block schema object matching Dyrected's Field specification.
3. **Workspace Ingestion:**
   * Appends the new block configuration into the blocks array of `dyrected.config.ts`.
   * Generates a matching frontend component stub in the project's design system directory (e.g. `components/blocks/TestimonialSlider.vue` or `components/blocks/TestimonialSlider.tsx`).
4. **Schema Sync:**
   * Automatically executes `npx dyrected sync:schema` to provision the database schema safely.

---

## 6. Self-Healing & Dynamic Rendering Component Pattern

To support AI-generated blocks without manual routing or component mapping, the frontend code should use a dynamic resolver pattern.

### Vue/Nuxt Dynamic Renderer Example

```vue
<script setup lang="ts">
import { defineAsyncComponent, computed } from 'vue'

const props = defineProps<{
  block: { blockType: string; [key: string]: any }
}>()

// Dynamically resolve component based on blockType slug
const BlockComponent = computed(() => {
  const componentName = props.block.blockType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
    
  return defineAsyncComponent(() => 
    import(`../../components/blocks/${componentName}.vue`)
      .catch(() => import('../../components/blocks/FallbackBlock.vue'))
  )
})
</script>

<template>
  <component :is="BlockComponent" v-bind="block" />
</template>
```

Under this pattern, once the AI registers the schema and creates the template component, the CMS immediately begins rendering the new blocks without any manual developer imports.
