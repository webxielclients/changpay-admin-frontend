import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'app/auth/layout.tsx',
  'app/auth/register/page.tsx',
  'components/auth/AuthLayout.tsx',
  'components/admin/badges/StatusBadge.tsx',
  'components/admin/dialogs/ConfirmDialog.tsx',
  'config/env.ts',
  'lib/api/client.ts',
  'lib/permissions/index.ts',
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
const sourceFiles = requiredFiles.filter((file) => existsSync(join(root, file)));
const hasSecrets = sourceFiles.some((file) => /(?:api[_-]?key|secret|password)\s*[:=]\s*['"][^'"\n]+/i.test(readFileSync(join(root, file), 'utf8')));

if (missing.length || hasSecrets) {
  if (missing.length) console.error(`Missing release files: ${missing.join(', ')}`);
  if (hasSecrets) console.error('A possible hardcoded credential was found in the release source set.');
  process.exit(1);
}

console.log(`Release check passed for ${sourceFiles.length} required source files.`);
console.log('Local environment files are permitted for development and remain excluded by .gitignore and the release manifest.');
