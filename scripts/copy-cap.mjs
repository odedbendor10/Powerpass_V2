// מעתיק את קובצי ה-JS של Capacitor (בלי bundler) אל www/js/cap, כדי שהדפים יטענו אותם ישירות.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www', 'js', 'cap');
mkdirSync(out, { recursive: true });
const files = [
  ['@capacitor/core/dist/capacitor.js', 'capacitor.js'],
  ['@capacitor/app/dist/plugin.js', 'app.js'],
  ['@capacitor/browser/dist/plugin.js', 'browser.js'],
  ['@capacitor/synapse/dist/synapse.js', 'synapse.js'], // 1.1.0: נדרש ל-filesystem (נטען לפניו)
  ['@capacitor/filesystem/dist/plugin.js', 'filesystem.js'], // 1.1.0: שמירת קבצים מהמחולל
  ['@capacitor/share/dist/plugin.js', 'share.js'], // 1.1.0: חלון השיתוף של אנדרואיד
];
let ok = true;
for (const [src, dst] of files) {
  const p = join(root, 'node_modules', src);
  if (!existsSync(p)) { console.error('חסר: ' + p); ok = false; continue; }
  copyFileSync(p, join(out, dst));
  console.log('הועתק: ' + src + ' -> www/js/cap/' + dst);
}
if (!ok) process.exit(1);
