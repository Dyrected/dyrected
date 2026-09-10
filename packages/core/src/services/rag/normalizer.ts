/**
 * Content normalizer for Dyrected CMS fields before chunking and embedding.
 * Converts raw rich-text ASTs (Lexical, Slate, TipTap, custom blocks), HTML,
 * JSON objects, and arrays into clean, structured Markdown.
 */

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function extractTextFromNode(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);

  // If node has text directly (e.g. Slate/Lexical leaf node)
  if (typeof node.text === 'string') {
    let text = node.text;
    if (node.bold) text = `**${text}**`;
    if (node.italic) text = `*${text}*`;
    if (node.code) text = `\`${text}\``;
    return text;
  }

  // Children traversal
  const childrenText = Array.isArray(node.children)
    ? node.children.map(extractTextFromNode).join('')
    : Array.isArray(node.content)
    ? node.content.map(extractTextFromNode).join('')
    : '';

  // Block types to Markdown representation
  const type = (node.type || node.tag || '').toLowerCase();
  switch (type) {
    case 'h1':
    case 'heading-one':
    case 'heading_1':
      return `\n# ${childrenText}\n`;
    case 'h2':
    case 'heading-two':
    case 'heading_2':
      return `\n## ${childrenText}\n`;
    case 'h3':
    case 'heading-three':
    case 'heading_3':
      return `\n### ${childrenText}\n`;
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n#### ${childrenText}\n`;
    case 'paragraph':
    case 'p':
      return `\n${childrenText}\n`;
    case 'list-item':
    case 'li':
      return `- ${childrenText}\n`;
    case 'bulleted-list':
    case 'ul':
      return `\n${childrenText}\n`;
    case 'numbered-list':
    case 'ol':
      return `\n${childrenText}\n`;
    case 'blockquote':
    case 'quote':
      return `\n> ${childrenText}\n`;
    case 'code':
    case 'code-block':
      return `\n\`\`\`\n${childrenText}\n\`\`\`\n`;
    case 'link':
    case 'a':
      return node.url || node.href ? `[${childrenText}](${node.url || node.href})` : childrenText;
    default:
      return childrenText;
  }
}

/**
 * Normalizes an unknown field value into clean Markdown/text.
 */
export function normalizeFieldValue(value: unknown, _fieldType?: string): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    // If it looks like HTML, strip tags while keeping structure
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return stripHtml(trimmed);
    }
    return trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    // Array of blocks or string items
    const parts = value.map((item) => normalizeFieldValue(item)).filter(Boolean);
    return parts.join('\n\n');
  }

  if (typeof value === 'object') {
    // Check if it's a Lexical / Slate root container with `root` or `children`
    const root = (value as any).root || value;
    const extracted = extractTextFromNode(root);
    if (extracted && extracted.trim().length > 0) {
      return extracted.replace(/\n{3,}/g, '\n\n').trim();
    }

    // Fallback: structured JSON representation (key-values)
    try {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([k, v]) => !k.startsWith('_') && v !== null && v !== undefined && typeof v !== 'function')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      return entries.join('\n');
    } catch {
      return '';
    }
  }

  return String(value);
}

/**
 * Extracts searchable text from target fields of a document.
 */
export function extractTextFromDoc(
  doc: Record<string, unknown>,
  targetFields?: string[]
): Array<{ field: string; text: string }> {
  if (!doc) return [];

  const results: Array<{ field: string; text: string }> = [];

  if (targetFields && targetFields.length > 0) {
    for (const fieldName of targetFields) {
      const val = doc[fieldName];
      const text = normalizeFieldValue(val);
      if (text && text.trim().length > 0) {
        results.push({ field: fieldName, text: text.trim() });
      }
    }
    return results;
  }

  // Automatic field discovery: look at all text-like fields
  for (const [key, val] of Object.entries(doc)) {
    if (
      key.startsWith('_') ||
      key === 'id' ||
      key === 'password' ||
      key === 'salt' ||
      key === 'hash' ||
      key === 'resetPasswordToken' ||
      key === 'createdAt' ||
      key === 'updatedAt' ||
      key === 'createdBy' ||
      key === 'updatedBy'
    ) {
      continue;
    }

    const text = normalizeFieldValue(val);
    if (text && text.trim().length > 0) {
      results.push({ field: key, text: text.trim() });
    }
  }

  return results;
}
