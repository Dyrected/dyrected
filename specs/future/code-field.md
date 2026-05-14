# Code Field

A field for storing and editing formatted code snippets with syntax highlighting.

## Overview

The `code` field provides a specialized editor for developers and power users to store scripts, styles, or configuration data. It uses a high-performance editor like Monaco (VS Code core) or CodeMirror.

## Configuration

```ts
{
  name: 'customScripts',
  type: 'code',
  label: 'Header Scripts',
  admin: {
    language: 'javascript', // 'javascript', 'css', 'html', 'json', etc.
    theme: 'dark', // 'dark' | 'light'
  }
}
```

## Technical Implementation

### 1. Core Type Definition
Add `code` to `FieldType`.

### 2. Database Storage
Code is stored as a raw `string` in the database.

### 3. Admin UI Component
A `CodeEditor` component will be added to `packages/admin`.

- **Library**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) is the gold standard, but [CodeMirror 6](https://codemirror.net/) is lighter and often preferred for headless CMSs.
- **Language Support**: Uses the `admin.language` property to set the correct syntax highlighting and linting.
- **Full-screen Mode**: Includes a button to expand the editor to full-screen for easier editing of long snippets.

## Benefits
- Syntax highlighting and indentation support.
- Prevents errors with basic linting (e.g., catching unclosed brackets).
- Dedicated UI for technical content.
