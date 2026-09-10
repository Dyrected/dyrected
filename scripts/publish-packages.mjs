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

// Verify that packing resolves all workspace: dependencies
function assertNoRawWorkspaceDeps(dir, pkgName) {
  const tarballName = execSync('pnpm pack', { cwd: dir, encoding: 'utf8' }).trim().split('\n').pop()?.trim();
  const tgzPath = tarballName ? path.join(dir, tarballName) : null;
  try {
    if (tgzPath && fs.existsSync(tgzPath)) {
      const packedPkgJson = execSync(`tar -xOf "${tgzPath}" package/package.json`, { encoding: 'utf8' });
      if (packedPkgJson.includes('"workspace:')) {
        throw new Error(`CRITICAL: Found raw "workspace:" protocol dependency in packed manifest for ${pkgName}! Refusing to publish.`);
      }
    }
  } finally {
    if (tgzPath && fs.existsSync(tgzPath)) {
      fs.unlinkSync(tgzPath);
    }
  }
}

// Check if this version is already on the npm registry
async function isAlreadyPublished(pkgName, version) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
    if (res.status === 404) return false;
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.versions && data.versions[version]);
    }
  } catch {
    // Fall back to trying publish if registry check has network issues
  }
  return false;
}

for (const dir of packageDirs) {
  const pkgJsonPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;
  
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (pkg.private) {
    console.log(`[publish] Skipping private package: ${pkg.name || path.basename(dir)}`);
    continue;
  }

  // Skip already published packages
  if (await isAlreadyPublished(pkg.name, pkg.version)) {
    console.log(`⏩ [publish] Skipping ${pkg.name}@${pkg.version} (already published on registry)`);
    continue;
  }

  // Pre-publish safety assertion
  console.log(`\n🔍 [publish] Verifying clean package dependencies for ${pkg.name}...`);
  assertNoRawWorkspaceDeps(dir, pkg.name);

  console.log(`🚀 [publish] Publishing ${pkg.name}@${pkg.version} with tag "${tag}" via pnpm publish...`);
  try {
    execSync(`pnpm publish --no-git-checks ${dryRunFlag}${provenanceFlag}--access public --tag ${tag}`, {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    const errString = `${error.stdout || ''}\n${error.stderr || ''}\n${error.message || ''}`;
    if (errString.includes('previously published') || errString.includes('cannot publish over')) {
      console.log(`⏩ [publish] Skipping ${pkg.name}@${pkg.version} (already published on registry)`);
      continue;
    }
    console.error(`❌ Failed to publish ${pkg.name}`);
    throw error;
  }
}
