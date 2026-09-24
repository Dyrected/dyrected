import prettier from "prettier";

/**
 * Robustly finds the closing bracket ']' for a given opening bracket '[' index,
 * correctly ignoring brackets inside strings and comments.
 */
function findMatchingBracket(text: string, startIndex: number): number {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    // Handle comments
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (!inLineComment && !inBlockComment && char === "/" && text[i + 1] === "/") {
        inLineComment = true;
        i++;
        continue;
      }
      if (inLineComment && (char === "\n" || char === "\r")) {
        inLineComment = false;
        continue;
      }
      if (!inLineComment && !inBlockComment && char === "/" && text[i + 1] === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (inBlockComment && char === "*" && text[i + 1] === "/") {
        inBlockComment = false;
        i++;
        continue;
      }
    }

    if (inLineComment || inBlockComment) continue;

    // Handle strings
    if (char === "'" && prev !== "\\" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && prev !== "\\" && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === "`" && prev !== "\\" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inBacktick) continue;

    // Handle brackets
    if (char === "[") {
      depth++;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Ensures that `defineWorkspace` is imported from `@dyrected/core`.
 */
export function ensureDefineWorkspaceImport(content: string): string {
  if (content.includes("defineWorkspace")) {
    return content;
  }

  // Look for existing `@dyrected/core` import
  const coreImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']@dyrected\/core["'];?/;
  const match = content.match(coreImportRegex);

  if (match) {
    const importedIdentifiers = match[1];
    const updatedIdentifiers = `${importedIdentifiers.trim()}, defineWorkspace`;
    return content.replace(
      match[0],
      `import { ${updatedIdentifiers} } from "@dyrected/core";`
    );
  }

  // Otherwise prepend import
  return `import { defineWorkspace } from "@dyrected/core";\n${content}`;
}

/**
 * Patches the `navigation` property of `admin: { ... }` in a `dyrected.config.ts` string.
 */
export async function patchConfigNavigation(
  configContent: string,
  serializedNav: string
): Promise<string> {
  let content = ensureDefineWorkspaceImport(configContent);

  // Check if navigation: [...] is already present
  const navKeywordMatch = content.match(/navigation\s*:\s*\[/);

  if (navKeywordMatch && navKeywordMatch.index !== undefined) {
    const navStart = navKeywordMatch.index;
    const bracketStart = content.indexOf("[", navStart);

    if (bracketStart !== -1) {
      const bracketEnd = findMatchingBracket(content, bracketStart);
      if (bracketEnd !== -1) {
        // Check if there's a trailing comma
        let replaceEnd = bracketEnd + 1;
        while (replaceEnd < content.length && (content[replaceEnd] === " " || content[replaceEnd] === "\t")) {
          replaceEnd++;
        }
        if (content[replaceEnd] === ",") {
          replaceEnd++;
        }

        content =
          content.slice(0, navStart) +
          `navigation: ${serializedNav},` +
          content.slice(replaceEnd);

        return await formatTs(content);
      }
    }
  }

  // Check if admin: { ... } is present
  const adminMatch = content.match(/admin\s*:\s*\{/);
  if (adminMatch && adminMatch.index !== undefined) {
    const insertIndex = adminMatch.index + adminMatch[0].length;
    content =
      content.slice(0, insertIndex) +
      `\n  navigation: ${serializedNav},` +
      content.slice(insertIndex);

    return await formatTs(content);
  }

  // Check if defineConfig({ ... }) is present
  const defineConfigMatch = content.match(/defineConfig\s*\(\s*\{/);
  if (defineConfigMatch && defineConfigMatch.index !== undefined) {
    const insertIndex = defineConfigMatch.index + defineConfigMatch[0].length;
    content =
      content.slice(0, insertIndex) +
      `\n  admin: {\n    navigation: ${serializedNav},\n  },` +
      content.slice(insertIndex);

    return await formatTs(content);
  }

  // Fallback: append admin configuration
  content += `\n\nexport const adminNavigation = ${serializedNav};\n`;
  return await formatTs(content);
}

async function formatTs(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: "typescript",
      singleQuote: false,
      semi: true,
    });
  } catch {
    return code;
  }
}
