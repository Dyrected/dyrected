import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

const tagArgIndex = process.argv.indexOf('--tag');
const tag = tagArgIndex !== -1 ? process.argv[tagArgIndex + 1] : 'latest';

// Support --dry-run flag for safe validation
const isDryRun = process.argv.includes('--dry-run');
const dryRunFlag = isDryRun ? '--dry-run ' : '';

// Only add --provenance in CI environments (where OIDC providers exist) or if explicitly requested
const forceProvenance = process.argv.includes('--provenance');
const noProvenance = process.argv.includes('--no-provenance');
const isCI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
const useProvenance = !noProvenance && (forceProvenance || isCI);
const provenanceFlag = useProvenance ? '--provenance ' : '';

const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => path.join(packagesDir, dirent.name));

for (const dir of packageDirs) {
  const pkgJsonPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;
  
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (pkg.private) {
    console.log(`[publish] Skipping private package: ${pkg.name || path.basename(dir)}`);
    continue;
  }

  console.log(`\n🚀 [publish] Publishing ${pkg.name}@${pkg.version} with tag "${tag}" via native npm...`);
  try {
    execSync(`npm publish ${dryRunFlag}${provenanceFlag}--access public --tag ${tag}`, {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}`);
    throw error;
  }
}
