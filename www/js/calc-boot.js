/* POWERPASS – מסך מחשבון (calc.html?c=<id>).
   מריץ את קובצי המחשבונים של התוסף ללא שינוי (js/vendor/calc.js, calc-pro-lib.js, calc-pro.js, oneline.js), בדיוק כמו באתר.
   מחשבונים רגילים: לכל משתמש מחובר. מחשבונים מתקדמים ומחולל השרטוט: למנוי פעיל, לפי הרישיון של האפליקציה
   (אותו רישיון כמו הסימולציות, PP.license(), שעובד גם אופליין). כלי שהמנהל סגר באתר (רמה "סגור") סגור גם כאן.
   הכול עובד בלי אינטרנט. */
(function () {
	'use strict';
	var PP = window.PP, C = PP.C, CAT = window.PP_CALCS || { basic: [], pro: [] };
	var HUB = 'index.html#/calcs', TOOLS_KEY = 'pp_tools';
	var box = document.getElementById('pp-calc');

	function qs(name) { var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
	function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
	function toast(msg) { var t = document.getElementById('pp-toast'); if (!t) return; t.textContent = msg; t.classList.add('is-show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-show'); }, 3800); }

	function fail(title, text, actions) {
		box.innerHTML = '';
		var card = el('div', 'pp-card pp-msg');
		card.appendChild(el('h2', '', title));
		card.appendChild(el('p', '', text));
		var row = el('p', 'pp-actions');
		(actions || [{ text: 'לכל המחשבונים', href: HUB, primary: true }]).forEach(function (a) {
			var b = el('a', 'pp-btn' + (a.primary ? ' pp-btn-primary' : ''), a.text); b.href = a.href; row.appendChild(b);
		});
		card.appendChild(row); box.appendChild(card);
	}

	/* טעינת סקריפטים לפי הסדר (המחשבונים מאתחלים את עצמם מיד, כי הדף כבר נטען) */
	function load(srcs) {
		return srcs.reduce(function (p, src) {
			return p.then(function () {
				return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error(src)); }; document.body.appendChild(s); });
			});
		}, Promise.resolve());
	}

	/* שמירה / שיתוף של קובץ מהמחולל: כתיבה לזיכרון הזמני של האפליקציה ופתיחת חלון השיתוף של אנדרואיד
	   (שמירה ל-Drive או לקבצים, שליחה בוואטסאפ או במייל, הדפסה מהתמונה). בדפדפן רגיל – הורדה רגילה. */
	function blobToBase64(blob) {
		return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = bad; r.readAsDataURL(blob); });
	}
	function saveFile(blob, name) {
		var FS = PP.plugin('Filesystem'), SH = PP.plugin('Share');
		if (!FS || !SH) {
			var u = URL.createObjectURL(blob), a = document.createElement('a');
			a.href = u; a.download = name; document.body.appendChild(a); a.click();
			setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
			return;
		}
		var safe = String(name).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') || ('powerpass-' + Date.now());
		blobToBase64(blob).then(function (b64) {
			return FS.writeFile({ path: safe, data: b64, directory: 'CACHE' });
		}).then(function (res) {
			return SH.share({ title: safe, files: [res.uri], dialogTitle: 'שמירה או שיתוף של השרטוט' });
		}).catch(function (e) {
			var m = String((e && e.message) || e || '');
			if (/cancel/i.test(m)) return; // המשתמש סגר את חלון השיתוף
			toast('לא ניתן לשתף את הקובץ: ' + m);
		});
	}

	function start() {
		PP.applyTheme(); PP.applyPalette(); PP.shield(); PP.interceptLinks();
		var App = PP.plugin('App');
		if (App) App.addListener('backButton', function () { location.href = HUB; });
		if (!PP.loggedIn()) { fail('יש להתחבר', 'כדי להשתמש במחשבונים צריך להתחבר עם החשבון שלכם באתר.', [{ text: 'להתחברות', href: 'index.html#/login', primary: true }]); return; }
		PP.watermark();
		PP.lifecycle();

		var id = qs('c');
		var basic = CAT.basic.filter(function (x) { return x.id === id; })[0];
		var pro = CAT.pro.filter(function (x) { return x.id === id; })[0];
		var item = basic || pro;
		if (!item) { fail('המחשבון לא נמצא', 'בחרו מחשבון מהרשימה.'); return; }
		document.title = item.t + ' · POWERPASS';

		var tools = PP.jget(TOOLS_KEY, {}) || {};
		if (pro) {
			if ((tools.off || []).indexOf(id) >= 0) { fail('הכלי אינו זמין כרגע', 'הכלי הזה סגור זמנית.'); return; }
			var L = PP.license();
			if (!L.ok) {
				var R = {
					not_member: ['הכלים המתקדמים פתוחים למנויים', 'למנוי פעיל יש גישה למחולל השרטוט החד קווי ולכל המחשבונים המתקדמים, גם בלי אינטרנט. המחשבונים הרגילים פתוחים לכולם.'],
					frozen: ['הגישה הושהתה זמנית', 'החשבון מיועד לשימוש אישי בלבד והגישה הושהתה זמנית.'],
					offline_expired: ['נדרש חיבור לאינטרנט', 'התחברו לרשת לרגע כדי לחדש את הגישה האופליין.'],
					clock: ['שעון המכשיר אינו תקין', 'כוונו את התאריך והשעה, או התחברו לאינטרנט לרגע.']
				}[L.reason] || ['הכלים המתקדמים אינם זמינים כרגע', 'נסו שוב מאוחר יותר.'];
				var acts = [{ text: 'לכל המחשבונים', href: HUB, primary: true }];
				if (!C.STORE_MODE && L.reason === 'not_member') acts.unshift({ text: 'למסלולי המנוי', href: 'index.html#/plans', primary: true }), acts[1].primary = false;
				fail(R[0], R[1], acts);
				return;
			}
		}

		box.innerHTML = '';
		var wrap = el('div', 'moeqs moeqs-aids'); wrap.setAttribute('dir', 'rtl'); wrap.setAttribute('lang', 'he');
		wrap.appendChild(el('h2', 'moeqs-h moeqs-h-light', item.t));
		wrap.appendChild(el('p', 'moeqs-aid-intro', item.d));
		var scripts;
		if (basic) {
			window.moeqsCalcCfg = { kwh: typeof tools.kwh === 'number' && tools.kwh > 0 ? tools.kwh : 63.52, kwhDate: tools.kwh_date || '' };
			var sec = el('section', 'moeqs-panel moeqs-calc'); sec.setAttribute('data-moeqs-calc', id); wrap.appendChild(sec);
			scripts = ['js/vendor/calc.js'];
		} else if (id === 'oneline') {
			var aside = el('aside', 'moeqs-ol-legal');
			aside.appendChild(el('h3', '', 'הבהרה משפטית'));
			aside.appendChild(el('p', '', CAT.legal_full || ''));
			var lab = el('label', 'moeqs-ol-ack'), cb = document.createElement('input');
			cb.type = 'checkbox'; cb.setAttribute('data-ol-ack', '');
			lab.appendChild(cb); lab.appendChild(document.createTextNode(' קראתי את ההבהרה. ידוע לי שהשרטוט הוא כלי עזר בלבד, ושהאחריות המקצועית למתקן היא של החשמלאי בעל הרישיון.'));
			aside.appendChild(lab); wrap.appendChild(aside);
			var ol = el('section', 'moeqs-ol'); ol.setAttribute('data-moeqs-oneline', ''); wrap.appendChild(ol);
			var S = PP.settings() || {};
			window.moeqsOnelineCfg = { brand: S.brand || C.APP_NAME || 'POWERPASS', site: (S.biz && S.biz.site) || '', legal: CAT.legal_short || '' };
			window.moeqsOnelineSave = saveFile;
			window.moeqsOnelineNoPrint = true;
			scripts = ['js/vendor/oneline.js'];
		} else {
			var pr = el('section', 'moeqs-calc-pro'); pr.setAttribute('data-moeqs-pro', id); wrap.appendChild(pr);
			scripts = ['js/vendor/calc-pro-lib.js', 'js/vendor/calc-pro.js'];
		}
		box.appendChild(wrap);
		load(scripts).catch(function () { fail('המחשבון לא נטען', 'נסו לסגור ולפתוח את האפליקציה.'); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
