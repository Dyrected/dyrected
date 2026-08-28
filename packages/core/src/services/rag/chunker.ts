import { createHash } from 'crypto';

export interface ChunkOptions {
  /** Maximum target characters per chunk. Defaults to 1500 (~375-500 tokens). */
  maxChunkSize?: number;
  /** Overlap in characters between consecutive chunks. Defaults to 150. */
  chunkOverlap?: number;
  /** Hierarchy of string separators for recursive splitting. */
  separators?: string[];
}

export interface ChunkResult {
  text: string;
  tokenCount: number;
  index: number;
}

/**
 * Computes SHA-256 hex digest of a string for fast cache invalidation.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Estimates token count based on standard ~4 characters per token heuristic.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitTextRecursively(
  text: string,
  maxSize: number,
  overlap: number,
  separators: string[]
): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  // Find the highest-priority separator present in text
  let chosenSeparator = separators[separators.length - 1] ?? '';
  let nextSeparators = separators;

  for (let i = 0; i < separators.length; i++) {
    const sep = separators[i]!;
    if (sep === '' || text.includes(sep)) {
      chosenSeparator = sep;
      nextSeparators = separators.slice(i + 1);
      break;
    }
  }

  const rawSplits = chosenSeparator === '' ? text.split('') : text.split(chosenSeparator);
  const resultChunks: string[] = [];
  let currentChunk = '';

  for (const piece of rawSplits) {
    const candidate = currentChunk
      ? currentChunk + (chosenSeparator ? chosenSeparator : '') + piece
      : piece;

    if (candidate.length <= maxSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk.trim().length > 0) {
        resultChunks.push(currentChunk.trim());
      }

      // If a single piece is longer than maxSize, recursively split with next lower separator
      if (piece.length > maxSize) {
        const subChunks = splitTextRecursively(piece, maxSize, overlap, nextSeparators);
        resultChunks.push(...subChunks);
        currentChunk = '';
      } else {
        // Start next chunk with overlap from previous chunk if possible
        if (overlap > 0 && currentChunk.length > overlap) {
          const overlapPrefix = currentChunk.slice(currentChunk.length - overlap);
          currentChunk = overlapPrefix + (chosenSeparator ? chosenSeparator : '') + piece;
        } else {
          currentChunk = piece;
        }
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    resultChunks.push(currentChunk.trim());
  }

  return resultChunks;
}

/**
 * Recursively splits a text into coherent chunks with overlap.
 */
export function chunkText(text: string, options: ChunkOptions = {}): ChunkResult[] {
  const {
    maxChunkSize = 1500,
    chunkOverlap = 150,
    separators = ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', '; ', ', ', ' ', ''],
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmed = text.trim();

  if (trimmed.length <= maxChunkSize) {
    return [
      {
        text: trimmed,
        tokenCount: estimateTokens(trimmed),
        index: 0,
      },
    ];
  }

  const rawChunks = splitTextRecursively(trimmed, maxChunkSize, chunkOverlap, separators);

  return rawChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk, index) => ({
      text: chunk,
      tokenCount: estimateTokens(chunk),
      index,
    }));
}
