// בדיקת תחביר לכל קובצי ה-JS של האפליקציה (רץ גם ב-GitHub Actions לפני הבנייה).
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['www/js', 'www/js/vendor', 'scripts'];
let n = 0;
for (const d of dirs) for (const f of readdirSync(join(root, d))) {
  if (!/\.(m?js)$/.test(f)) continue;
  execFileSync(process.execPath, ['--check', join(root, d, f)], { stdio: 'inherit' }); n++;
}
console.log('תחביר תקין: ' + n + ' קבצים');
