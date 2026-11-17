/* POWERPASS – מסך הסימולציה.
   בונה את הסימולציה מהמאגר המוצפן שבמכשיר בדיוק כמו moeqs_request_config() בתוסף (אותם סוגי סימולציה, אותן כותרות,
   אותו זמן ואותו ציון עובר), ומריץ את מנוע הסימולציה של האתר (js/vendor/quiz.js) ללא שינוי.
   הקריאות של המנוע לשרת (שמירת תוצאה, שמירת שאלה, דיווח) נתפסות כאן ונשמרות במכשיר לסנכרון – כך הכול עובד גם אופליין. */
(function () {
	'use strict';
	var PP = window.PP;
	var HUB = 'index.html#/sims', JOURNAL = 'index.html#/journal';

	function qs(name) { var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
	function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

	/* ---------- יירוט הקריאות של quiz.js (app://…) ---------- */
	var realFetch = window.fetch ? window.fetch.bind(window) : null;
	function jsonResponse(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } }); }
	window.fetch = function (url, opts) {
		var u = String(url && url.url ? url.url : url);
		if (u.indexOf('app://') !== 0) return realFetch(url, opts);
		var body = {};
		try { body = opts && opts.body ? JSON.parse(opts.body) : {}; } catch (e) { body = {}; }
		var what = u.slice(6);
		if (what === 'result') {
			if (body.partial) PP.recordAnswers(body.answers || []);
			else PP.recordResult(body);
			return Promise.resolve(jsonResponse({ ok: true }));
		}
		if (what === 'bookmark') {
			PP.setBookmark(body.n | 0, !!body.on);
			return Promise.resolve(jsonResponse({ ok: true, count: PP.state().saved.length }));
		}
		if (what === 'report') {
			return PP.sendReport(body.n | 0, String(body.message || '')).then(function (d) { return jsonResponse(d && d.ok !== undefined ? d : { ok: true }); },
				function (e) { return jsonResponse({ ok: false, error: e.message || 'השליחה נכשלה.' }, e.status || 400); });
		}
		return Promise.resolve(jsonResponse({ ok: false }, 404));
	};

	/* ---------- הודעת שגיאה (רישיון / מאגר) ---------- */
	function fail(title, text, actions) {
		var box = document.getElementById('pp-quiz');
		box.innerHTML = '';
		var card = document.createElement('div'); card.className = 'pp-card pp-msg';
		var h = document.createElement('h2'); h.textContent = title; card.appendChild(h);
		var p = document.createElement('p'); p.textContent = text; card.appendChild(p);
		var row = document.createElement('p'); row.className = 'pp-actions';
		(actions || [{ text: 'למסך הראשי', href: 'index.html#/home', primary: true }]).forEach(function (a) {
			var b = document.createElement('a'); b.className = 'pp-btn' + (a.primary ? ' pp-btn-primary' : ''); b.href = a.href; b.textContent = a.text; row.appendChild(b);
		});
		card.appendChild(row); box.appendChild(card);
	}
	var REASONS = {
		logged_out: ['יש להתחבר', 'כדי לתרגל צריך להתחבר עם החשבון שלכם באתר.'],
		not_member: ['הסימולציות פתוחות למנויים', 'למנוי פעיל יש גישה מלאה לכל הסימולציות, גם בלי אינטרנט.'],
		frozen: ['הגישה הושהתה זמנית', 'זוהתה פעילות חריגה ממספר רב של מכשירים. בהתאם לתקנון האתר, החשבון מיועד לשימוש אישי בלבד והגישה הושהתה זמנית.'],
		offline_expired: ['נדרש חיבור לאינטרנט', 'עברו ' + ((PP.jget(PP.K.lic, {}) || {}).offline_days || 7) + ' ימים ללא חיבור. התחברו לרשת לרגע כדי לחדש את הגישה האופליין, ואז אפשר להמשיך לתרגל.'],
		clock: ['שעון המכשיר אינו תקין', 'שעון המכשיר הוחזר אחורה. כוונו את התאריך והשעה, או התחברו לאינטרנט לרגע כדי לחדש את הגישה.'],
		no_bank: ['המאגר עוד לא הורד', 'התחברו לאינטרנט כדי להוריד את מאגר השאלות למכשיר (פעם אחת), ואז אפשר לתרגל גם בלי רשת.']
	};

	/* ---------- בניית הסימולציה: אותה לוגיקה כמו moeqs_request_config ---------- */
	function build(bank, S) {
		var lics = bank.licenses || S.licenses || { eng: 'חשמלאי-מהנדס', hand: 'חשמלאי-הנדסאי', tech: 'חשמלאי-טכנאי' };
		var A = {}, B = {}; (bank.levels.A || []).forEach(function (n) { A[n] = 1; }); (bank.levels.B || []).forEach(function (n) { B[n] = 1; });
		var all = bank.questions;
		var byN = {}; all.forEach(function (q) { byN[q.n] = q; });
		function pool(lic) { return all.filter(function (q) { return lic === 'tech' ? !A[q.n] && !B[q.n] : (lic === 'hand' ? !A[q.n] : true); }); }
		var m = PP.me() || {}, userLic = (m.user && m.user.license) || 'eng';
		var sim = qs('sim'), lic = qs('lic'); if (!lics[lic]) lic = 'eng';
		var examCount = S.exam_count || 50, examMin = S.exam_minutes || 210, quick = S.quick_count || 10;
		var perQ = examCount ? examMin / examCount : 0;
		var cfg = { mode: 'practice', choice: false, minutes: 0, count: 0, ordered: false, title: '', sub: '', pool: [], fresh: false };
		var st = PP.state();
		switch (sim) {
			case 'exam':
				cfg.pool = shuffle(pool(lic)).slice(0, Math.max(1, examCount)); cfg.fresh = true; cfg.mode = 'exam'; cfg.count = examCount; cfg.minutes = examMin;
				cfg.title = 'מבחן מלא – ' + lics[lic]; break;
			case 'quick':
				cfg.pool = shuffle(pool(lic)).slice(0, Math.max(1, quick)); cfg.fresh = true; cfg.mode = 'exam'; cfg.count = quick; cfg.minutes = Math.max(1, Math.ceil(perQ * quick));
				cfg.title = quick + ' שאלות מהירות – ' + lics[lic]; break;
			case 'practice':
				cfg.pool = shuffle(pool(lic)).slice(0, Math.max(1, examCount)); cfg.fresh = true; cfg.count = examCount;
				cfg.title = 'מבחן מלא עם תשובות מיידיות – ' + lics[lic]; cfg.sub = 'ללא טיימר. אחרי כל תשובה מוצג מיד אם צדקתם.'; break;
			case 'engonly':
				var allEng = qs('cnt') !== '50', timer = !!qs('tm');
				var p = all.filter(function (q) { return A[q.n]; });
				if (!allEng) p = shuffle(p).slice(0, Math.max(1, examCount));
				cfg.pool = p; cfg.fresh = !allEng; cfg.count = allEng ? 0 : p.length;
				cfg.title = 'תרגול שאלות למהנדסים בלבד' + (allEng ? ': כל ' + p.length + ' השאלות' : ': ' + p.length + ' שאלות אקראיות');
				if (timer) { cfg.mode = 'exam'; cfg.minutes = Math.max(1, Math.ceil(perQ * p.length)); cfg.sub = 'עם טיימר, בדיוק כמו בבחינה.'; }
				else { cfg.sub = 'ללא טיימר. אחרי כל תשובה מוצג מיד אם צדקתם.'; if (allEng) { cfg.ordered = true; cfg.choice = true; } }
				break;
			case 'topic':
				var t = bank.topics[qs('t') | 0];
				if (!t) return null;
				var inT = {}; t.ns.forEach(function (n) { inT[n] = 1; });
				cfg.pool = pool(userLicFor()).filter(function (q) { return inT[q.n]; });
				cfg.title = 'תרגול לפי נושא: ' + t.name; cfg.ordered = true; cfg.choice = true; break;
			case 'range':
				var r = /^(\d+)-(\d+)$/.exec(qs('r')); if (!r) return null;
				var a = +r[1], b = +r[2];
				cfg.pool = all.filter(function (q) { return q.n >= a && q.n <= b; });
				cfg.title = 'שאלות ' + a + '–' + b; cfg.ordered = true; cfg.choice = true; break;
			case 'saved':
				var sv = {}; st.saved.forEach(function (n) { sv[n] = 1; });
				cfg.pool = all.filter(function (q) { return sv[q.n]; });
				cfg.title = 'השאלות ששמרתי'; cfg.ordered = true; cfg.choice = true; break;
			case 'mistakes':
				cfg.pool = all.filter(function (q) { return st.wrong[q.n]; });
				cfg.title = 'תרגול השאלות שטעיתי בהן'; cfg.ordered = true; break;
			default:
				return null;
		}
		function userLicFor() { return lics[qs('lic')] ? qs('lic') : userLic; }
		// חזרה לאותן שאלות שהוגרלו (כמו moeqs_run_apply_resume): ?mr=1.2.3&ms=local
		var mr = qs('mr');
		if (cfg.fresh && mr) {
			var got = mr.split('.').map(Number).filter(function (n) { return byN[n]; });
			if (got.length) cfg.pool = got.map(function (n) { return byN[n]; });
		}
		cfg.label = cfg.title;
		return cfg;
	}

	/* [[img:שם]] → כתובת מקומית (blob) של השרטוט שנשמר במכשיר */
	function resolveImages(questions) {
		var names = {};
		var re = /\[\[(?:img|imgline):([^\]]+)\]\]/g;
		questions.forEach(function (q) { [q.q, q.e].concat(q.a).forEach(function (t) { var m; re.lastIndex = 0; while ((m = re.exec(String(t || '')))) names[m[1]] = 1; }); });
		var list = Object.keys(names), map = {};
		return Promise.all(list.map(function (n) { return PP.imageUrl(n).then(function (u) { map[n] = u; }); })).then(function () {
			var fix = function (t) { return String(t || '').replace(/\[\[(img|imgline):([^\]]+)\]\]/g, function (_, k, n) { return '[[' + k + ':' + (map[n] || n) + ']]'; }); };
			return questions.map(function (q) {
				var o = { n: q.n, q: fix(q.q), a: q.a.map(fix), c: q.c, e: fix(q.e), s: q.s || [] };
				if (q.lv) o.lv = q.lv;
				return o;
			});
		});
	}

	function start() {
		PP.applyTheme(); PP.applyPalette(); PP.shield(); PP.interceptLinks();
		if (!PP.loggedIn()) { location.replace('index.html#/login'); return; }
		PP.watermark();
		var S = PP.settings() || {};
		PP.openBank().then(function (bank) {
			var cfg = build(bank, S);
			if (!cfg) { fail('הסימולציה לא נמצאה', 'הקישור לסימולציה אינו תקין.'); return; }
			if (!cfg.pool.length) {
				var empty = qs('sim') === 'saved' ? 'עדיין לא שמרתם שאלות. במהלך תרגול לחצו "שמור שאלה" כדי להוסיף אותה לכאן.' : (qs('sim') === 'mistakes' ? 'אין כרגע שאלות שטעיתם בהן. כל הכבוד!' : 'אין שאלות בטווח שנבחר.');
				fail(cfg.title, empty, [{ text: 'לכל הסימולציות', href: HUB, primary: true }]);
				return;
			}
			document.title = cfg.title + ' · POWERPASS';
			return resolveImages(cfg.pool).then(function (questions) {
				var m = PP.me() || { user: {} };
				var data = {
					view: 'quiz', title: cfg.title, sub: cfg.sub, mode: cfg.mode, choice: cfg.choice, minutes: cfg.minutes,
					count: cfg.count ? Math.min(cfg.count, questions.length) : questions.length, ordered: cfg.ordered,
					pass: S.pass || 80, labels: S.labels || 'num', label: cfg.label, hub: HUB, journal: JOURNAL, logged: true,
					save: 'app://result', nonce: '', login: 'index.html#/login', fresh: cfg.fresh, bookmark: 'app://bookmark', report: 'app://report',
					saved: PP.state().saved, questions: questions, uid: m.user.id | 0,
					rs: cfg.fresh ? 'local' : '', rn: cfg.fresh ? questions.map(function (q) { return q.n; }) : [],
					runsave: '', srun: null
				};
				var root = document.getElementById('pp-quiz');
				root.innerHTML = '';
				var host = document.createElement('div');
				host.className = 'moeqs moeqs-quiz layout-' + (S.fig_layout === 'stack' ? 'stack' : 'side');
				host.setAttribute('dir', 'rtl'); host.setAttribute('lang', 'he');
				var sc = document.createElement('script'); sc.type = 'application/json'; sc.className = 'moeqs-data'; sc.textContent = JSON.stringify(data);
				host.appendChild(sc); root.appendChild(host);
				var eng = document.createElement('script'); eng.src = 'js/vendor/quiz.js'; document.body.appendChild(eng);
			});
		}).catch(function (e) {
			var r = REASONS[e && e.reason] || ['שגיאה בטעינת המאגר', (e && e.message) || 'נסו שוב.'];
			fail(r[0], r[1]);
		});

		/* כפתור "חזרה" של אנדרואיד: סוגר חלונית פתוחה, ואחרת חוזר לרשימת הסימולציות (ההתקדמות כבר נשמרה במכשיר) */
		var App = PP.plugin('App');
		if (App) {
			App.addListener('backButton', function () {
				var open = document.querySelector('dialog[open]');
				if (open) { open.close(); return; }
				var inRun = document.querySelector('.moeqs-exam, .moeqs-qcard, .moeqs-progress');
				if (inRun && !window.confirm('לצאת מהסימולציה? המיקום נשמר במכשיר, ותוכלו להמשיך מאותה נקודה.')) return;
				location.href = HUB;
			});
		}
		PP.lifecycle();
		PP.on('logout', function (d) { location.replace('index.html#/login'); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
