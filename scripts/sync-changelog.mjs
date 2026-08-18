import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rootChangelogPath = path.join(rootDir, 'CHANGELOG.md');
const docsChangelogPath = path.join(rootDir, 'apps', 'docs', 'content', 'docs', 'start-here', 'changelog.mdx');
const startHereMetaPath = path.join(rootDir, 'apps', 'docs', 'content', 'docs', 'start-here', 'meta.json');

function getPackageDirs() {
  const dirs = [];
  const searchRoots = ['packages', 'apps'];
  for (const sr of searchRoots) {
    const fullSr = path.join(rootDir, sr);
    if (!fs.existsSync(fullSr)) continue;
    const entries = fs.readdirSync(fullSr, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pkgDir = path.join(fullSr, entry.name);
        if (fs.existsSync(path.join(pkgDir, 'package.json')) && fs.existsSync(path.join(pkgDir, 'CHANGELOG.md'))) {
          dirs.push(pkgDir);
        }
      }
    }
  }
  return dirs;
}

function parsePackageChangelog(pkgDir) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const pkgName = pkgJson.name || path.basename(pkgDir);
  const rawChangelog = fs.readFileSync(path.join(pkgDir, 'CHANGELOG.md'), 'utf8');

  const versionRegex = /^##\s+([0-9]+\.[0-9]+\.[0-9]+[^\n\r]*)/gm;
  const versions = [];
  let match;

  const indices = [];
  while ((match = versionRegex.exec(rawChangelog)) !== null) {
    indices.push({
      version: match[1].trim(),
      index: match.index,
    });
  }

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const nextIndex = i + 1 < indices.length ? indices[i + 1].index : rawChangelog.length;
    const rawSection = rawChangelog.slice(current.index, nextIndex);
    const content = rawSection.replace(/^##\s+[^\n\r]+\n+/i, '').trim();

    // Extract individual items/bullet points
    // Split by top-level bullet point or section
    const items = splitChangeItems(content);

    for (const item of items) {
      if (item && !isDependencyUpdate(item)) {
        versions.push({
          version: current.version,
          pkgName,
          item: cleanItem(item),
        });
      }
    }
  }

  return versions;
}

function isDependencyUpdate(item) {
  const trimmed = item.trim();
  return (
    trimmed.startsWith('Updated dependencies') ||
    trimmed.startsWith('- Updated dependencies') ||
    trimmed.includes('### Patch Changes\n\n- Updated dependencies') ||
    trimmed.includes('### Minor Changes\n\n- Updated dependencies')
  );
}

function cleanItem(item) {
  return item
    .replace(/^###\s+(Minor|Patch|Major)\s+Changes\s*\n+/gmi, '')
    .replace(/^- Updated dependencies[\s\S]*$/gmi, '')
    .trim();
}

function splitChangeItems(content) {
  // Remove "### Minor Changes" / "### Patch Changes"
  const cleaned = content.replace(/^###\s+(Minor|Patch|Major)\s+Changes\s*\n+/gmi, '').trim();
  
  // Split on top-level bullets starting with "- " or "- ###"
  const lines = cleaned.split('\n');
  const items = [];
  let currentItem = [];

  for (const line of lines) {
    if (/^-\s+/.test(line) && currentItem.length > 0) {
      items.push(currentItem.join('\n').trim());
      currentItem = [line];
    } else {
      currentItem.push(line);
    }
  }
  if (currentItem.length > 0) {
    items.push(currentItem.join('\n').trim());
  }

  return items.filter(Boolean);
}

function normalizeItemKey(text) {
  // Normalize by removing commit hashes, bullet markers, whitespace for deduplication
  return text
    .replace(/^[-\s*]+/g, '')
    .replace(/^[a-f0-9]{7,8}:\s*/g, '')
    .replace(/\[[a-f0-9]{7,8}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function semverCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = isNaN(pa[i]) ? 0 : pa[i];
    const nb = isNaN(pb[i]) ? 0 : pb[i];
    if (na !== nb) return nb - na;
  }
  return 0;
}

function aggregateDeduplicated() {
  const pkgDirs = getPackageDirs();
  const allVersionData = new Map(); // version -> Map(normalizedKey -> { rawText, packages: Set })

  for (const pkgDir of pkgDirs) {
    const entries = parsePackageChangelog(pkgDir);
    for (const { version, pkgName, item } of entries) {
      if (!item) continue;
      const key = normalizeItemKey(item);
      if (!key || key === 'Updated dependencies') continue;

      if (!allVersionData.has(version)) {
        allVersionData.set(version, new Map());
      }
      const versionMap = allVersionData.get(version);

      if (!versionMap.has(key)) {
        versionMap.set(key, {
          rawText: item,
          packages: new Set([pkgName]),
        });
      } else {
        versionMap.get(key).packages.add(pkgName);
      }
    }
  }

  const sortedVersions = Array.from(allVersionData.keys()).sort(semverCompare);
  const versionSections = [];

  for (const version of sortedVersions) {
    const itemsMap = allVersionData.get(version);
    const itemEntries = Array.from(itemsMap.values());
    if (itemEntries.length === 0) continue;

    const formattedItems = [];

    for (const { rawText, packages } of itemEntries) {
      const pkgList = Array.from(packages);
      
      // Clean up the text: remove commit hash prefix if present
      let cleanedText = rawText.replace(/^-\s+[a-f0-9]{7,8}:\s*/, '- ');
      if (!cleanedText.startsWith('-') && !cleanedText.startsWith('#')) {
        cleanedText = `- ${cleanedText}`;
      }

      // Add package scope badge if scoped to specific packages (and not all packages)
      let scopeTag = '';
      if (pkgList.length <= 4) {
        scopeTag = ` (${pkgList.map(p => `\`${p}\``).join(', ')})`;
      }

      // If the item starts with "- ### Added" or "- **Feature**"
      if (cleanedText.startsWith('- ### Added\n')) {
        cleanedText = cleanedText.replace('- ### Added\n', '');
      }

      formattedItems.push(`${cleanedText}`);
    }

    versionSections.push(`## [${version}]\n\n${formattedItems.join('\n\n')}`);
  }

  return versionSections.join('\n\n---\n\n');
}

function buildRootChangelog(body) {
  return `# Changelog\n\nAll notable changes to the Dyrected platform are documented in this file.\n\n${body}\n`;
}

function buildDocsChangelog(body) {
  return `---
title: Changelog
description: Release notes and version history for the Dyrected platform.
runtime: shared
---

Release notes and version history across all Dyrected packages.

${body}
`;
}

function updateDocsMeta() {
  if (fs.existsSync(startHereMetaPath)) {
    const meta = JSON.parse(fs.readFileSync(startHereMetaPath, 'utf8'));
    if (Array.isArray(meta.pages) && !meta.pages.includes('changelog')) {
      meta.pages.push('changelog');
      fs.writeFileSync(startHereMetaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
      console.log('✔ Updated apps/docs/content/docs/start-here/meta.json with changelog');
    }
  }
}

function main() {
  const aggregatedBody = aggregateDeduplicated();

  // Write root CHANGELOG.md
  fs.writeFileSync(rootChangelogPath, buildRootChangelog(aggregatedBody), 'utf8');
  console.log('✔ Generated deduplicated root CHANGELOG.md');

  // Write docs changelog.mdx
  const docsDir = path.dirname(docsChangelogPath);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(docsChangelogPath, buildDocsChangelog(aggregatedBody), 'utf8');
  console.log('✔ Generated deduplicated apps/docs/content/docs/start-here/changelog.mdx');

  // Update docs navigation
  updateDocsMeta();
}

main();
