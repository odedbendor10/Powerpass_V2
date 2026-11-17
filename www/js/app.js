/* POWERPASS – המסך הראשי: התחברות, בית, סימולציות, נושאים, יומן, חשבון ומסלולים. */
(function () {
	'use strict';
	var PP = window.PP, C = PP.C;
	var app = document.getElementById('app');
	var syncInfo = { phase: '', text: '' };

	/* ------------------------------------------------------------------ עזרי DOM */
	function h(tag, props, kids) {
		var n = document.createElement(tag);
		if (props) Object.keys(props).forEach(function (k) {
			var v = props[k];
			if (v === null || v === undefined || v === false) return;
			if (k === 'class') n.className = v;
			else if (k === 'text') n.textContent = v;
			else if (k === 'html') n.innerHTML = v; // רק לסמלי SVG קבועים מהקוד
			else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
			else n.setAttribute(k, v === true ? '' : v);
		});
		(kids || []).forEach(function (c) { if (c === null || c === undefined || c === false) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
		return n;
	}
	function toast(msg) { var t = document.getElementById('pp-toast'); t.textContent = msg; t.classList.add('is-show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-show'); }, 3800); }
	function fmtSecs(sec) { sec = Math.max(0, Math.round(sec || 0)); var hh = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (hh ? hh + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
	function daysText(n) { return n === 1 ? 'יום אחד' : (n === 2 ? 'יומיים' : n + ' ימים'); }
	function num(n) { return Number(n || 0).toLocaleString('he-IL'); }
	function online() { return navigator.onLine !== false; }

	var ICON = {
		home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
		list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>',
		chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
		user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
		sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1"/><path d="M18 3v4.5h-4.5M6 21v-4.5h4.5"/></svg>',
		back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
		calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 6.5h8"/><circle cx="9" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="15" cy="12" r=".9" fill="currentColor"/><circle cx="9" cy="16" r=".9" fill="currentColor"/><circle cx="12" cy="16" r=".9" fill="currentColor"/><circle cx="15" cy="16" r=".9" fill="currentColor"/></svg>',
		eye: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
	};

	/* ------------------------------------------------------------------ שלד מסך */
	function shell(title, body, opts) {
		opts = opts || {};
		app.innerHTML = '';
		var top = h('header', { class: 'pp-top' }, [
			opts.back ? h('a', { class: 'pp-iconbtn', href: opts.back, 'aria-label': 'חזרה', html: ICON.back }) : h('img', { class: 'pp-logo', src: 'img/logo-mark.svg', alt: '', 'aria-hidden': 'true' }),
			h('div', { class: 'pp-brand' }, [opts.back ? title : 'POWERPASS', h('small', { text: opts.back ? 'POWERPASS' : 'סימולטור מבחני רישוי בחשמל' })]),
			PP.loggedIn() ? h('button', { type: 'button', class: 'pp-iconbtn', 'aria-label': 'סנכרון עכשיו', html: ICON.sync, onclick: function () { manualSync(); } }) : null
		]);
		app.appendChild(top);
		if (!online()) app.appendChild(h('div', { class: 'pp-offline', text: 'אין חיבור לאינטרנט · עובדים אופליין' }));
		var main = h('main', { class: 'pp-main' }, opts.back ? [] : [h('h1', { class: 'pp-h1', text: title })]);
		body.forEach(function (b) { if (b) main.appendChild(b); });
		app.appendChild(main);
		if (PP.loggedIn()) app.appendChild(tabs(opts.tab));
		PP.watermark();
		window.scrollTo(0, 0);
	}
	function tabs(on) {
		var items = [['home', 'בית', ICON.home], ['sims', 'סימולציות', ICON.list], ['calcs', 'מחשבונים', ICON.calc], ['journal', 'יומן', ICON.chart], ['account', 'חשבון', ICON.user]];
		return h('nav', { class: 'pp-tabs', 'aria-label': 'ניווט ראשי' }, items.map(function (it) {
			return h('a', { href: '#/' + it[0], class: on === it[0] ? 'is-on' : null, 'aria-current': on === it[0] ? 'page' : null }, [h('span', { html: it[2], 'aria-hidden': 'true' }), it[1]]);
		}));
	}

	/* ------------------------------------------------------------------ סנכרון + סטטוס */
	function syncLine() {
		var last = PP.jget(PP.K.sync, 0), pend = PP.pendingCount();
		var t = syncInfo.text || (last ? 'סונכרן לאחרונה: ' + PP.fmtDateTime(last) : 'עוד לא סונכרן');
		if (pend && !syncInfo.text) t += ' · ' + pend + ' פעולות ממתינות לסנכרון';
		return t;
	}
	function updateSyncEls() { Array.prototype.forEach.call(document.querySelectorAll('[data-sync]'), function (n) { n.textContent = syncLine(); }); }
	PP.on('sync', function (d) {
		if (d.phase === 'start') syncInfo.text = 'מסנכרן…';
		else if (d.phase === 'bank') syncInfo.text = 'מוריד את מאגר השאלות המוצפן…';
		else if (d.phase === 'images') syncInfo.text = d.total ? 'מוריד שרטוטים למכשיר: ' + d.done + ' מתוך ' + d.total : 'בודק שרטוטים…';
		else if (d.phase === 'done') { syncInfo.text = ''; route(); }
		else if (d.phase === 'error') { syncInfo.text = d.error && d.error.offline ? 'אין חיבור – עובדים עם הנתונים שבמכשיר' : ('הסנכרון נכשל: ' + ((d.error && d.error.message) || '')); }
		updateSyncEls();
	});
	PP.on('outbox', updateSyncEls);
	PP.on('net', function () { route(); });
	function manualSync() {
		if (!online()) { toast('אין חיבור לאינטרנט.'); return; }
		var before = (PP.me() || {}).membership || {};
		PP.sync().then(function () {
			var after = (PP.me() || {}).membership || {};
			toast(!before.member && after.member ? 'המנוי פעיל! המאגר זמין במכשיר.' : 'הסנכרון הושלם.');
		}).catch(function (e) { if (!e.code) toast(e.offline ? 'אין חיבור לאינטרנט.' : (e.message || 'הסנכרון נכשל.')); });
	}

	/* ------------------------------------------------------------------ התחברות */
	function viewLogin() {
		app.innerHTML = '';
		var S = PP.settings() || {}, kicked = PP.jget(PP.K.kicked, null);
		var err = h('div', { class: 'pp-err', role: 'alert', hidden: true });
		var user = h('input', { class: 'pp-input', id: 'lg-user', type: 'text', autocomplete: 'username', inputmode: 'email', dir: 'ltr', required: true });
		var pass = h('input', { class: 'pp-input', id: 'lg-pass', type: 'password', autocomplete: 'current-password', dir: 'ltr', required: true });
		var btn = h('button', { type: 'submit', class: 'pp-btn pp-btn-primary pp-btn-block', text: 'התחברות' });
		var extra = h('div');
		var form = h('form', { class: 'pp-card', novalidate: true, onsubmit: function (e) {
			e.preventDefault();
			err.hidden = true; extra.innerHTML = '';
			if (!user.value.trim() || !pass.value) { err.textContent = 'יש למלא שם משתמש (או אימייל) וסיסמה.'; err.hidden = false; return; }
			btn.disabled = true; btn.innerHTML = ''; btn.appendChild(h('span', { class: 'pp-spin', 'aria-hidden': 'true' })); btn.appendChild(document.createTextNode(' מתחבר…'));
			PP.login(user.value.trim(), pass.value).then(function (d) {
				pass.value = '';
				location.hash = '#/home';
				if (d.kicked_other) toast('התחברת ממכשיר חדש – המכשיר הקודם נותק אוטומטית. השימוש במנוי הינו אישי בלבד.');
				PP.sync().catch(function () {});
			}).catch(function (e) {
				btn.disabled = false; btn.textContent = 'התחברות';
				err.textContent = e.offline ? 'אין חיבור לאינטרנט. ההתחברות הראשונה דורשת חיבור לרשת.' : (e.message || 'ההתחברות נכשלה.');
				err.hidden = false;
				var url = e.data && e.data.data && e.data.data.url;
				if (e.code === 'moeqs_app_unverified' && url) extra.appendChild(h('p', {}, [h('button', { type: 'button', class: 'pp-link', text: 'לעמוד ההתחברות באתר (שליחה חוזרת של מייל האימות)', onclick: function () { PP.openExternal(url); } })]));
			});
		} }, [
			kicked ? h('div', { class: 'pp-note', role: 'alert' }, [h('strong', { text: kicked.kicked ? 'התנתקת מהמערכת. ' : '' }), kicked.msg]) : null,
			err,
			h('label', { class: 'pp-field', for: 'lg-user' }, [h('span', { text: 'שם משתמש או אימייל' }), user]),
			h('label', { class: 'pp-field', for: 'lg-pass' }, [h('span', { text: 'סיסמה' }), h('div', { class: 'pp-pass' }, [pass, h('button', { type: 'button', 'aria-label': 'הצגת הסיסמה', html: ICON.eye, onclick: function () { pass.type = pass.type === 'password' ? 'text' : 'password'; } })])]),
			btn, extra,
			h('p', { class: 'pp-muted', style: 'margin-top:12px' }, ['מתחברים עם אותו חשבון של האתר ', h('span', { dir: 'ltr', text: (S.biz && S.biz.site) || 'www.powerpass.co.il' }), '.']),
			h('div', { class: 'pp-actions' }, [
				h('button', { type: 'button', class: 'pp-link', text: 'שכחתי סיסמה', onclick: function () { PP.openExternal((S.urls && S.urls.lost) || C.SITE_URL + '/wp-login.php?action=lostpassword'); } }),
				C.STORE_MODE ? null : h('button', { type: 'button', class: 'pp-link', text: 'אין לי חשבון – להרשמה באתר', onclick: function () { PP.openExternal((S.urls && S.urls.register) || C.SITE_URL); } })
			])
		]);
		app.appendChild(h('div', { class: 'pp-login' }, [
			h('div', { class: 'pp-hero' }, [h('img', { src: 'img/logo-mark.svg', alt: '' }), h('h1', { text: 'POWERPASS' }), h('p', { text: 'סימולטור מבחני רישוי בחשמל' })]),
			h('main', { class: 'pp-main' }, [form, h('p', { class: 'pp-muted', style: 'text-align:center' }, ['© ' + ((S.biz && S.biz.name) ? 'POWERPASS · ' : '') + 'עודד אלקטריק · כל הזכויות שמורות'])])
		]));
	}

	/* ------------------------------------------------------------------ בית */
	function subCard() {
		var m = PP.me() || {}, ms = m.membership || {}, card = h('div', { class: 'pp-card' });
		if (m.user && m.user.admin) { card.appendChild(h('h3', { text: 'חשבון מנהל' })); card.appendChild(h('p', { class: 'pp-muted', text: 'גישה מלאה ללא הגבלה.' })); return card; }
		if (ms.frozen_until) {
			card.appendChild(h('div', { class: 'pp-row' }, [h('h3', { class: 'pp-grow', text: 'הגישה הושהתה זמנית' }), h('span', { class: 'pp-badge is-bad', text: 'מושהה' })]));
			card.appendChild(h('p', { class: 'pp-muted', text: 'זוהתה פעילות חריגה ממספר רב של מכשירים. בהתאם לתקנון האתר, החשבון מיועד לשימוש אישי בלבד. הגישה תחזור אוטומטית ב-' + PP.fmtDateTime(ms.frozen_until) + '.' }));
			return card;
		}
		if (ms.member && ms.paid_until > PP.now()) {
			var days = Math.max(0, Math.ceil(ms.left / 86400));
			card.appendChild(h('div', { class: 'pp-row' }, [h('h3', { class: 'pp-grow', text: 'מנוי פעיל' + (ms.plan_name ? ' · ' + ms.plan_name : '') }), h('span', { class: 'pp-badge' + (days <= 7 ? ' is-warn' : ''), text: 'נותרו ' + daysText(days) })]));
			card.appendChild(h('div', { class: 'pp-bar', role: 'progressbar', 'aria-valuenow': String(100 - (ms.used_pct || 0)), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [h('i', { style: 'width:' + Math.max(3, 100 - (ms.used_pct || 0)) + '%' })]));
			card.appendChild(h('p', { class: 'pp-muted', text: 'בתוקף עד ' + PP.fmtDate(ms.paid_until) }));
			if (days <= 14 && !C.STORE_MODE) card.appendChild(h('div', { class: 'pp-actions' }, [h('a', { class: 'pp-btn', href: '#/plans', text: 'הארכת המנוי' })]));
			return card;
		}
		if (ms.member && ms.free_open) { card.appendChild(h('h3', { text: 'גישה פתוחה' })); card.appendChild(h('p', { class: 'pp-muted', text: 'כרגע הסימולציות פתוחות לכל המשתמשים הרשומים.' })); return card; }
		card.appendChild(h('div', { class: 'pp-row' }, [h('h3', { class: 'pp-grow', text: 'אין מנוי פעיל' }), h('span', { class: 'pp-badge is-bad', text: ms.paid_until ? 'פג תוקף' : 'לא פעיל' })]));
		if (C.STORE_MODE) card.appendChild(h('p', { class: 'pp-muted', text: 'לחשבון הזה אין כרגע מנוי פעיל. לאחר הפעלת המנוי בחשבון, לחצו על סנכרון.' }));
		else {
			card.appendChild(h('p', { class: 'pp-muted', text: 'למנוי פעיל יש גישה מלאה לכל הסימולציות, גם בלי אינטרנט.' }));
			card.appendChild(h('div', { class: 'pp-actions' }, [h('a', { class: 'pp-btn pp-btn-primary', href: '#/plans', text: 'למסלולי המנוי' })]));
		}
		return card;
	}
	function offlineCard() {
		var L = PP.license(), man = PP.jget(PP.K.manifest, null), card = h('div', { class: 'pp-card' });
		var head = h('div', { class: 'pp-row' }, [h('h3', { class: 'pp-grow', text: 'תרגול אופליין' })]);
		card.appendChild(head);
		if (L.ok) {
			head.appendChild(h('span', { class: 'pp-badge' + (L.daysLeft <= 1 ? ' is-warn' : ''), text: 'זמין עוד ' + daysText(L.daysLeft) }));
			card.appendChild(h('p', { class: 'pp-muted', text: 'אפשר לתרגל בלי אינטרנט עד ' + PP.fmtDateTime(L.until) + '. כל חיבור לרשת מחדש את התקופה.' }));
		} else if (L.reason === 'offline_expired' || L.reason === 'clock') {
			head.appendChild(h('span', { class: 'pp-badge is-warn', text: 'נדרש חיבור' }));
			card.appendChild(h('p', { class: 'pp-muted', text: L.reason === 'clock' ? 'שעון המכשיר הוחזר אחורה. התחברו לאינטרנט כדי לחדש את הגישה.' : 'עברו ' + daysText((PP.settings() || {}).offline_days || 7) + ' ללא חיבור. התחברו לרשת לרגע כדי להמשיך לתרגל.' }));
		} else {
			head.appendChild(h('span', { class: 'pp-badge is-bad', text: 'לא זמין' }));
			card.appendChild(h('p', { class: 'pp-muted', text: 'המאגר נפתח במכשיר רק למנוי פעיל.' }));
		}
		if (man) card.appendChild(h('p', { class: 'pp-muted', text: 'מאגר גרסה ' + man.version + ' · ' + num(man.count) + ' שאלות · ' + num((man.images || []).length) + ' שרטוטים' }));
		card.appendChild(h('p', { class: 'pp-muted', 'data-sync': '1', text: syncLine() }));
		return card;
	}
	function resumeCard() {
		var key, run;
		try { key = localStorage.getItem('moeqs_lastrun'); run = key ? JSON.parse(localStorage.getItem(key) || 'null') : null; } catch (e) { run = null; }
		if (!run || !run.items || !run.items.length || Date.now() - run.at > 7 * 864e5 || !run.url) return null;
		var u; try { u = new URL(run.url, location.href); } catch (e) { return null; }
		if (run.rs && run.rn && run.rn.length) { u.searchParams.set('mr', run.rn.join('.')); u.searchParams.set('ms', run.rs); }
		u.searchParams.set('moeqs_resume', '1');
		var answered = run.items.filter(function (x) { return x[1] >= 0; }).length;
		return h('a', { class: 'pp-card pp-sim', href: 'quiz.html' + u.search }, [
			h('span', { class: 'pp-ic is-b', text: '⏯', 'aria-hidden': 'true' }),
			h('div', { class: 'pp-grow' }, [h('h3', { text: 'המשך מהנקודה שנשמרה' }), h('p', { text: (run.label || 'סימולציה') + ' · שאלה ' + (Math.min(run.i, run.items.length - 1) + 1) + ' מתוך ' + run.items.length + ' · נענו ' + answered + (run.timed ? ' · נותר ' + fmtSecs(run.left / 1000) : '') })]),
			h('span', { class: 'pp-chev', text: '‹', 'aria-hidden': 'true' })
		]);
	}
	function simCard(href, icon, title, sub, cls) {
		return h('a', { class: 'pp-card pp-sim', href: href }, [h('span', { class: 'pp-ic' + (cls ? ' ' + cls : ''), text: icon, 'aria-hidden': 'true' }), h('div', { class: 'pp-grow' }, [h('h3', { text: title }), sub ? h('p', { text: sub }) : null]), h('span', { class: 'pp-chev', text: '‹', 'aria-hidden': 'true' })]);
	}
	function selLic() { var m = PP.me() || {}; var l = localStorage.getItem('pp_sel_lic') || (m.user && m.user.license) || 'eng'; return ['eng', 'hand', 'tech'].indexOf(l) >= 0 ? l : 'eng'; }
	function viewHome() {
		var m = PP.me() || { user: {} }, S = PP.settings() || {}, lic = selLic(), L = PP.license();
		var body = [subCard(), offlineCard()];
		if (L.ok) {
			body.push(h('h2', { class: 'pp-h2', text: 'התחלה מהירה' }));
			body.push(resumeCard());
			body.push(simCard('quiz.html?sim=exam&lic=' + lic, '📝', 'מבחן מלא', (S.exam_count || 50) + ' שאלות · ' + fmtSecs((S.exam_minutes || 210) * 60) + ' שעות · ציון עובר ' + (S.pass || 80)));
			body.push(simCard('quiz.html?sim=quick&lic=' + lic, '⚡', (S.quick_count || 10) + ' שאלות מהירות', 'בדיקת מוכנות קצרה עם טיימר', 'is-b'));
		}
		var ex = (S.exams || []).filter(function (e) { return e.ts > PP.now() - 86400; }).slice(0, 3);
		if (ex.length) {
			body.push(h('h2', { class: 'pp-h2', text: 'מועדי בחינה קרובים' }));
			var next = ex[0];
			var countdown = h('div', { class: 'pp-countdown' });
			function renderCountdown() {
				var diff = Math.max(0, next.ts - Math.floor(Date.now() / 1000));
				var d = Math.floor(diff / 86400), hh = Math.floor((diff % 86400) / 3600), mm = Math.floor((diff % 3600) / 60), ss = diff % 60;
				countdown.innerHTML = '';
				[['ימים', d], ['שעות', hh], ['דקות', mm], ['שניות', ss]].forEach(function (p) {
					var unit = h('div', { class: 'pp-cd-unit' }, [h('span', { class: 'pp-cd-num', text: String(p[1]).padStart(2, '0') }), h('span', { class: 'pp-cd-lbl', text: p[0] })]);
					countdown.appendChild(unit);
				});
			}
			renderCountdown();
			var cdTimer = setInterval(renderCountdown, 1000);
			window.addEventListener('hashchange', function cleanup() { clearInterval(cdTimer); window.removeEventListener('hashchange', cleanup); });
			var examLabel = next.for ? '⚡ ' + next.for : '⚡ הבחינה הממשלתית הקרובה';
			var examSub = next.date + (next.time ? ' בשעה ' + next.time : '') + (next.place ? ' · ' + next.place : '');
			var cdCard = h('div', { class: 'pp-card pp-cd-card' }, [
				h('div', { class: 'pp-cd-head' }, [h('strong', { text: examLabel }), h('small', { class: 'pp-muted', text: examSub })]),
				countdown
			]);
			body.push(cdCard);
			ex.slice(1).forEach(function (e) {
				body.push(h('div', { class: 'pp-card pp-hist-row' }, [h('div', { class: 'pp-grow' }, [h('strong', { text: e.date + (e.time ? ' · ' + e.time : '') }), h('div', { class: 'pp-muted', text: [e.place, e.for].filter(Boolean).join(' · ') })])]));
			});
		}
		shell('שלום' + (m.user.first || m.user.name ? ', ' + (m.user.first || m.user.name) : ''), body, { tab: 'home' });
	}

	/* ------------------------------------------------------------------ סימולציות */
	function licSeg(onChange) {
		var S = PP.settings() || {}, lics = S.licenses || { eng: 'חשמלאי-מהנדס', hand: 'חשמלאי-הנדסאי', tech: 'חשמלאי-טכנאי' }, cur = selLic();
		return h('div', { class: 'pp-seg', role: 'radiogroup', 'aria-label': 'סוג הרישיון' }, Object.keys(lics).map(function (k) {
			return h('button', { type: 'button', role: 'radio', 'aria-checked': k === cur ? 'true' : 'false', class: k === cur ? 'is-on' : null, text: lics[k].replace('חשמלאי-', ''), onclick: function () { localStorage.setItem('pp_sel_lic', k); onChange(); } });
		}));
	}
	function locked(L) {
		var R = { not_member: 'הסימולציות פתוחות למנויים פעילים.', frozen: 'הגישה הושהתה זמנית.', offline_expired: 'נדרש חיבור לאינטרנט כדי לחדש את הגישה האופליין.', clock: 'שעון המכשיר אינו תקין. התחברו לאינטרנט כדי לחדש את הגישה.', logged_out: 'יש להתחבר.' };
		return h('div', { class: 'pp-card pp-msg' }, [h('h3', { text: R[L.reason] || 'הסימולציות אינן זמינות כרגע.' }), (!C.STORE_MODE && L.reason === 'not_member') ? h('div', { class: 'pp-actions' }, [h('a', { class: 'pp-btn pp-btn-primary', href: '#/plans', text: 'למסלולי המנוי' })]) : null]);
	}
	function viewSims() {
		var S = PP.settings() || {}, L = PP.license(), st = PP.state(), lic = selLic();
		if (!L.ok) { shell('סימולציות', [locked(L)], { tab: 'sims' }); return; }
		var cnt = h('div', { class: 'pp-row' });
		var timer = h('input', { type: 'checkbox', id: 'eo-tm' });
		var from = h('input', { class: 'pp-input', type: 'number', inputmode: 'numeric', min: '1', max: '1200', placeholder: 'מ-', 'aria-label': 'משאלה' });
		var to = h('input', { class: 'pp-input', type: 'number', inputmode: 'numeric', min: '1', max: '1200', placeholder: 'עד', 'aria-label': 'עד שאלה' });
		var wrongN = Object.keys(st.wrong || {}).length;
		shell('סימולציות', [
			licSeg(viewSims),
			h('h2', { class: 'pp-h2', text: 'מבחנים' }),
			resumeCard(),
			simCard('quiz.html?sim=exam&lic=' + lic, '📝', 'מבחן מלא', (S.exam_count || 50) + ' שאלות אקראיות · ' + fmtSecs((S.exam_minutes || 210) * 60) + ' שעות · התשובות בסוף'),
			simCard('quiz.html?sim=quick&lic=' + lic, '⚡', (S.quick_count || 10) + ' שאלות מהירות', 'עם טיימר, לבדיקת מוכנות קצרה', 'is-b'),
			simCard('quiz.html?sim=practice&lic=' + lic, '✅', 'מבחן מלא עם תשובות מיידיות', 'ללא טיימר · אחרי כל תשובה מוצג מיד אם צדקתם', 'is-c'),
			h('h2', { class: 'pp-h2', text: 'תרגול ממוקד' }),
			simCard('#/topics', '🧭', 'תרגול לפי נושא', 'שנאים, הארקות, מתח גבוה ועוד'),
			simCard('quiz.html?sim=saved&lic=' + lic, '⭐', 'השאלות ששמרתי', st.saved.length ? num(st.saved.length) + ' שאלות' : 'עדיין לא נשמרו שאלות', 'is-b'),
			simCard('quiz.html?sim=mistakes&lic=' + lic, '🎯', 'השאלות שטעיתי בהן', wrongN ? num(wrongN) + ' שאלות לתרגול חוזר' : 'אין כרגע שאלות שגויות', 'is-c'),
			h('div', { class: 'pp-card' }, [
				h('h3', { text: 'תרגול לפי מספרי שאלות' }),
				h('div', { class: 'pp-grid', style: 'margin-top:8px' }, [from, to]),
				h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn pp-btn-block', text: 'התחלת תרגול', onclick: function () {
					var a = parseInt(from.value, 10), b = parseInt(to.value, 10);
					if (!(a > 0) || !(b > 0)) { toast('יש להזין מספר שאלה התחלתי וסופי.'); return; }
					if (a > b) { var t = a; a = b; b = t; }
					location.href = 'quiz.html?sim=range&r=' + a + '-' + b;
				} })])
			]),
			h('div', { class: 'pp-card' }, [
				h('h3', { text: 'שאלות למהנדסים בלבד' }),
				h('p', { class: 'pp-muted', text: 'רשימה א\' של משרד העבודה.' }),
				h('label', { class: 'pp-row', style: 'margin:10px 0 0;gap:8px', for: 'eo-tm' }, [timer, h('span', { text: 'עם טיימר, כמו בבחינה' })]),
				h('div', { class: 'pp-grid', style: 'margin-top:10px' }, [
					h('button', { type: 'button', class: 'pp-btn', text: 'כל השאלות', onclick: function () { location.href = 'quiz.html?sim=engonly&cnt=all' + (timer.checked ? '&tm=1' : ''); } }),
					h('button', { type: 'button', class: 'pp-btn', text: (S.exam_count || 50) + ' אקראיות', onclick: function () { location.href = 'quiz.html?sim=engonly&cnt=50' + (timer.checked ? '&tm=1' : ''); } })
				])
			]),
			cnt.childNodes.length ? cnt : null
		], { tab: 'sims' });
	}
	function viewTopics() {
		var L = PP.license(), lic = selLic();
		if (!L.ok) { shell('תרגול לפי נושא', [locked(L)], { back: '#/sims', tab: 'sims' }); return; }
		var list = h('div', {}, [h('div', { class: 'pp-card pp-msg' }, [h('span', { class: 'pp-spin' }), ' טוען נושאים…'])]);
		shell('תרגול לפי נושא', [licSeg(viewTopics), list], { back: '#/sims', tab: 'sims' });
		PP.openBank().then(function (bank) {
			var A = {}, B = {}; bank.levels.A.forEach(function (n) { A[n] = 1; }); bank.levels.B.forEach(function (n) { B[n] = 1; });
			var ok = function (n) { return lic === 'tech' ? !A[n] && !B[n] : (lic === 'hand' ? !A[n] : true); };
			list.innerHTML = '';
			bank.topics.forEach(function (t, i) {
				var c = t.ns.filter(ok).length;
				if (c) list.appendChild(simCard('quiz.html?sim=topic&t=' + i + '&lic=' + lic, '📘', t.name, num(c) + ' שאלות', i % 3 === 1 ? 'is-b' : (i % 3 === 2 ? 'is-c' : '')));
			});
		}).catch(function (e) { list.innerHTML = ''; list.appendChild(locked({ reason: e.reason || 'no_bank' })); });
	}

	/* ------------------------------------------------------------------ יומן */
	function viewJournal() {
		var st = PP.state(), S = PP.settings() || {}, pass = S.pass || 80;
		var hist = (st.history || []).slice().sort(function (a, b) { return b.time - a.time; });
		var sims = hist.length, avg = sims ? Math.round(hist.reduce(function (s, x) { return s + (x.pct || 0); }, 0) / sims) : 0;
		var passed = hist.filter(function (x) { return x.pct >= pass; }).length;
		var ok = 0, bad = 0; Object.keys(st.qstats || {}).forEach(function (n) { var r = st.qstats[n]; ok += r[0] | 0; bad += r[1] | 0; });
		var acc = ok + bad ? Math.round(100 * ok / (ok + bad)) : 0;
		var body = [
			h('div', { class: 'pp-stats' }, [
				h('div', { class: 'pp-stat' }, [h('b', { text: num(sims) }), h('span', { text: 'סימולציות' })]),
				h('div', { class: 'pp-stat' }, [h('b', { text: sims ? String(avg) : '–' }), h('span', { text: 'ציון ממוצע' })]),
				h('div', { class: 'pp-stat' }, [h('b', { text: sims ? num(passed) : '–' }), h('span', { text: 'עברו (' + pass + '+)' })]),
				h('div', { class: 'pp-stat' }, [h('b', { text: ok + bad ? acc + '%' : '–' }), h('span', { text: 'דיוק בתשובות (' + num(ok + bad) + ')' })])
			])
		];
		if (!sims) body.push(h('div', { class: 'pp-card pp-msg' }, [h('p', { text: 'עדיין לא נשמרו סימולציות. כל מבחן שתסיימו יופיע כאן – גם אם תרגלתם בלי אינטרנט.' })]));
		else body.push(h('div', { class: 'pp-card' }, hist.slice(0, 150).map(function (r) {
			return h('div', { class: 'pp-hist' }, [
				h('div', { class: 'pp-score' + (r.pct >= pass ? '' : ' is-fail'), text: String(r.pct) }),
				h('div', { class: 'pp-grow' }, [h('strong', { text: r.label || 'סימולציה' }), h('div', { class: 'pp-muted', text: PP.fmtDateTime(r.time) + ' · ' + r.correct + '/' + r.total + ' · ' + fmtSecs(r.secs) }), r.pending ? h('span', { class: 'pp-badge is-warn', text: 'ממתין לסנכרון' }) : null])
			]);
		})));
		body.push(h('p', { class: 'pp-muted', 'data-sync': '1', text: syncLine() }));
		shell('יומן המבחנים שלי', body, { tab: 'journal' });
	}

	/* ------------------------------------------------------------------ חשבון */
	function viewAccount() {
		var m = PP.me() || { user: {}, membership: {} }, S = PP.settings() || {}, L = PP.license(), u = m.user || {}, ms = m.membership || {};
		var urls = S.urls || {};
		var pref = PP.themePref();
		var themeSeg = h('div', { class: 'pp-seg', role: 'radiogroup', 'aria-label': 'מצב תצוגה' }, [['auto', 'אוטומטי'], ['light', 'בהיר'], ['dark', 'כהה']].map(function (t) {
			return h('button', { type: 'button', role: 'radio', 'aria-checked': pref === t[0] ? 'true' : 'false', class: pref === t[0] ? 'is-on' : null, text: t[1], onclick: function () { PP.setTheme(t[0]); viewAccount(); } });
		}));
		var linkBtn = function (text, url) { return url ? h('button', { type: 'button', class: 'pp-link', style: 'display:block;margin:6px 0', text: text, onclick: function () { PP.openExternal(url); } }) : null; };
		shell('החשבון שלי', [
			h('div', { class: 'pp-card' }, [
				h('h3', { text: u.name || u.login || '' }),
				h('p', { class: 'pp-muted', dir: 'ltr', style: 'text-align:right', text: u.email || '' }),
				u.phone ? h('p', { class: 'pp-muted', dir: 'ltr', style: 'text-align:right', text: u.phone }) : null,
				h('p', { class: 'pp-muted', text: 'סוג רישיון: ' + (u.license_label || '') })
			]),
			subCard(),
			h('div', { class: 'pp-card' }, [
				h('h3', { text: 'המכשיר הזה' }),
				h('p', { class: 'pp-muted', text: L.ok ? 'תרגול אופליין זמין עד ' + PP.fmtDateTime(L.until) : 'תרגול אופליין לא זמין כרגע' }),
				h('p', { class: 'pp-muted', 'data-sync': '1', text: syncLine() }),
				h('p', { class: 'pp-muted', text: 'ניתן להשתמש במנוי ממכשיר אחד בכל רגע נתון. התחברות במחשב או בטלפון אחר מנתקת את האפליקציה.' }),
				h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn', text: 'סנכרון עכשיו', onclick: manualSync })])
			]),
			h('h2', { class: 'pp-h2', text: 'תצוגה' }),
			themeSeg,
			h('h2', { class: 'pp-h2', text: 'קישורים' }),
			h('div', { class: 'pp-card' }, [
				C.STORE_MODE ? null : h('button', { type: 'button', class: 'pp-link', style: 'display:block;margin:6px 0', text: 'ניהול החשבון באתר', onclick: function () { if (!online()) { toast('אין חיבור לאינטרנט.'); return; } PP.openSite('account').catch(function (e) { toast(e.message || 'לא הצלחנו לפתוח את האתר.'); }); } }),
				linkBtn('תקנון האתר', urls.terms), linkBtn('מדיניות פרטיות', urls.privacy), linkBtn('הצהרת נגישות', urls.a11y), linkBtn('צור קשר', urls.contact), linkBtn('בדיקת ציונים במשרד העבודה', urls.results)
			]),
			h('h2', { class: 'pp-h2', text: 'נתונים' }),
			h('div', { class: 'pp-card' }, [
				h('p', { class: 'pp-muted', text: 'איפוס מוחק את כל הסימולציות, הציונים והשאלות שטעיתם בהן (בחשבון, גם באתר).' }),
				h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn pp-btn-danger', text: 'איפוס הסטטיסטיקה', onclick: resetStats })])
			]),
			h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn pp-btn-block', text: 'התנתקות', onclick: doLogout })]),
			h('p', { class: 'pp-muted', style: 'text-align:center;margin-top:16px', text: 'POWERPASS · גרסת אפליקציה ' + C.APP_VERSION + (S.plugin ? ' · תוסף ' + S.plugin : '') + (S.bank ? ' · מאגר ' + S.bank.version : '') }),
			h('p', { class: 'pp-muted', style: 'text-align:center', text: ((S.biz && S.biz.name) || 'פאוור פס') + ' · עודד אלקטריק · ע.פ. ' + ((S.biz && S.biz.id) || '') })
		], { tab: 'account' });
	}
	function resetStats() {
		if (!online()) { toast('האיפוס דורש חיבור לאינטרנט.'); return; }
		confirmBox('האם אתה בטוח שברצונך לאפס את הסטטיסטיקה?', 'כל הסימולציות, הציונים, הסטטיסטיקה לפי נושא והשאלות שטעית בהן יימחקו. לא ניתן יהיה לשחזר את הנתונים.', 'כן, אפס הכול', function () {
			PP.sync().catch(function () {}).then(function () { return PP.api('POST', '/reset', { with_saved: 0 }); })
				.then(function () { PP.setState({ history: [], saved: PP.state().saved, qstats: {}, wrong: {} }); return PP.sync(); })
				.then(function () { toast('הסטטיסטיקה אופסה בהצלחה.'); viewAccount(); }, function (e) { toast(e.message || 'האיפוס נכשל.'); });
		});
	}
	function doLogout() {
		var pend = PP.pendingCount();
		var go = function () { PP.logout().then(function () { location.hash = '#/login'; }); };
		var run = function () { if (pend && online()) PP.sync().catch(function () {}).then(go); else go(); };
		if (pend && !online()) confirmBox('יש נתונים שעוד לא סונכרנו', 'במכשיר יש ' + pend + ' פעולות שנאספו בלי אינטרנט. התנתקות עכשיו תמחק אותן. מומלץ להתחבר לרשת קודם.', 'להתנתק בכל זאת', run);
		else confirmBox('להתנתק מהאפליקציה?', 'המאגר המוצפן יימחק מהמכשיר. בהתחברות הבאה הוא יורד שוב.', 'התנתקות', run);
	}
	function confirmBox(title, text, yes, fn) {
		var wrap = h('div', { class: 'pp-modal', role: 'dialog', 'aria-modal': 'true' });
		var close = function () { wrap.remove(); };
		wrap.appendChild(h('div', { class: 'pp-card' }, [h('h3', { text: title }), h('p', { class: 'pp-muted', text: text }), h('div', { class: 'pp-actions' }, [
			h('button', { type: 'button', class: 'pp-btn pp-btn-primary', text: yes, onclick: function () { close(); fn(); } }),
			h('button', { type: 'button', class: 'pp-btn', text: 'ביטול', onclick: close })
		])]));
		wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
		document.body.appendChild(wrap);
		wrap.querySelector('.pp-btn-primary').focus();
	}

	/* ------------------------------------------------------------------ מסלולים (רק בהפצה ישירה, לא במצב חנות) */
	function viewPlans() {
		if (C.STORE_MODE) { location.hash = '#/home'; return; }
		var box = h('div', {}, [h('div', { class: 'pp-card pp-msg' }, [h('span', { class: 'pp-spin' }), ' טוען מסלולים…'])]);
		shell('מסלולי מנוי', [box], { back: '#/home', tab: 'home' });
		PP.api('GET', '/app/plans', undefined, { auth: false }).then(function (d) {
			box.innerHTML = '';
			box.appendChild(h('p', { class: 'pp-note', text: 'הרכישה מתבצעת באתר, בדף תשלום מאובטח (Smartbee / MAX), כולל אישור התקנון. אחרי התשלום חזרו לאפליקציה – המנוי והמאגר יתעדכנו אוטומטית.' }));
			d.plans.forEach(function (p) {
				box.appendChild(h('div', { class: 'pp-card pp-plan' + (p.popular ? ' is-pop' : '') }, [
					p.popular ? h('span', { class: 'pp-pop', text: 'הכי משתלם' }) : null,
					h('h3', { text: p.name }),
					h('div', { class: 'pp-price' }, [num(p.price) + ' ₪']),
					h('p', { class: 'pp-muted', text: Math.round(p.days) + ' ימי גישה מלאה' }),
					p.features.length ? h('ul', {}, p.features.map(function (f) { return h('li', { text: f }); })) : null,
					h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn ' + (p.popular ? 'pp-btn-primary' : '') + ' pp-btn-block', text: 'המשך לרכישה מאובטחת באתר', onclick: function () {
						PP.openSite('plans', p.key).catch(function (e) { toast(e.offline ? 'אין חיבור לאינטרנט.' : (e.message || 'לא הצלחנו לפתוח את דף הרכישה.')); });
					} })])
				]));
			});
			if (d.note) box.appendChild(h('p', { class: 'pp-muted', text: d.note }));
		}).catch(function (e) { box.innerHTML = ''; box.appendChild(h('div', { class: 'pp-card pp-msg' }, [h('p', { text: e.offline ? 'אין חיבור לאינטרנט.' : (e.message || 'שגיאה') })])); });
	}

	/* ------------------------------------------------------------------ ניתוב */
	/* ------------------------------------------------------------------ מחשבונים
	   רגילים: לכל משתמש מחובר. מתקדמים + מחולל השרטוט: למנוי פעיל (אותו רישיון כמו הסימולציות, גם אופליין).
	   כלי שהמנהל סגר באתר לא מוצג. הכול רץ במכשיר, בלי אינטרנט (calc.html). */
	function calcTile(it, locked) {
		return h('a', { class: 'pp-ctile' + (locked ? ' is-locked' : ''), href: locked ? '#/calcs' : 'calc.html?c=' + encodeURIComponent(it.id), 'aria-disabled': locked ? 'true' : null,
			onclick: locked ? function (e) { e.preventDefault(); toast('הכלים המתקדמים פתוחים למנויים פעילים.'); } : null }, [
			h('span', { class: 'pp-ctile-ic', 'aria-hidden': 'true', html: locked ? '🔒' : ICON.calc }),
			h('strong', { text: it.t }),
			h('small', { text: it.d })
		]);
	}
	function viewCalcs() {
		var CAT = window.PP_CALCS || { basic: [], pro: [] }, L = PP.license(), tools = PP.jget('pp_tools', {}) || {}, off = tools.off || [];
		var pro = CAT.pro.filter(function (it) { return off.indexOf(it.id) < 0; });
		var body = [
			h('div', { class: 'pp-cgrid' }, CAT.basic.map(function (it) { return calcTile(it, false); }))
		];
		if (pro.length) {
			body.push(h('h2', { class: 'pp-h2', text: L.ok ? 'כלים מתקדמים לחשמלאי' : 'כלים מתקדמים לחשמלאי · למנויים' }));
			if (!L.ok && L.reason === 'not_member') {
				body.push(h('div', { class: 'pp-card pp-msg' }, [h('p', { text: 'מחולל שרטוט חד קווי ומחשבוני שטח: עכבת לולאת תקלה, מפל מתח ועמדת טעינה, התאמת מבטח לכבל ועלות חשמל. פתוחים למנויים פעילים, גם בלי אינטרנט.' }),
					!C.STORE_MODE ? h('div', { class: 'pp-actions' }, [h('a', { class: 'pp-btn pp-btn-primary', href: '#/plans', text: 'למסלולי המנוי' })]) : null]));
			}
			body.push(h('div', { class: 'pp-cgrid' }, pro.map(function (it) { return calcTile(it, !L.ok); })));
		}
		shell('מחשבונים', body, { tab: 'calcs' });
		/* רענון שקט: אילו כלים סגורים באתר ותעריף החשמל (נשמר במכשיר לשימוש אופליין) */
		if (online() && !viewCalcs.busy) {
			viewCalcs.busy = true;
			PP.api('GET', '/app/tools', undefined, { auth: false }).then(function (d) {
				viewCalcs.busy = false;
				if (!d || !Array.isArray(d.off)) return;
				var before = JSON.stringify(PP.jget('pp_tools', {}));
				PP.jset('pp_tools', d);
				if (before !== JSON.stringify(d) && location.hash.indexOf('#/calcs') === 0) viewCalcs();
			}).catch(function () { viewCalcs.busy = false; });
		}
	}

	var VIEWS = { home: viewHome, sims: viewSims, calcs: viewCalcs, topics: viewTopics, journal: viewJournal, account: viewAccount, plans: viewPlans };
	function route() {
		var name = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
		if (!PP.loggedIn()) { if (name !== 'login') { history.replaceState(null, '', '#/login'); } viewLogin(); return; }
		if (name === 'login' || !VIEWS[name]) { history.replaceState(null, '', '#/home'); name = 'home'; }
		VIEWS[name]();
	}

	/* ניתוק ממכשיר אחר / התנתקות */
	PP.on('logout', function (d) {
		if (d.kicked || d.msg) {
			var wrap = h('div', { class: 'pp-modal', role: 'alertdialog', 'aria-modal': 'true' }, [h('div', { class: 'pp-card' }, [
				h('h3', { text: d.kicked ? 'התנתקת מהמערכת' : 'ההתחברות הסתיימה' }), h('p', { class: 'pp-muted', text: d.msg }),
				h('div', { class: 'pp-actions' }, [h('button', { type: 'button', class: 'pp-btn pp-btn-primary', text: 'התחברות מחדש', onclick: function () { wrap.remove(); location.hash = '#/login'; route(); } })])
			])]);
			document.body.appendChild(wrap);
		}
		location.hash = '#/login';
	});
	PP.on('settings', function (s) { PP.applyPalette(s); });

	/* כפתור "חזרה" של אנדרואיד */
	var App = PP.plugin('App');
	if (App) App.addListener('backButton', function () {
		var modal = document.querySelector('.pp-modal'); if (modal) { modal.remove(); return; }
		var name = location.hash.replace(/^#\/?/, '');
		if (name === 'topics') { location.hash = '#/sims'; return; }
		if (name === 'plans') { location.hash = '#/home'; return; }
		if (name && name !== 'home' && name !== 'login') { location.hash = '#/home'; return; }
		App.exitApp();
	});

	window.addEventListener('hashchange', route);
	PP.applyPalette(); PP.shield(); PP.interceptLinks(); PP.lifecycle();
	route();
	/* סנכרון בפתיחה (אם יש רשת); בלי רשת – עובדים עם מה שבמכשיר */
	if (online()) PP.sync({ quiet: true }).catch(function () {});
})();
