import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

const tagArgIndex = process.argv.indexOf('--tag');
const tag = tagArgIndex !== -1 ? process.argv[tagArgIndex + 1] : 'latest';

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
    execSync(`npm publish --provenance --access public --tag ${tag}`, {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}`);
    throw error;
  }
}
