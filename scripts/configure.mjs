// מעדכן את www/js/config.js לפני הבנייה: גרסת האפליקציה (מ-package.json), מצב חנות וכתובת ה-API.
// משתני סביבה: STORE_MODE=true|false, API_BASE=https://.../wp-json/moeqs/v1 (ריק = ברירת המחדל שבקובץ)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const f = join(root, 'www', 'js', 'config.js');
let s = readFileSync(f, 'utf8');
const rep = (key, val) => { const re = new RegExp('(' + key + ":\\s*)([^,\\n]+)"); if (!re.test(s)) throw new Error('לא נמצא ' + key); s = s.replace(re, '$1' + val); };
rep('APP_VERSION', JSON.stringify(pkg.version));
if (process.env.STORE_MODE !== undefined && process.env.STORE_MODE !== '') rep('STORE_MODE', String(process.env.STORE_MODE).toLowerCase() === 'true' ? 'true' : 'false');
const api = (process.env.API_BASE || '').trim().replace(/\/+$/, '');
if (api) {
  if (!/^https:\/\/[^/]+\/.+\/moeqs\/v1$/.test(api)) throw new Error('API_BASE חייב להיות כתובת https שמסתיימת ב-/moeqs/v1, למשל https://staging.powerpass.co.il/wp-json/moeqs/v1');
  rep('API_BASE', JSON.stringify(api));
  rep('SITE_URL', JSON.stringify(api.replace(/\/wp-json\/moeqs\/v1$/, '').replace(/\/\?rest_route=.*$/, '')));
}
writeFileSync(f, s);
console.log(s.split('\n').filter(l => /APP_VERSION|API_BASE|SITE_URL|STORE_MODE:/.test(l)).join('\n'));
