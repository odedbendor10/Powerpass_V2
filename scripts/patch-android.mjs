// מתאים את פרויקט האנדרואיד שנוצר ע"י `npx cap add android`:
//  1. FLAG_SECURE ב-MainActivity – חסימת צילומי מסך והקלטת מסך, ותצוגה ריקה במסך "האפליקציות האחרונות".
//  2. allowBackup=false – הנתונים המקומיים (המאגר המוצפן) לא נכללים בגיבוי המכשיר.
//  3. אייקונים ומסך פתיחה בצבעי POWERPASS (מהתיקייה android-res).
//  4. מספר גרסה: VERSION_CODE (מספר ההרצה ב-GitHub) ו-VERSION_NAME (מ-package.json).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');
const app = join(android, 'app');
if (!existsSync(app)) { console.error('לא נמצאה התיקייה android/app. הריצו קודם: npx cap add android'); process.exit(1); }
const cfg = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

/* 1. MainActivity עם FLAG_SECURE */
const javaDir = join(app, 'src', 'main', 'java', ...cfg.appId.split('.'));
const kotlinDir = join(app, 'src', 'main', 'kotlin', ...cfg.appId.split('.'));
const javaFile = join(javaDir, 'MainActivity.java');
const ktFile = [join(javaDir, 'MainActivity.kt'), join(kotlinDir, 'MainActivity.kt')].find(existsSync);
if (ktFile) {
  writeFileSync(ktFile, `package ${cfg.appId}

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // POWERPASS: חסימת צילומי מסך והקלטת מסך (הגנה על מאגר השאלות)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }
}
`);
  console.log('FLAG_SECURE: ' + relative(root, ktFile));
} else {
  mkdirSync(javaDir, { recursive: true });
  writeFileSync(javaFile, `package ${cfg.appId};

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // POWERPASS: חסימת צילומי מסך והקלטת מסך (הגנה על מאגר השאלות)
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }
}
`);
  console.log('FLAG_SECURE: ' + relative(root, javaFile));
}

/* 2. מניפסט: בלי גיבוי, בלי תעבורה לא מוצפנת */
const manFile = join(app, 'src', 'main', 'AndroidManifest.xml');
let man = readFileSync(manFile, 'utf8');
man = /android:allowBackup="[^"]*"/.test(man) ? man.replace(/android:allowBackup="[^"]*"/, 'android:allowBackup="false"') : man.replace('<application', '<application\n        android:allowBackup="false"');
if (!/android:usesCleartextTraffic=/.test(man)) man = man.replace('<application', '<application\n        android:usesCleartextTraffic="false"');
if (!/android:fullBackupContent=/.test(man)) man = man.replace('<application', '<application\n        android:fullBackupContent="false"');
writeFileSync(manFile, man);
console.log('AndroidManifest: allowBackup=false, usesCleartextTraffic=false');

/* 3. אייקונים ומסך פתיחה */
const res = join(app, 'src', 'main', 'res');
const ours = join(root, 'android-res');
for (const f of walk(ours)) {
  const dst = join(res, relative(ours, f));
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(f, dst);
}
const splash = join(ours, 'drawable', 'splash.png');
let n = 0;
for (const f of walk(res)) if (/[\\/]drawable[^\\/]*[\\/]splash\.png$/.test(f)) { copyFileSync(splash, f); n++; }
console.log('אייקונים ומסך פתיחה הוחלפו (' + n + ' קובצי splash)');

/* 4. גרסה */
const gradle = join(app, 'build.gradle');
let g = readFileSync(gradle, 'utf8');
const code = Math.max(1, parseInt(process.env.VERSION_CODE || '1', 10) || 1);
const name = (process.env.VERSION_NAME || pkg.version || '1.0.0').replace(/[^0-9A-Za-z.\-]/g, '');
g = g.replace(/versionCode(\s*=?\s*)\d+/, (m, sep) => 'versionCode' + sep + code);
g = g.replace(/versionName(\s*=?\s*)"[^"]*"/, (m, sep) => 'versionName' + sep + '"' + name + '"');
writeFileSync(gradle, g);
console.log('גרסה: ' + name + ' (' + code + ')');
