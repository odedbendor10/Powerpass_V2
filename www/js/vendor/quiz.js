/* סימולטור מבחני רישוי – צד האתר */
(function () {
	'use strict';

	var HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
	var IMG = /^\[\[img:(.+)\]\]$/;
	var uid = 0;

	function el(tag, props, children) {
		var n = document.createElement(tag);
		if (props) {
			Object.keys(props).forEach(function (k) {
				var v = props[k];
				if (v === null || v === undefined || v === false) return;
				if (k === 'class') n.className = v;
				else if (k === 'text') n.textContent = v;
				else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
				else n.setAttribute(k, v === true ? '' : v);
			});
		}
		(children || []).forEach(function (c) {
			if (c === null || c === undefined || c === false) return;
			n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
		});
		return n;
	}
	function shuffle(arr) {
		var a = arr.slice();
		for (var i = a.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var t = a[i]; a[i] = a[j]; a[j] = t;
		}
		return a;
	}
	function fmt(sec) {
		sec = Math.max(0, Math.ceil(sec));
		var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
		return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
	}
	function label(cfg, k) { return cfg.labels === 'heb' ? (HEB[k] || String(k + 1)) : String(k + 1); }

	/* הגדלת שרטוט למסך מלא: גלגלת/צביטה/כפתורים להגדלה, גרירה להזזה, Esc / X / לחיצה מחוץ לשרטוט לסגירה */
	function openLightbox(src, alt) {
		var dlg = document.getElementById('moeqs-lightbox');
		if (!dlg) {
			var im = el('img', { class: 'moeqs-lb-img', alt: '', draggable: 'false' });
			var stage = el('div', { class: 'moeqs-lb-stage' }, [im]);
			var sc = 1, tx = 0, ty = 0, pts = {}, base = null, moved = false;
			var apply = function () { im.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')'; stage.classList.toggle('is-zoomed', sc > 1.01); };
			var reset = function () { sc = 1; tx = 0; ty = 0; apply(); };
			var zoomAt = function (f, cx, cy) {
				var r = stage.getBoundingClientRect(), px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
				var ns = Math.min(8, Math.max(1, sc * f)), k = ns / sc;
				tx = px - (px - tx) * k; ty = py - (py - ty) * k; sc = ns;
				if (sc <= 1.01) { tx = 0; ty = 0; }
				apply();
			};
			var zoomBy = function (f) { var r = stage.getBoundingClientRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); };
			var snap = function () { base = { sc: sc, tx: tx, ty: ty, pts: JSON.parse(JSON.stringify(pts)) }; };
			stage.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY); }, { passive: false });
			stage.addEventListener('pointerdown', function (e) { try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false; snap(); });
			stage.addEventListener('pointermove', function (e) {
				if (!pts[e.pointerId] || !base) return;
				pts[e.pointerId] = { x: e.clientX, y: e.clientY };
				var ids = Object.keys(pts);
				if (ids.length === 2 && base.pts[ids[0]] && base.pts[ids[1]]) { // צביטה
					var a0 = base.pts[ids[0]], b0 = base.pts[ids[1]], a1 = pts[ids[0]], b1 = pts[ids[1]];
					var d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1, d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
					var r = stage.getBoundingClientRect(), cx = (a0.x + b0.x) / 2 - (r.left + r.width / 2), cy = (a0.y + b0.y) / 2 - (r.top + r.height / 2);
					var ns = Math.min(8, Math.max(1, base.sc * d1 / d0)), k = ns / base.sc;
					tx = cx - (cx - base.tx) * k + ((a1.x + b1.x) - (a0.x + b0.x)) / 2; ty = cy - (cy - base.ty) * k + ((a1.y + b1.y) - (a0.y + b0.y)) / 2; sc = ns;
					if (sc <= 1.01) { tx = 0; ty = 0; }
					moved = true; apply();
				} else if (ids.length === 1 && sc > 1.01 && base.pts[ids[0]]) { // גרירה
					var p0 = base.pts[ids[0]];
					if (Math.abs(e.clientX - p0.x) + Math.abs(e.clientY - p0.y) > 4) moved = true;
					tx = base.tx + (e.clientX - p0.x); ty = base.ty + (e.clientY - p0.y); apply();
				}
			});
			var up = function (e) { delete pts[e.pointerId]; snap(); };
			stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
			var btn = function (cls, label, text, fn) { return el('button', { type: 'button', class: 'moeqs-lb-btn ' + cls, 'aria-label': label, title: label, text: text, onclick: fn }); };
			dlg = el('dialog', { id: 'moeqs-lightbox', class: 'moeqs-lightbox', dir: 'rtl', lang: 'he', 'aria-label': 'תצוגה מוגדלת של השרטוט' }, [
				el('div', { class: 'moeqs-lb-bar', role: 'toolbar', 'aria-label': 'שליטה בהגדלה' }, [
					btn('moeqs-lb-close', 'סגירה (Esc)', '×', function () { dlg.close(); }),
					btn('', 'הגדלה', '+', function () { zoomBy(1.4); }),
					btn('', 'הקטנה', '−', function () { zoomBy(1 / 1.4); }),
					btn('moeqs-lb-fit', 'התאמה למסך', 'התאמה למסך', reset)
				]),
				stage,
				el('p', { class: 'moeqs-lb-hint', text: 'לחיצה, גלגלת או צביטה מגדילות · גרירה מזיזה · Esc או לחיצה מחוץ לשרטוט סוגרות' })
			]);
			// לחיצה על השרטוט: הגדלה לנקודה שנלחצה (או חזרה לגודל מלא אם כבר מוגדל). לחיצה על הרקע הכהה: סגירה.
			dlg.addEventListener('click', function (e) {
				if (moved) { moved = false; return; }
				if (e.target === im) { if (sc > 1.01) reset(); else zoomAt(2.5, e.clientX, e.clientY); return; }
				if (e.target === dlg || e.target === stage) dlg.close();
			});
			dlg.addEventListener('keydown', function (e) {
				if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.4); } else if (e.key === '-') { e.preventDefault(); zoomBy(1 / 1.4); } else if (e.key === '0') { reset(); }
			});
			dlg.addEventListener('close', function () { reset(); if (dlg.moeqsOpener && dlg.moeqsOpener.focus) dlg.moeqsOpener.focus(); });
			dlg.moeqsReset = reset;
			document.body.appendChild(dlg);
		}
		var big = dlg.querySelector('.moeqs-lb-img'); big.src = src; big.alt = alt || 'שרטוט';
		dlg.moeqsOpener = document.activeElement; dlg.moeqsReset();
		if (dlg.showModal) dlg.showModal(); else window.open(src, '_blank');
	}
	function zoomable(img) {
		img.classList.add('is-zoom');
		img.setAttribute('tabindex', '0'); img.setAttribute('role', 'button'); img.setAttribute('title', 'לחץ על השרטוט להגדלה מלאה');
		img.setAttribute('aria-label', (img.getAttribute('alt') || 'איור') + ' – לחצו להגדלה');
		img.addEventListener('click', function () { openLightbox(img.getAttribute('src'), img.getAttribute('alt')); });
		img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img.getAttribute('src'), img.getAttribute('alt')); } });
		return img;
	}

	/* 3.21.25: רוחב תצוגה לשרטוט בשאלה. שרטוט קטן מוגדל עד פי 1.6 (עד ~640px כשיש מקום), גדול מוצג עד רוחב הכרטיס,
	   והגובה נשאר פרופורציונלי. גובה מקסימלי ~85% מגובה המסך, כדי שהשרטוט כולו נראה בבת אחת; הגדלה מלאה בלחיצה. */
	function sizeFig(img) {
		var nw = img.naturalWidth, nh = img.naturalHeight;
		if (!nw || !nh) return;
		var host = img.closest ? (img.closest('.moeqs-qfig') || img.closest('.moeqs-q') || img.parentNode) : img.parentNode;
		var avail = host && host.clientWidth ? host.clientWidth : nw;
		var w = Math.max(nw, Math.min(nw * 1.6, 640));
		w = Math.min(w, avail);
		var maxH = Math.max(340, (window.innerHeight || 800) * 0.85);
		if (w * nh / nw > maxH) w = Math.max(maxH * nw / nh, Math.min(avail, 300));
		img.style.setProperty('--figw', Math.round(w) + 'px');
	}
	function sizeAllFigs(scope) {
		Array.prototype.forEach.call((scope || document).querySelectorAll('.moeqs-qfig .moeqs-figure .moeqs-img, .moeqs-q .moeqs-figure .moeqs-img'), sizeFig);
	}

	/* טקסט עם תמונות: כל שורה [[img:url]] הופכת לתמונה */
	function rich(text, cls) {
		var box = el('div', { class: cls });
		var imgs = []; // בשאלה: כל הטקסט למעלה, ומתחתיו השרטוט ממורכז (ואחריו התשובות)
		String(text).split('\n').forEach(function (line) {
			var ml = line.trim().match(/^\[\[imgline:(.+)\]\]$/);
			if (ml) { // שורת טקסט/נוסחה כתמונה: נשארת במקומה בתוך הנוסח, ברוחב הטקסט
				box.appendChild(zoomable(el('img', { class: 'moeqs-imgline', src: ml[1], alt: 'נוסחה מתוך השאלה', loading: 'lazy' })));
				return;
			}
			var m = line.trim().match(IMG);
			if (m) {
				var im = zoomable(el('img', { class: 'moeqs-img', src: m[1], alt: 'איור', loading: 'lazy' }));
				if (cls === 'moeqs-q' || cls === 'moeqs-explain-body') {
					// השרטוט מוצג בגודלו המקורי לכל היותר (לא מוגדל מעבר לו, כדי שלא יטושטש); הגדלה מלאה בלחיצה
					var fig = el('figure', { class: 'moeqs-figure' }, [im]);
					if (cls === 'moeqs-q') {
						// 3.21.25: שרטוט השאלה בגודל קריא + כפתור הגדלה למסך מלא (נוח גם במובייל)
						im.addEventListener('load', function () { sizeFig(im); });
						fig.appendChild(el('button', { type: 'button', class: 'moeqs-zoomcap', 'aria-label': 'הגדלת השרטוט למסך מלא', onclick: function () { openLightbox(im.getAttribute('src'), im.getAttribute('alt')); } }, [el('span', { 'aria-hidden': 'true', text: '🔍' }), ' לחצו להגדלת השרטוט']));
						imgs.push(fig);
					} else { box.appendChild(fig); }
				} else { box.appendChild(im); }
				return;
			}
			var bold = line.indexOf('[[b]]') === 0;
			box.appendChild(el(bold ? 'strong' : 'div', { class: 'moeqs-text' + (bold ? ' is-bold' : ''), text: bold ? line.slice(5) : line }));
		});
		imgs.forEach(function (im) { box.appendChild(im); });
		return box;
	}
	function ansContent(t) {
		var m = String(t).trim().match(IMG);
		return m ? el('img', { class: 'moeqs-ans-img', src: m[1], alt: 'שרטוט', loading: 'lazy' }) : el('span', { class: 'moeqs-ans-text', text: t });
	}

	function explain(q) {
		var hasE = q.e && String(q.e).trim();
		var src = (q.s || []).filter(function (x) { return x && (x.t || x.u); });
		if (!hasE && !src.length) return el('div', { class: 'moeqs-explain is-none' }, [el('p', { class: 'moeqs-explain-title', text: 'הסבר' }), el('p', { class: 'moeqs-explain-body', text: 'אין הסבר מפורט לשאלה זו.' })]);
		var box = el('div', { class: 'moeqs-explain' }, [el('p', { class: 'moeqs-explain-title', text: 'הסבר' })]);
		if (hasE) box.appendChild(rich(q.e, 'moeqs-explain-body'));
		if (src.length) {
			var line = el('p', { class: 'moeqs-sources-line' }, [el('strong', { text: 'סימוכין: ' })]);
			src.forEach(function (x, i) {
				if (i) line.appendChild(document.createTextNode(' · '));
				var ok = x.u && /^https?:\/\//i.test(x.u);
				line.appendChild(ok ? el('a', { href: x.u, target: '_blank', rel: 'noopener', text: x.t || x.u }) : document.createTextNode(x.t || ''));
			});
			box.appendChild(line);
		}
		return box;
	}

	/* =================== 3.21.25: שמירה והמשך מאוחר יותר =================== */
	/* השמירה נשמרת לפי כתובת קנונית של הסימולציה (בלי פרמטרי ההמשך mr / ms / moeqs_resume), בדפדפן וגם בשרת למשתמש מחובר.
	   בסימולציה שמוגרלת בשרת (מבחן מלא, Quick, 50 אקראיות למהנדסים בלבד וכו') נשמרת גם רשימת השאלות שהוגרלו עם חתימת השרת,
	   ובחזרה הכתובת נושאת אותן, כך שהשרת מחזיר בדיוק את אותן שאלות (includes/resume.php). */
	var RUN_PFX = 'moeqs_run:', RUN_LAST = 'moeqs_lastrun', RUN_MAX = 7 * 864e5, RUN_PARAMS = ['mr', 'ms', 'moeqs_resume'];
	function canonUrl(href) {
		try {
			var u = new URL(href, location.href), pairs = [];
			RUN_PARAMS.forEach(function (k) { u.searchParams.delete(k); });
			u.searchParams.forEach(function (v, k) { pairs.push([k, v]); });
			pairs.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
			var qs = pairs.map(function (x) { return encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1]); }).join('&');
			return { key: u.pathname + (qs ? '?' + qs : ''), url: u.origin + u.pathname + (qs ? '?' + qs : '') };
		} catch (e) { return { key: location.pathname + location.search, url: String(location.href).split('#')[0] }; }
	}
	function readRun(key) {
		try { var r = JSON.parse(localStorage.getItem(key) || 'null'); return r && r.items && r.items.length && r.at ? r : null; } catch (e) { return null; }
	}
	function runUrlOf(run, key) { // שמירה ישנה (v1) בלי כתובת: הכתובת נגזרת מהמפתח
		if (run && run.url) return run.url;
		return key && key.indexOf(RUN_PFX) === 0 ? location.origin + key.slice(RUN_PFX.length) : '';
	}
	function runResumeUrl(run, key) {
		var href = runUrlOf(run, key);
		try {
			var u = new URL(href, location.href);
			if (run.rs && run.rn && run.rn.length) { u.searchParams.set('mr', run.rn.join('.')); u.searchParams.set('ms', run.rs); }
			u.searchParams.set('moeqs_resume', '1');
			return u.toString();
		} catch (e) { return href; }
	}
	/* שמירה ישנה (v1) של סימולציה מוגרלת אי אפשר לשחזר (רשימת השאלות לא נשמרה) */
	/* 3.21.26: שמירה בדפדפן שייכת למשתמש שיצר אותה. במחשב משותף, אחרי התנתקות, משתמש אחר (או אורח) לא יראה אותה.
	   שמירות מגרסה 3.21.25 (בלי uid) עדיין נטענות. */
	function runOwned(run, cfg) { return !run || run.uid === undefined || (run.uid | 0) === ((cfg && cfg.uid) | 0); }
	function runRestorable(run, key) {
		if (!run || !run.items || !run.items.length || Date.now() - run.at > RUN_MAX) return false;
		if (run.v === 2) return !!run.url;
		var k = String(key || '');
		var fresh = /[?&]sim=(exam|quick|practice|sample)(&|$)/.test(k) || (/[?&]sim=engonly(&|$)/.test(k) && !/[?&]cnt=all(&|$)/.test(k));
		return run.v === 1 && !fresh;
	}
	function runSync(cfg, body) {
		if (!cfg || !cfg.runsave || !window.fetch) return Promise.resolve(false);
		var json = JSON.stringify(body);
		var h = { 'Content-Type': 'application/json' };
		if (cfg.nonce) h['X-WP-Nonce'] = cfg.nonce;
		return fetch(cfg.runsave, { method: 'POST', credentials: 'same-origin', keepalive: json.length < 60000, headers: h, body: json })
			.then(function (r) { return r.ok; }).catch(function () { return false; });
	}
	function forgetRun(cfg, key) {
		try {
			localStorage.removeItem(key);
			if (localStorage.getItem(RUN_LAST) === key) localStorage.removeItem(RUN_LAST);
		} catch (e) { /* ignore */ }
		return runSync(cfg, { clear: 1, key: key.indexOf(RUN_PFX) === 0 ? key.slice(RUN_PFX.length) : key });
	}

	/* עמוד כל הסימולציות: "נמצא מבחן/תרגול שמור" עם המשך מהנקודה או התחלה חדשה */
	function initResumeHub(root, cfg) {
		var best = null, bestKey = '';
		try {
			for (var k = 0; k < localStorage.length; k++) {
				var key = localStorage.key(k);
				if (!key || key.indexOf(RUN_PFX) !== 0) continue;
				var r = readRun(key);
				if (!runRestorable(r, key) || !runOwned(r, cfg)) continue;
				if (!best || r.at > best.at) { best = r; bestKey = key; }
			}
		} catch (e) { /* storage unavailable */ }
		var sr = cfg.srun;
		if (sr && runRestorable(sr, RUN_PFX + sr.key) && (!best || sr.at > best.at)) { best = sr; bestKey = RUN_PFX + sr.key; }
		if (!best) return;
		var run = best, key = bestKey, total = run.items.length;
		var answered = run.items.filter(function (x) { return x[1] >= 0; }).length;
		var msg = 'נמצא מבחן/תרגול שמור (שאלה ' + (Math.min(run.i, total - 1) + 1) + ' מתוך ' + total + ') – האם ברצונך להמשיך מאיפה שעצרת?';
		var info = (run.label ? run.label + ' · ' : '') + 'נענו ' + answered + ' שאלות' + (run.timed ? ' · נותר זמן ' + fmt(run.left / 1000) : '');
		var dlg = null;
		function go() { location.href = runResumeUrl(run, key); }
		function fresh() {
			forgetRun(cfg, key);
			if (dlg && dlg.open) dlg.close();
			while (root.firstChild) root.removeChild(root.firstChild);
			toast('השמירה נמחקה. אפשר לבחור סימולציה חדשה.', 'ok');
		}
		function actions() {
			return el('p', { class: 'moeqs-actions' }, [
				el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'המשך מהנקודה שנשמרה', onclick: go }),
				el('button', { type: 'button', class: 'moeqs-btn', text: 'התחל חדש', onclick: fresh })
			]);
		}
		root.appendChild(el('div', { class: 'moeqs-resume moeqs-resume-hub', role: 'region', 'aria-label': 'מבחן/תרגול שמור' }, [
			el('p', { class: 'moeqs-resume-title', text: msg }),
			el('p', { class: 'moeqs-resume-info', text: info }),
			actions()
		]));
		dlg = el('dialog', { class: 'moeqs-dialog moeqs-resume-dlg', 'aria-labelledby': 'moeqs-rh-t', dir: 'rtl', lang: 'he' }, [
			el('h3', { id: 'moeqs-rh-t', text: msg }),
			el('p', { class: 'moeqs-resume-info', text: info }),
			actions()
		]);
		dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
		root.appendChild(dlg);
		if (dlg.showModal) { try { dlg.showModal(); var b = dlg.querySelector('.moeqs-primary'); if (b) b.focus(); } catch (e) { /* ignore */ } }
	}

	function storeGuest(entry) {
		try {
			var h = JSON.parse(localStorage.getItem('moeqs_hist') || '[]');
			h.push(entry);
			localStorage.setItem('moeqs_hist', JSON.stringify(h.slice(-100)));
		} catch (e) { /* storage unavailable */ }
	}

	/* =================== שאלה לדוגמה (עמוד הבית) =================== */
	function initSample(root, cfg) {
		var q = cfg.questions[0];
		var pick = -1;
		var box = el('div', { class: 'moeqs-sample-card' });
		root.appendChild(box);
		function draw() {
			while (box.firstChild) box.removeChild(box.firstChild);
			box.appendChild(el('p', { class: 'moeqs-ref', text: 'שאלה ' + q.n + ' – נסו לענות' }));
			box.appendChild(rich(q.q, 'moeqs-q'));
			var list = el('div', { class: 'moeqs-answers' });
			q.a.forEach(function (a, k) {
				var cls = 'moeqs-ans';
				if (pick >= 0 && k === q.c) cls += ' is-correct';
				if (pick === k && k !== q.c) cls += ' is-wrong';
				list.appendChild(el('button', {
					type: 'button', class: cls, 'aria-disabled': pick >= 0 ? 'true' : null,
					onclick: function () { if (pick < 0) { pick = k; draw(); } }
				}, [el('span', { class: 'moeqs-bubble', 'aria-hidden': 'true', text: label(cfg, k) }), ansContent(a)]));
			});
			box.appendChild(list);
			if (pick >= 0) {
				box.appendChild(el('p', { class: 'moeqs-feedback ' + (pick === q.c ? 'is-correct' : 'is-wrong'), role: 'status',
					text: pick === q.c ? 'נכון.' : 'לא נכון. התשובה הנכונה היא ' + label(cfg, q.c) + '.' }));
				var ex = explain(q); if (ex) box.appendChild(ex);
			}
		}
		draw();
	}

	/* =================== יומן לאורח =================== */
	function initGuestJournal(root, cfg) {
		var h = [];
		try { h = JSON.parse(localStorage.getItem('moeqs_hist') || '[]'); } catch (e) { h = []; }
		root.appendChild(el('h2', { class: 'moeqs-h', text: 'יומן המבחנים שלי' }));
		root.appendChild(el('p', { class: 'moeqs-note' }, [
			'התוצאות למטה שמורות רק בדפדפן הזה. ',
			el('a', { href: cfg.login, text: 'התחברו' }),
			' כדי לשמור את היומן בחשבון ולתרגל את השאלות שטעיתם בהן.'
		]));
		if (!h.length) { root.appendChild(el('p', { text: 'עדיין לא נשמרו סימולציות.' })); return; }
		root.appendChild(el('p', {}, [el('button', { type: 'button', class: 'moeqs-btn moeqs-danger', text: 'איפוס ההיסטוריה בדפדפן', onclick: function () {
			if (window.confirm('האם אתה בטוח? ההיסטוריה שנשמרה בדפדפן הזה תימחק ולא ניתן יהיה לשחזר אותה.')) { try { localStorage.removeItem('moeqs_hist'); sessionStorage.setItem('moeqs_toast', 'ההיסטוריה אופסה בהצלחה.'); } catch (e) { /* ignore */ } location.reload(); }
		} })]));
		var body = el('tbody');
		h.slice().reverse().forEach(function (r) {
			var d = new Date(r.time * 1000);
			body.appendChild(el('tr', { class: r.pct >= cfg.pass ? 'is-pass' : 'is-fail' }, [
				el('td', { text: d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }),
				el('td', { text: r.label }),
				el('td', {}, [el('strong', { text: String(r.pct) })]),
				el('td', { text: r.correct + '/' + r.total }),
				el('td', { text: fmt(r.secs) })
			]));
		});
		root.appendChild(el('div', { class: 'moeqs-table-wrap' }, [el('table', { class: 'moeqs-table' }, [
			el('thead', {}, [el('tr', {}, ['תאריך', 'סימולציה', 'ציון', 'נכונות', 'משך'].map(function (t) { return el('th', { text: t }); }))]),
			body
		])]));
	}

	/* =================== סימולציה =================== */
	function initQuiz(root, cfg) {
		var bank = cfg.questions || [];
		var id = 'moeqs' + (++uid);
		var view = el('div', { class: 'moeqs-view' });
		root.appendChild(view);
		var fs = 1;
		try { var fv = parseInt(localStorage.getItem('moeqs_qfs'), 10); if (fv >= 0 && fv <= 3) fs = fv; } catch (e) { /* ignore */ }
		var DENS = ['roomy', 'normal', 'compact'], DBASE = { roomy: 18, normal: 16.5, compact: 15 }, FOFF = [-1.5, 0, 2, 4.5];
		function setDensity(d) {
			root.setAttribute('data-density', d);
			root.style.setProperty('--qfs', (16 + FOFF[fs]) + 'px'); // תשובות 16px, שאלה 17px, בדרגת הגופן הרגילה
		}
		/* שאלה קצרה מוצגת גדולה ורחבה, שאלה ארוכה או עם שרטוט מוצגת מכווצת, כך שהכול נכנס במסך */
		function fitDensity() {
			/* 3.21.25: פריסה אחידה בכל השאלות (עם/בלי שרטוט, קצרות/ארוכות). קודם נבחרה פריסה "compact" לשאלות עם שרטוט כדי
			   להכניס הכול למסך, ולכן התשובות והמספרים 1–4 יצאו קטנים וצפופים. עכשיו הצפיפות קבועה, וגודל הטקסט נקבע רק בכפתורי א-/א+. */
			var qimg = view.querySelector('.moeqs-qfig .moeqs-img, .moeqs-q .moeqs-img');
			root.classList.toggle('has-qimg', !!qimg);
			root.style.setProperty('--qimgmax', 'none');
			setDensity(DENS[1]);
		}
		function applyFs() {
			root.classList.remove('fs-0', 'fs-1', 'fs-2', 'fs-3'); root.classList.add('fs-' + fs);
			try { localStorage.setItem('moeqs_qfs', String(fs)); } catch (e) { /* ignore */ }
			fitDensity();
		}
		applyFs();
		var rzT = null;
		window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { fitDensity(); sizeAllFigs(view); }, 120); });
		view.addEventListener('load', function () { fitDensity(); }, true);
		var st = null, tick = null, mapOpen = false;
		var timerEl = el('span', { class: 'moeqs-timer', role: 'timer' });
		var bankByN = {};
		bank.forEach(function (q) { bankByN[q.n] = q; });
		var runUrl = canonUrl(location.href); // 3.21.25
		var runKey = RUN_PFX + runUrl.key, legacyKey = RUN_PFX + location.pathname + location.search;
		var wantResume = /[?&]moeqs_resume=1(&|$)/.test(location.search), viaLink = /[?&]mr=/.test(location.search);
		var syncT = null, lastRun = null;
		var savedSet = {};
		(cfg.saved || []).forEach(function (n) { savedSet[n] = true; });

		function post(url, body) {
			return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce }, body: JSON.stringify(body) });
		}
		/* שמירת התקדמות במכשיר (ולמשתמש מחובר גם בשרת), כדי להמשיך מאוחר יותר – גם ממכשיר אחר.
		   force = לחיצה על "שמור והמשך מאוחר יותר"; אחרת נשמר רק כשיש התקדמות (תשובה או מעבר שאלה). */
		function persist(force) {
			if (!st || st.done || !st.items || !st.items.length) return null;
			if (!force && st.i === 0 && !st.items.some(function (x) { return x.pick >= 0; })) return null;
			var data = { v: 2, uid: cfg.uid | 0, at: Date.now(), key: runUrl.key, url: runUrl.url, rs: cfg.rs || '', rn: cfg.rs ? (cfg.rn || []) : [],
				mode: st.mode, check: st.check, i: st.i, label: st.label, timed: !!st.end,
				left: st.end ? Math.max(0, st.end - Date.now()) : 0, elapsed: Date.now() - st.start,
				items: st.items.map(function (x) { return [x.n, x.pick, x.flag ? 1 : 0, x.checked ? 1 : 0, x.reported ? 1 : 0]; }) };
			lastRun = data;
			try {
				localStorage.setItem(runKey, JSON.stringify(data));
				localStorage.setItem(RUN_LAST, runKey);
				if (legacyKey !== runKey) localStorage.removeItem(legacyKey);
			} catch (e) { /* storage unavailable */ }
			if (!cfg.runsave) return null;
			if (force) { clearTimeout(syncT); syncT = null; return runSync(cfg, { run: data }); }
			if (!syncT) syncT = setTimeout(flushRun, 3000); // 3.21.26: סנכרון לשרת תוך 3 שניות מכל תשובה
			return null;
		}
		function flushRun() {
			clearTimeout(syncT); syncT = null;
			return st && !st.done && lastRun && cfg.runsave ? runSync(cfg, { run: lastRun }) : Promise.resolve(false);
			return null;
		}
		function clearRun() {
			clearTimeout(syncT); syncT = null; lastRun = null;
			try { localStorage.removeItem(legacyKey); } catch (e) { /* ignore */ }
			forgetRun(cfg, runKey);
			cfg.srun = null;
		}
		function loadRun() {
			var cands = [readRun(runKey), readRun(legacyKey)];
			if (cfg.srun && cfg.srun.key === runUrl.key) cands.push(cfg.srun);
			var run = null;
			cands.forEach(function (r) {
				if (!r || (r.v !== 1 && r.v !== 2) || !r.items || !r.items.length || Date.now() - r.at > RUN_MAX || !runOwned(r, cfg)) return;
				if (!run || r.at > run.at) run = r;
			});
			if (!run) { if ((cands[0] && runOwned(cands[0], cfg)) || (cands[1] && runOwned(cands[1], cfg))) clearRun(); return null; }
			run.ready = run.items.every(function (x) { return !!bankByN[x[0]]; });
			// השאלות השמורות לא בעמוד (הוגרלו שאלות חדשות): טוענים את העמוד עם רשימת השאלות החתומה. בלי חתימה, או אם כבר ניסינו – אין מה לשחזר.
			if (!run.ready && (!run.rs || !run.rn || !run.rn.length || viaLink)) { clearRun(); return null; }
			return run;
		}
		function resumeRun(run) {
			if (!run.ready) { st = { saving: true, items: [] }; location.href = runResumeUrl(run, runKey); return; }
			begin(run.items.map(function (x) { return bankByN[x[0]]; }), run.mode, run.timed ? Math.max(run.left, 1000) / 60000 : 0, run.label, run);
		}
		document.addEventListener('visibilitychange', function () { // יציאה מהלשונית / סגירת האפליקציה במובייל: שמירה מיידית בשרת
			if (document.visibilityState === 'hidden' && syncT) flushRun();
		});
		window.addEventListener('pagehide', function () { if (syncT) flushRun(); }); // סגירת הדפדפן או מעבר עמוד
		/* 3.21.26: התנתקות באמצע מבחן – קודם שומרים בשרת (בזמן שההתחברות עוד בתוקף), ורק אז מתנתקים */
		document.addEventListener('click', function (e) {
			var a = e.target && e.target.closest ? e.target.closest('a[href*="action=logout"]') : null;
			if (!a || !cfg.runsave || !st || st.done || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
			e.preventDefault();
			st.saving = true;
			var href = a.href, gone = false, go = function () { if (!gone) { gone = true; location.href = href; } };
			(persist(true) || Promise.resolve()).then(go, go);
			setTimeout(go, 2000);
		}, true);
		function report(list) {
			var rows = list.filter(function (x) { return x.pick >= 0 && !x.reported; });
			if (!rows.length) return;
			rows.forEach(function (x) { x.reported = true; });
			if (!cfg.save) return;
			post(cfg.save, { partial: true, answers: rows.map(function (x) { return [x.n, x.ans[x.pick].ok ? 1 : 0]; }) }).catch(function () { /* ignore */ });
		}
		/* 3.21.21: במבחן סגור (cfg.key) התשובות לא נמצאות בדף (c = -1, e = ''). לפני בדיקה תוך כדי מענה מביאים מהשרת
		   את התשובה וההסבר של השאלה הזו בלבד. בלי זה הבדיקה רצה מול הנתונים המוסתרים: "התשובה הנכונה היא 0" ו"אין הסבר". */
		function needsKey(it) { return !!(cfg.key && cfg.peek && st && !st.keyed && !it.keyed); }
		function applyOne(x, r) {
			if (!r) return false;
			var c = parseInt(r.c, 10);
			if (!(c >= 0 && c < x.ans.length)) return false;
			x.ans.forEach(function (a, j) { a.ok = j === c; });
			if (x.src) { x.src.c = c; x.src.e = r.e || ''; x.src.s = r.s || []; }
			x.keyed = true;
			return true;
		}
		function peekKey(list, done) {
			var want = list.filter(function (x) { return needsKey(x); });
			if (!want.length) { done(true); return; }
			var h = { 'Content-Type': 'application/json' };
			if (cfg.nonce) h['X-WP-Nonce'] = cfg.nonce;
			fetch(cfg.peek, { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ kt: cfg.kt, ns: want.map(function (x) { return x.n; }) }) })
				.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
				.then(function (j) {
					var k = (j && j.key) || {}, all = true;
					want.forEach(function (x) { if (!applyOne(x, k[x.n])) all = false; });
					done(all);
				})
				.catch(function () { done(false); });
		}
		function markChecked(it) {
			if (needsKey(it)) {
				if (it.pending) return;
				it.pending = true; it.checkErr = false;
				peekKey([it], function (ok) {
					it.pending = false;
					if (!st || st.done) return;
					if (ok) { it.checked = true; it.checkErr = false; if (st.items[st.i] === it) st.justChecked = true; report([it]); }
					else it.checkErr = true;
					renderQuestion();
				});
				return;
			}
			it.checked = true; st.justChecked = true; report([it]);
		}
		function toggleSave(it) {
			if (!cfg.bookmark) {
				if (window.confirm('כדי לשמור שאלות צריך להתחבר. להתחבר עכשיו?') && cfg.login) { persist(true); st.saving = true; location.href = cfg.login; }
				return;
			}
			var on = !savedSet[it.n];
			if (on) savedSet[it.n] = true; else delete savedSet[it.n];
			renderQuestion();
			post(cfg.bookmark, { n: it.n, on: on ? 1 : 0 }).catch(function () {
				if (on) delete savedSet[it.n]; else savedSet[it.n] = true;
				renderQuestion();
			});
		}
		/* 3.21.25: "שמור והמשך מאוחר יותר" לא זורק החוצה (בכל סוגי המבחנים, כולל "שאלות למהנדסים בלבד").
		   המיקום נשמר מיד, ונשאלים אם להמשיך עכשיו או לצאת. */
		var svDlg = null;
		function saveAndExit() {
			if (!st) return;
			st.saving = true;
			var done = false, go = function () { if (done) return; done = true; st.leaving = true; location.href = cfg.hub; };
			var p = persist(true);
			if (p && p.then) { p.then(go, go); setTimeout(go, 2500); } else { go(); }
		}
		function pauseRun() {
			if (!st || st.done) return;
			persist(true);
			var msg = 'המיקום נשמר בהצלחה! האם ברצונך להמשיך לתרגל עכשיו או לצאת?';
			if (!svDlg) {
				var cont = el('button', { type: 'button', class: 'moeqs-btn moeqs-primary moeqs-sv-cont', text: 'המשך עכשיו' });
				var out = el('button', { type: 'button', class: 'moeqs-btn moeqs-sv-exit', text: 'שמור וצא' });
				svDlg = el('dialog', { class: 'moeqs-dialog moeqs-saved-dlg', 'aria-labelledby': id + '-sv-t', 'aria-describedby': id + '-sv-d' }, [
					el('h3', { id: id + '-sv-t', text: 'המיקום נשמר בהצלחה!' }),
					el('p', { id: id + '-sv-d', class: 'moeqs-saved-msg', text: 'האם ברצונך להמשיך לתרגל עכשיו או לצאת?' }),
					el('p', { class: 'moeqs-saved-pos' }),
					el('p', { class: 'moeqs-actions' }, [cont, out])
				]);
				cont.addEventListener('click', function () { svDlg.close(); });
				out.addEventListener('click', function () { cont.disabled = true; out.disabled = true; out.textContent = 'שומר…'; saveAndExit(); });
				svDlg.addEventListener('click', function (e) { if (e.target === svDlg) svDlg.close(); });
				svDlg.addEventListener('close', function () { if (st && !st.done && !st.leaving) { st.saving = false; } });
				root.appendChild(svDlg);
			}
			svDlg.querySelector('.moeqs-saved-pos').textContent = 'שאלה ' + (st.i + 1) + ' מתוך ' + st.items.length + (cfg.runsave ? ' · נשמר גם בחשבון, אפשר להמשיך מכל מכשיר' : ' · נשמר בדפדפן הזה');
			var bc = svDlg.querySelector('.moeqs-sv-cont'), bx = svDlg.querySelector('.moeqs-sv-exit');
			bc.disabled = false; bx.disabled = false; bx.textContent = 'שמור וצא';
			if (svDlg.showModal) { if (!svDlg.open) svDlg.showModal(); bc.focus(); }
			else if (!window.confirm(msg + '\n\nאישור = המשך עכשיו · ביטול = שמור וצא')) saveAndExit();
		}

		function clear() { while (view.firstChild) view.removeChild(view.firstChild); }
		function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }
		function toTop() { var r = root.getBoundingClientRect(); if (r.top < 0) root.scrollIntoView({ block: 'start' }); }
		window.addEventListener('beforeunload', function (e) {
			if (st && !st.done && !st.saving && st.items.some(function (x) { return x.pick >= 0; })) { e.preventDefault(); e.returnValue = ''; }
		});

		function startScreen() {
			stopTimer(); st = null; clear();
			var run = loadRun();
			if (wantResume) { // 3.21.25: הגעה מ"המשך מהנקודה שנשמרה" – ממשיכים מיד, בלי מסך פתיחה
				wantResume = false;
				try { var cu = new URL(location.href); cu.searchParams.delete('moeqs_resume'); history.replaceState(history.state, '', cu.toString()); } catch (e) { /* ignore */ }
				if (run) { resumeRun(run); return; }
			}
			var count = Math.min(cfg.count || bank.length, bank.length);
			var modeExam = el('input', { type: 'radio', name: id + '-m', value: 'exam', checked: cfg.mode === 'exam' });
			var modePr = el('input', { type: 'radio', name: id + '-m', value: 'practice', checked: cfg.mode !== 'exam' });
			var facts = el('ul', { class: 'moeqs-facts' });
			function refresh() {
				var exam = cfg.choice ? modeExam.checked : cfg.mode === 'exam';
				while (facts.firstChild) facts.removeChild(facts.firstChild);
				facts.appendChild(el('li', { text: count + (count < bank.length ? ' שאלות אקראיות מתוך ' + bank.length : ' שאלות') }));
				if (exam && cfg.minutes) facts.appendChild(el('li', { text: 'זמן: ' + fmt(cfg.minutes * 60) + (cfg.minutes >= 60 ? ' שעות' : ' דקות') }));
				else if (!exam) facts.appendChild(el('li', { text: 'אחרי כל תשובה מוצג מיד אם צדקתם' }));
				else facts.appendChild(el('li', { text: 'ללא הגבלת זמן' }));
				facts.appendChild(el('li', { text: exam ? 'ציון עובר: ' + cfg.pass + '. התשובות הנכונות מוצגות בסוף.' : 'בסוף: ציון וחזרה על הטעויות' }));
			}
			[modeExam, modePr].forEach(function (x) { x.addEventListener('change', refresh); });
			view.appendChild(el('div', { class: 'moeqs-start' }, [
				el('h2', { class: 'moeqs-title', text: cfg.title }),
				cfg.sub ? el('p', { class: 'moeqs-sub', text: cfg.sub }) : null,
				run ? el('div', { class: 'moeqs-resume', role: 'region', 'aria-label': 'מבחן/תרגול שמור' }, [
					el('p', { class: 'moeqs-resume-title', text: 'נמצא מבחן/תרגול שמור (שאלה ' + (Math.min(run.i, run.items.length - 1) + 1) + ' מתוך ' + run.items.length + ') – האם ברצונך להמשיך מאיפה שעצרת?' }),
					el('p', { class: 'moeqs-resume-info', text: 'נענו ' + run.items.filter(function (x) { return x[1] >= 0; }).length + ' שאלות' + (run.timed ? ' · נותר זמן ' + fmt(run.left / 1000) : '') }),
					el('p', { class: 'moeqs-actions' }, [
						el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'המשך מהנקודה שנשמרה', onclick: function () { resumeRun(run); } }),
						el('button', { type: 'button', class: 'moeqs-btn', text: 'התחל חדש', onclick: function () { clearRun(); startScreen(); } })
					])
				]) : null,
				cfg.choice ? el('fieldset', { class: 'moeqs-modes' }, [
					el('legend', { text: 'איך לתרגל?' }),
					el('label', { class: 'moeqs-mode' }, [modePr, el('span', { text: 'תרגול עם תשובות מיידיות' })]),
					el('label', { class: 'moeqs-mode' }, [modeExam, el('span', { text: 'מבחן, תשובות בסוף' })])
				]) : null,
				facts,
				el('p', { class: 'moeqs-actions' }, [
					el('button', { type: 'button', class: 'moeqs-btn moeqs-primary moeqs-big', text: 'התחלה', onclick: function () {
						var exam = cfg.choice ? modeExam.checked : cfg.mode === 'exam';
						var pool = cfg.ordered ? bank.slice() : shuffle(bank);
						if (count < bank.length) {
							pool = shuffle(bank).slice(0, count);
							if (cfg.ordered) pool.sort(function (a, b) { return a.n - b.n; });
						}
						begin(pool, exam ? 'exam' : 'practice', exam && !cfg.choice ? cfg.minutes : 0, cfg.label);
					} }),
					el('a', { class: 'moeqs-link', href: cfg.hub, text: 'לכל הסימולציות' })
				])
			]));
			refresh();
		}

		function begin(pool, mode, minutes, lbl, resume) {
			st = {
				items: pool.map(function (q) {
					// 3.21.25: תיקון שורש – "תרגול הטעויות" שנפתח אחרי הגשת מבחן סגור קיבל פריטים בלי keyed, ולכן כל בדיקה נשלחה
					// ל-exam-check עם מפתח שכבר נוצל (403) והוצג "לא הצלחנו לבדוק את התשובה מול השרת". כשהתשובה הנכונה כבר ידועה בדף
					// (c בטווח), אין צורך לפנות לשרת.
					return { src: q, q: q.q, n: q.n, ans: q.a.map(function (t, i) { return { t: t, ok: i === q.c }; }), pick: -1, flag: false, checked: false, reported: false, keyed: q.c >= 0 && q.c < q.a.length };
				}),
				i: 0, mode: mode, check: mode === 'practice', start: Date.now(), end: minutes ? Date.now() + minutes * 60000 : 0, done: false, timeUp: false, label: lbl
			};
			st.keyed = st.items.every(function (x) { return x.keyed; }); // 3.21.25
			if (resume) {
				st.check = !!resume.check; st.i = Math.min(resume.i, st.items.length - 1); st.start = Date.now() - resume.elapsed;
				resume.items.forEach(function (r, k) { var x = st.items[k]; x.pick = r[1]; x.flag = !!r[2]; x.checked = !!r[3]; x.reported = !!r[4]; });
				var was = st.items.filter(function (x) { return x.checked && needsKey(x); }); // 3.21.21
				if (was.length) {
					was.forEach(function (x) { x.checked = false; x.pending = true; });
					peekKey(was, function () {
						was.forEach(function (x) { x.pending = false; if (x.keyed) x.checked = true; else x.checkErr = true; });
						if (st && !st.done) renderQuestion();
					});
				}
			}
			stopTimer();
			if (st.end) {
				var upd = function () {
					var left = (st.end - Date.now()) / 1000;
					timerEl.textContent = 'נותרו ' + fmt(left);
					timerEl.classList.toggle('moeqs-low', left <= 300);
					if (left <= 0) { st.timeUp = true; finish(true); }
				};
				upd(); tick = setInterval(upd, 500);
			}
			renderQuestion(); toTop();
		}

		function goTo(i) {
			st.i = i; renderQuestion(); toTop();
			var q = view.querySelector('.moeqs-q');
			if (q) q.focus({ preventScroll: true });
		}

		function renderQuestion() {
			clear();
			persist();
			var it = st.items[st.i], total = st.items.length;
			var practice = st.mode === 'practice';
			var locked = it.checked || !!it.pending;
			var answered = st.items.filter(function (x) { return x.pick >= 0; }).length;

			var hasQImg = /\[\[img:/.test(String((it.src && it.src.q) || '')); // בשאלה עם שרטוט, תשובות עד ~95 תווים בשתי עמודות כדי לפנות מקום לשרטוט
			var shortAns = it.ans.every(function (a) { var t = String(a.t); return !/^\s*\[\[img:/.test(t) && t.replace(/[\u2066\u2069]/g, '').length <= (hasQImg ? 95 : 55); });
			var list = el('div', { class: 'moeqs-answers' + (shortAns ? ' two-col' : ''), role: 'radiogroup', 'aria-label': 'תשובות' });
			it.ans.forEach(function (a, k) {
				var cls = 'moeqs-ans';
				if (it.pick === k) cls += ' is-picked';
				if (it.checked && a.ok) cls += ' is-correct';
				if (it.checked && it.pick === k && !a.ok) cls += ' is-wrong';
				list.appendChild(el('button', {
					type: 'button', class: cls, role: 'radio', 'aria-checked': it.pick === k ? 'true' : 'false', 'aria-disabled': locked ? 'true' : null,
					onclick: function () {
						if (locked) return;
						it.pick = k; if (st.check) markChecked(it); renderQuestion();
						var b = view.querySelectorAll('.moeqs-ans')[k]; if (b) b.focus({ preventScroll: true });
					}
				}, [el('span', { class: 'moeqs-bubble', 'aria-hidden': 'true', text: label(cfg, k) }), ansContent(a.t)]));
			});

			var feedback = null;
			if (it.pending) {
				feedback = el('p', { class: 'moeqs-feedback', role: 'status', text: 'בודק את התשובה…' });
			} else if (it.checkErr && !it.checked && it.pick >= 0) {
				feedback = el('p', { class: 'moeqs-feedback is-wrong', role: 'alert' }, [
					'לא הצלחנו לבדוק את התשובה מול השרת. ',
					el('button', { type: 'button', class: 'moeqs-link', text: 'ניסיון נוסף', onclick: function () { markChecked(it); renderQuestion(); } })
				]);
			} else if (it.checked && it.pick >= 0) {
				var right = it.ans[it.pick].ok;
				var ci = it.ans.findIndex(function (a) { return a.ok; });
				feedback = el('p', { class: 'moeqs-feedback ' + (right ? 'is-correct' : 'is-wrong'), role: 'status',
					text: right ? 'נכון.' : (ci >= 0 ? 'לא נכון. התשובה הנכונה היא ' + label(cfg, ci) + '.' : 'לא נכון.') });
			}
			var expl = (it.checked && it.pick >= 0) ? explain(it.src) : null;
			var doScroll = !!(st.justChecked && locked); st.justChecked = false;
			var last = st.i === total - 1;
			var map = el('div', { class: 'moeqs-map', 'aria-label': 'מעבר לשאלה' });
			st.items.forEach(function (x, k) {
				var c = 'moeqs-cell';
				if (x.pick >= 0) c += x.checked ? (x.ans[x.pick].ok ? ' is-correct' : ' is-wrong') : ' is-answered';
				if (x.flag) c += ' is-flag';
				if (savedSet[x.n]) c += ' is-saved';
				if (k === st.i) c += ' is-current';
				map.appendChild(el('button', { type: 'button', class: c, text: String(x.n), 'aria-current': k === st.i ? 'step' : null,
					'aria-label': 'שאלה ' + x.n + (x.pick >= 0 ? ', נענתה' : '') + (x.flag ? ', מסומנת' : '') + (savedSet[x.n] ? ', שמורה' : ''), onclick: function () { mapOpen = false; goTo(k); } })); // בחירת מספר סוגרת את הרשימה
			});
			var centerCell = function () { // גלילה אופקית בלבד של הסרגל, כך שהשאלה הנוכחית במרכז (בלי להזיז את הדף)
				var cur = map.querySelector('.is-current');
				if (!cur || mapOpen) return;
				var mr = map.getBoundingClientRect(), cr = cur.getBoundingClientRect();
				map.scrollLeft += (cr.left + cr.width / 2) - (mr.left + mr.width / 2);
			};
			var mapLabel = function () { return mapOpen ? 'הסתרת הרשימה' : 'כל השאלות (' + total + ')'; };
			var mapBtn = el('button', { type: 'button', class: 'moeqs-map-toggle', 'aria-expanded': mapOpen ? 'true' : 'false', text: mapLabel(), onclick: function () {
				mapOpen = !mapOpen;
				mapWrap.classList.toggle('is-open', mapOpen);
				mapBtn.setAttribute('aria-expanded', mapOpen ? 'true' : 'false');
				mapBtn.textContent = mapLabel();
				centerCell();
				fitDensity();
			} });
			var mapWrap = el('div', { class: 'moeqs-mapwrap' + (mapOpen ? ' is-open' : '') }, [map]);
			setTimeout(centerCell, 0);

			view.appendChild(el('div', { class: 'moeqs-exam' }, [
				el('div', { class: 'moeqs-head' }, [
					el('span', { class: 'moeqs-count' }, [el('span', { class: 'moeqs-qnum', text: 'שאלה ' + it.n }), el('span', { class: 'moeqs-pos', text: ' · ' + (st.i + 1) + ' מתוך ' + total })].concat(it.src && it.src.lv ? [el('span', { class: 'moeqs-lvl moeqs-lvl-' + it.src.lv.toLowerCase(), text: it.src.lv === 'A' ? 'למהנדסים בלבד' : 'למהנדסים והנדסאים בלבד' })] : [])),
					el('span', { class: 'moeqs-fsctl', role: 'group', 'aria-label': 'גודל הטקסט' }, [
						el('button', { type: 'button', class: 'moeqs-fsbtn', 'aria-label': 'הקטנת הטקסט', title: 'הקטנת הטקסט', text: 'א-', onclick: function () { if (fs > 0) { fs--; applyFs(); } } }),
						el('button', { type: 'button', class: 'moeqs-fsbtn', 'aria-label': 'הגדלת הטקסט', title: 'הגדלת הטקסט', text: 'א+', onclick: function () { if (fs < 3) { fs++; applyFs(); } } })
					]),
					el('label', { class: 'moeqs-switch' }, [
						el('input', { type: 'checkbox', checked: st.check, onchange: function (e) {
							st.check = e.target.checked;
							if (st.check && it.pick >= 0) markChecked(it);
							renderQuestion();
						} }),
						el('span', { class: 'moeqs-switch-ui', 'aria-hidden': 'true' }),
						el('span', { text: 'בדיקה תוך כדי מענה' })
					]),
					mapBtn,
					st.end ? timerEl : null
				]),
				el('div', { class: 'moeqs-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': answered, 'aria-label': 'שאלות שנענו' },
					[el('span', { style: 'width:' + (answered * 100 / total) + '%' })]),
				mapWrap,
				(function () {
					// שאלה עם שרטוט/טבלה: השרטוט יוצא לתא נפרד וממורכז מתחת לנוסח, לפני התשובות (טור אחד בכל המסכים)
					var q = rich(it.q, 'moeqs-q'); q.setAttribute('tabindex', '-1');
					var figs = [].slice.call(q.children).filter(function (c) { return c.classList.contains('moeqs-figure'); });
					if (!figs.length) return el('div', { class: 'moeqs-card moeqs-qcard' }, [q, list, feedback, expl]);
					var figBox = el('div', { class: 'moeqs-qfig' });
					figs.forEach(function (f) { figBox.appendChild(f); });
					return el('div', { class: 'moeqs-card moeqs-qcard has-fig' }, [q, figBox, list, feedback, expl]);
				})(),
				el('div', { class: 'moeqs-nav' }, [
					el('button', { type: 'button', class: 'moeqs-btn', text: 'הקודמת', disabled: st.i === 0, onclick: function () { goTo(st.i - 1); } }),
					(!it.checked && !it.pending && it.pick >= 0) ? el('button', { type: 'button', class: 'moeqs-btn moeqs-checkbtn', text: 'בדיקת התשובה',
						onclick: function () { markChecked(it); renderQuestion(); } }) : null,
					el('button', { type: 'button', class: 'moeqs-btn moeqs-savebtn' + (savedSet[it.n] ? ' is-on' : ''), 'aria-pressed': savedSet[it.n] ? 'true' : 'false',
						text: savedSet[it.n] ? 'נשמרה ✓' : 'שמור שאלה', onclick: function () { toggleSave(it); } }),
					practice ? null : el('button', { type: 'button', class: 'moeqs-btn moeqs-flagbtn' + (it.flag ? ' is-on' : ''), 'aria-pressed': it.flag ? 'true' : 'false',
						text: it.flag ? 'מסומנת לבדיקה' : 'סימון לבדיקה', onclick: function () { it.flag = !it.flag; renderQuestion(); } }),
					last
						? el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: practice ? 'סיום התרגול' : 'הגשת המבחן', onclick: function () { finish(false); } })
						: el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'הבאה', onclick: function () { goTo(st.i + 1); } })
				]),
				el('p', { class: 'moeqs-finish' }, [
					el('button', { type: 'button', class: 'moeqs-link', text: 'שמור והמשך מאוחר יותר', onclick: pauseRun }),
					last ? null : el('button', { type: 'button', class: 'moeqs-link', text: practice ? 'סיום התרגול עכשיו' : 'הגשת המבחן עכשיו', onclick: function () { finish(false); } })
				]),
				reportBtn(it) // אייקון דיווח על בעיה: בתחתית, בפינה השמאלית
			]));
			fitDensity();
			sizeAllFigs(view); // 3.21.25
			if (doScroll) {
				setTimeout(function () {
					var f = view.querySelector('.moeqs-feedback');
					if (f && f.scrollIntoView) f.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
				}, 60);
			}
		}

		/* דיווח על בעיה בשאלה: כפתור בפינה השמאלית התחתונה של הכרטיס + חלונית */
		var rpDlg = null;
		function openReport(it, opener) {
			if (!rpDlg) {
				var ta = el('textarea', { id: id + '-rp-t', rows: 5, maxlength: 2000, 'aria-describedby': id + '-rp-h', placeholder: 'כתבו כאן מה לא תקין בשאלה, בתשובות או בהסבר' });
				var msgEl = el('p', { class: 'moeqs-rp-msg', role: 'status', 'aria-live': 'polite' });
				var send = el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'שלח דיווח' });
				var title = el('h3', { id: id + '-rp-title', text: 'דיווח על בעיה בשאלה' });
				var ctx = el('p', { class: 'moeqs-rp-ctx' });
				var x = el('button', { type: 'button', class: 'moeqs-rp-x', 'aria-label': 'סגירה', text: '×' });
				var dlg = el('dialog', { class: 'moeqs-dialog moeqs-report-dlg', 'aria-labelledby': id + '-rp-title' }, [
					el('div', { class: 'moeqs-rp-head' }, [title, x]),
					ctx,
					el('label', { id: id + '-rp-h', class: 'moeqs-rp-sub', 'for': id + '-rp-t', text: 'מה הבעיה בשאלה זו?' }),
					ta, msgEl,
					el('div', { class: 'moeqs-rp-act' }, [send])
				]);
				function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
				x.addEventListener('click', close);
				dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
				dlg.addEventListener('close', function () { if (dlg.moeqsOpener && dlg.moeqsOpener.focus) dlg.moeqsOpener.focus(); });
				send.addEventListener('click', function () {
					var text = ta.value.trim();
					if (!cfg.report) { msgEl.className = 'moeqs-rp-msg is-bad'; msgEl.textContent = 'כדי לשלוח דיווח יש להתחבר לחשבון.'; return; }
					if (text.length < 3) { msgEl.className = 'moeqs-rp-msg is-bad'; msgEl.textContent = 'יש לתאר את הבעיה בכמה מילים.'; ta.focus(); return; }
					send.disabled = true; msgEl.className = 'moeqs-rp-msg'; msgEl.textContent = 'שולח...';
					post(cfg.report, { n: dlg.moeqsN, message: text }).then(function (r) {
						return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d && d.ok, d: d || {} }; });
					}).then(function (res) {
						if (res.ok) {
							msgEl.className = 'moeqs-rp-msg is-ok'; msgEl.textContent = 'תודה! הדיווח נשלח ויטופל בהקדם.'; ta.value = '';
							setTimeout(function () { send.disabled = false; close(); }, 1400);
						} else {
							msgEl.className = 'moeqs-rp-msg is-bad'; msgEl.textContent = res.d.error || res.d.message || 'השליחה נכשלה. נסו שוב.'; send.disabled = false;
						}
					}).catch(function () { msgEl.className = 'moeqs-rp-msg is-bad'; msgEl.textContent = 'השליחה נכשלה. בדקו את החיבור ונסו שוב.'; send.disabled = false; });
				});
				dlg.moeqsCtx = ctx; dlg.moeqsMsg = msgEl; dlg.moeqsTa = ta; dlg.moeqsSend = send;
				root.appendChild(dlg);
				rpDlg = dlg;
			}
			rpDlg.moeqsN = it.n; rpDlg.moeqsOpener = opener;
			rpDlg.moeqsCtx.textContent = 'שאלה מספר ' + it.n;
			rpDlg.moeqsMsg.textContent = ''; rpDlg.moeqsMsg.className = 'moeqs-rp-msg'; rpDlg.moeqsSend.disabled = false;
			if (!cfg.report) { rpDlg.moeqsMsg.className = 'moeqs-rp-msg is-bad'; rpDlg.moeqsMsg.textContent = 'כדי לשלוח דיווח יש להתחבר לחשבון.'; }
			if (rpDlg.showModal) { if (!rpDlg.open) rpDlg.showModal(); } else { rpDlg.setAttribute('open', ''); }
			rpDlg.moeqsTa.focus();
		}
		function reportBtn(it) {
			var b = el('button', { type: 'button', class: 'moeqs-reportbtn', title: 'דיווח על בעיה בשאלה', 'aria-label': 'דיווח על בעיה בשאלה', 'aria-haspopup': 'dialog' });
			b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-3.6-.7L3 21l1.9-4.9A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/><path d="M12 7.5v4.6"/><circle cx="12" cy="15" r=".6" fill="currentColor"/></svg>';
			b.addEventListener('click', function () { openReport(it, b); });
			return el('div', { class: 'moeqs-reportrow' }, [b]);
		}

		function finish(force) {
			if (!st || st.done) return;
			if (!force) {
				var un = st.items.filter(function (x) { return x.pick < 0; }).length;
				if (!window.confirm(un ? 'לא ענית על ' + un + ' שאלות. לסיים בכל זאת?' : 'לסיים ולקבל ציון?')) return;
			}
			stopTimer(); st.done = true; st.finished = Date.now(); clearRun();
			withKey(function () { save(); results(); toTop(); });
		}

		/* 3.21.11: במבחן סגור התשובות לא נמצאות בדף. בהגשה מקבלים מהשרת את התשובות וההסברים של שאלות המבחן בלבד. */
		function applyKey(k) {
			st.items.forEach(function (x) {
				var r = k[x.n];
				if (!r) return;
				x.ans.forEach(function (a, j) { a.ok = j === r.c; });
				if (x.src) { x.src.c = r.c; x.src.e = r.e || ''; x.src.s = r.s || []; }
				x.keyed = true;
			});
			st.keyed = true;
		}
		function withKey(cb) {
			if (!cfg.key || st.keyed) { cb(); return; }
			clear();
			view.appendChild(el('p', { class: 'moeqs-sub', role: 'status', text: 'בודק את התשובות…' }));
			var h = { 'Content-Type': 'application/json' };
			if (cfg.nonce) h['X-WP-Nonce'] = cfg.nonce;
			fetch(cfg.key, { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ kt: cfg.kt, ns: st.items.map(function (x) { return x.n; }) }) })
				.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
				.then(function (j) { applyKey((j && j.key) || {}); cb(); })
				.catch(function (e) {
					clear();
					var expired = e && /^403$/.test(e.message);
					view.appendChild(el('div', { class: 'moeqs-box', role: 'alert' }, [
						el('p', { text: expired ? 'לא ניתן לבדוק את המבחן הזה (פג תוקף הדף). אפשר להתחיל מבחן חדש.' : 'לא הצלחנו לבדוק את התשובות מול השרת. בדקו את החיבור לאינטרנט ונסו שוב. התשובות שלכם לא נמחקו.' }),
						el('p', { class: 'moeqs-actions' }, [
							expired ? null : el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'ניסיון נוסף', onclick: function () { withKey(cb); } }),
							el('a', { class: 'moeqs-link', href: cfg.hub, text: 'לכל הסימולציות' })
						])
					]));
				});
		}

		function save() {
			var items = st.items, answered = items.filter(function (x) { return x.pick >= 0; });
			var correct = answered.filter(function (x) { return x.ans[x.pick].ok; }).length;
			var pct = Math.round(correct * 100 / items.length);
			var entry = {
				time: Math.floor(Date.now() / 1000), label: st.label, total: items.length, correct: correct, pct: pct,
				passed: pct >= cfg.pass, secs: Math.round((st.finished - st.start) / 1000),
				items: items.map(function (x) { return [x.n, x.pick < 0 ? -1 : (x.ans[x.pick].ok ? 1 : 0)]; }),
				answers: answered.filter(function (x) { return !x.reported; }).map(function (x) { return [x.n, x.ans[x.pick].ok ? 1 : 0]; })
			};
			answered.forEach(function (x) { x.reported = true; });
			if (cfg.save) {
				post(cfg.save, entry).catch(function () { storeGuest(entry); });
			} else {
				storeGuest(entry);
			}
		}

		function results() {
			clear();
			var items = st.items, total = items.length;
			var correct = items.filter(function (x) { return x.pick >= 0 && x.ans[x.pick].ok; }).length;
			var unanswered = items.filter(function (x) { return x.pick < 0; }).length;
			var pct = Math.round(correct * 100 / total);
			var passed = pct >= cfg.pass;
			var wrongItems = items.filter(function (x) { return x.pick < 0 || !x.ans[x.pick].ok; });
			var onlyWrong = el('input', { type: 'checkbox', id: id + '-ow' });
			var review = el('ol', { class: 'moeqs-review' });

			function drawReview() {
				while (review.firstChild) review.removeChild(review.firstChild);
				items.forEach(function (it, k) {
					var ok = it.pick >= 0 && it.ans[it.pick].ok;
					if (onlyWrong.checked && ok) return;
					var ansList = el('ul', { class: 'moeqs-rev-ans' });
					it.ans.forEach(function (a, j) {
						var tag = null, c = '';
						if (a.ok) { c = 'is-correct'; tag = it.pick === j ? 'התשובה שלך – נכונה' : 'התשובה הנכונה'; }
						if (it.pick === j && !a.ok) { c = 'is-wrong'; tag = 'התשובה שלך'; }
						ansList.appendChild(el('li', { class: c }, [
							el('span', { class: 'moeqs-bubble', 'aria-hidden': 'true', text: label(cfg, j) }),
							ansContent(a.t),
							tag ? el('span', { class: 'moeqs-tag', text: tag }) : null
						]));
					});
					review.appendChild(el('li', { class: 'moeqs-rev-item ' + (ok ? 'is-ok' : 'is-bad'), value: k + 1 }, [
						el('p', { class: 'moeqs-ref', text: 'שאלה ' + it.n + ' | ' + (ok ? 'נכון' : it.pick < 0 ? 'ללא מענה' : 'שגוי') }),
						rich(it.q, 'moeqs-q'),
						ansList,
						(function () { var ex = explain(it.src); return ex ? el('details', { class: 'moeqs-explain-d', open: true }, [el('summary', { text: 'הסבר וסימוכין' }), ex]) : null; })()
					]));
				});
				if (!review.firstChild) review.appendChild(el('li', { class: 'moeqs-none', text: 'אין שאלות שגויות.' }));
			}
			onlyWrong.addEventListener('change', drawReview);
			drawReview();

			view.appendChild(el('div', { class: 'moeqs-result' }, [
				st.timeUp ? el('p', { class: 'moeqs-timeup', role: 'alert', text: 'הזמן הסתיים והמבחן הוגש אוטומטית.' }) : null,
				el('h2', { class: 'moeqs-title', text: st.label }),
				el('div', { class: 'moeqs-score ' + (passed ? 'is-pass' : 'is-fail') }, [
					el('span', { class: 'moeqs-score-num', text: String(pct) }),
					el('span', { class: 'moeqs-score-label', text: passed ? 'עברת' : 'לא עברת' })
				]),
				el('p', { class: 'moeqs-summary', text: correct + ' תשובות נכונות מתוך ' + total + (unanswered ? ', ' + unanswered + ' ללא מענה' : '') +
					'. ציון עובר: ' + cfg.pass + '. משך: ' + fmt((st.finished - st.start) / 1000) + '.' }),
				el('p', { class: 'moeqs-summary' }, cfg.logged
					? ['התוצאה נשמרה ', cfg.journal ? el('a', { href: cfg.journal, text: 'ביומן המבחנים' }) : 'ביומן המבחנים', '.']
					: ['התוצאה נשמרה בדפדפן הזה בלבד.']),
				el('div', { class: 'moeqs-nav' }, [
					el('button', { type: 'button', class: 'moeqs-btn moeqs-primary', text: 'סימולציה חדשה', onclick: function () { if (cfg.fresh) { clearRun(); location.href = runUrl.url; } else { startScreen(); } } }), // 3.21.25: הגרלה חדשה גם אחרי חזרה לשאלות שמורות
					wrongItems.length ? el('button', { type: 'button', class: 'moeqs-btn', text: 'תרגול הטעויות (' + wrongItems.length + ')',
						onclick: function () { begin(wrongItems.map(function (x) { return x.src; }), 'practice', 0, 'תרגול טעויות – ' + st.label); } }) : null,
					el('a', { class: 'moeqs-btn', href: cfg.hub, text: 'לכל הסימולציות' })
				]),
				el('h3', { class: 'moeqs-rev-title', text: 'בדיקת התשובות' }),
				el('div', { class: 'moeqs-check' }, [onlyWrong, el('label', { for: id + '-ow', text: 'להציג רק שגויות ושאלות ללא מענה' })]),
				review
			]));
		}

		startScreen();
	}

	function initCountdowns() {
		var nodes = document.querySelectorAll('.moeqs-cd[data-target]');
		Array.prototype.forEach.call(nodes, function (box) {
			if (box.getAttribute('data-ready')) return;
			box.setAttribute('data-ready', '1');
			var target = new Date(box.getAttribute('data-target')).getTime();
			if (isNaN(target)) return;
			var queue = []; // 3.20.0: המועדים הבאים, כדי לעבור אליהם אוטומטית כשהמועד הנוכחי חולף
			try { queue = JSON.parse(box.getAttribute('data-next') || '[]') || []; } catch (e) { queue = []; }
			var ref = {};
			Array.prototype.forEach.call(box.querySelectorAll('[data-u]'), function (n) { ref[n.getAttribute('data-u')] = n; });
			var title = box.querySelector('.moeqs-cd-title');
			var titleHtml = title ? title.innerHTML : '';
			var EXAM_MS = 3.5 * 3600 * 1000; // בזמן הבחינה עצמה (3.5 שעות) מוצגת ההודעה "מתקיימת היום"
			function pad(n) { return n < 10 ? '0' + n : String(n); }
			function setF(k, v) {
				var n = box.querySelector('[data-f="' + k + '"]');
				if (n) n.textContent = v || '';
			}
			function advance() {
				while (queue.length) {
					var nx = queue.shift(), t = new Date(nx.iso).getTime();
					if (isNaN(t) || t + EXAM_MS <= Date.now()) continue;
					target = t;
					box.setAttribute('data-target', nx.iso);
					setF('date', nx.date); setF('time', nx.time); setF('place', nx.place); setF('for', nx.for);
					var pl = box.querySelector('.moeqs-cd-place'); if (pl) pl.hidden = !nx.place;
					var fr = box.querySelector('.moeqs-cd-for'); if (fr) fr.hidden = !nx.for;
					if (title) title.innerHTML = titleHtml;
					return true;
				}
				return false;
			}
			var iv = null;
			function tick() {
				var left = Math.floor((target - Date.now()) / 1000);
				if (left <= 0) {
					if (Date.now() - target >= EXAM_MS && advance()) { tick(); return; }
					ref.d.textContent = ref.h.textContent = ref.m.textContent = ref.s.textContent = '00';
					if (title) title.textContent = 'הבחינה הממשלתית מתקיימת היום';
					if (!queue.length && Date.now() - target >= EXAM_MS && iv) clearInterval(iv);
					return;
				}
				ref.d.textContent = String(Math.floor(left / 86400));
				ref.h.textContent = pad(Math.floor((left % 86400) / 3600));
				ref.m.textContent = pad(Math.floor((left % 3600) / 60));
				ref.s.textContent = pad(left % 60);
			}
			tick();
			iv = setInterval(tick, 1000);
		});
		initExamStatus();
	}

	/* 3.20.0: סטטוס ההרשמה בלוח המועדים מחושב מחדש בדפדפן לפי התאריך של היום (גם אם העמוד נשמר במטמון) */
	function initExamStatus() {
		var DAY = 86400000;
		function at(v, end) { // "YYYY-MM-DD" -> תחילת היום, או סופו
			if (!v) return NaN;
			var p = v.split('-'); if (p.length !== 3) return NaN;
			var d = new Date(+p[0], +p[1] - 1, +p[2]).getTime();
			return end ? d + DAY - 1 : d;
		}
		var LBL = { open: 'ההרשמה פתוחה', soon: 'בקרוב', done: 'הסתיים' };
		Array.prototype.forEach.call(document.querySelectorAll('.moeqs-exst[data-exam]'), function (n) {
			var now = Date.now(), exam = new Date(n.getAttribute('data-exam')).getTime();
			var op = at(n.getAttribute('data-open')), cl = at(n.getAttribute('data-close'), true);
			var st = 'soon';
			if (!isNaN(exam) && now > exam) st = 'done';
			else if (!isNaN(op) && !isNaN(cl)) st = now < op ? 'soon' : (now <= cl ? 'open' : 'done');
			n.className = 'moeqs-exst is-' + st;
			n.textContent = LBL[st];
			var tr = n.closest ? n.closest('tr') : null;
			if (tr) tr.classList.toggle('is-past', !isNaN(exam) && now > exam);
		});
	}

	function toast(msg, kind) {
		var t = document.getElementById('moeqs-toast');
		if (!t) { t = document.createElement('div'); t.id = 'moeqs-toast'; t.className = 'moeqs-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
		t.className = 'moeqs-toast is-' + (kind || 'ok') + ' is-show';
		t.textContent = msg;
		clearTimeout(t._h);
		t._h = setTimeout(function () { t.className = 'moeqs-toast'; }, 5200);
	}
	function pendingToast() {
		try { var m = sessionStorage.getItem('moeqs_toast'); if (m) { sessionStorage.removeItem('moeqs_toast'); toast(m, 'ok'); } } catch (e) { /* ignore */ }
	}

	function initReset() {
		var btns = document.querySelectorAll('[data-moeqs-reset]');
		var dlg = document.getElementById('moeqs-reset-dlg');
		if (!btns.length || !dlg) return;
		var msg = dlg.querySelector('.moeqs-rd-msg');
		function doReset(withSaved) {
			var yes = dlg.querySelector('[data-act="yes"]'), no = dlg.querySelector('[data-act="no"]');
			yes.disabled = true; no.disabled = true; yes.textContent = 'מאפס...';
			msg.className = 'moeqs-rd-msg is-busy'; msg.innerHTML = '<span class="moeqs-spin" aria-hidden="true"></span> מאפס את הסטטיסטיקה, נא להמתין...';
			fetch(dlg.getAttribute('data-url'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': dlg.getAttribute('data-nonce') }, body: JSON.stringify({ with_saved: withSaved ? 1 : 0 }) })
				.then(function (r) { if (!r.ok) throw new Error('fail'); return r.json(); })
				.then(function () {
					msg.className = 'moeqs-rd-msg is-done'; msg.textContent = '✓ הסטטיסטיקה אופסה בהצלחה.';
					try { sessionStorage.setItem('moeqs_toast', 'הסטטיסטיקה אופסה בהצלחה.'); } catch (e) { /* ignore */ }
					setTimeout(function () { location.reload(); }, 1100);
				})
				.catch(function () {
					msg.className = 'moeqs-rd-msg is-fail'; msg.textContent = 'האיפוס נכשל. נסו שוב.';
					yes.disabled = false; no.disabled = false; yes.textContent = 'כן, אפס הכול';
				});
		}
		Array.prototype.forEach.call(btns, function (b) {
			b.addEventListener('click', function () {
				if (dlg.showModal) { msg.textContent = ''; dlg.showModal(); var no = dlg.querySelector('[data-act="no"]'); if (no) no.focus(); }
				else if (window.confirm('האם אתה בטוח? כל הסטטיסטיקה תימחק ולא ניתן יהיה לשחזר אותה.')) doReset(false);
			});
		});
		dlg.addEventListener('click', function (e) {
			var act = e.target.getAttribute && e.target.getAttribute('data-act');
			if (act === 'no') dlg.close();
			if (act === 'yes') doReset(dlg.querySelector('#moeqs-rd-saved').checked);
		});
	}

	function initNavFont() {
		var a = document.querySelector('header .wp-block-navigation a, header nav a, header a');
		if (!a) return;
		var ff = window.getComputedStyle(a).fontFamily;
		if (ff) document.documentElement.style.setProperty('--moeqs-nav-font', ff);
	}
	function initRegisterLink() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-moeqs-goto-register]'), function (l) {
			l.addEventListener('click', function () { setTimeout(function () { var f = document.getElementById('rg-first'); if (f) f.focus({ preventScroll: true }); }, 60); });
		});
	}

	function boot() {
		pendingToast();
		initNavFont();
		initRegisterLink();
		initReset();
		initCountdowns();
		var roots = document.querySelectorAll('.moeqs-data');
		for (var i = 0; i < roots.length; i++) {
			var dataEl = roots[i];
			var root = dataEl.parentNode;
			if (!root || root.getAttribute('data-ready')) continue;
			var cfg;
			try { cfg = JSON.parse(dataEl.textContent); } catch (e) { continue; }
			root.setAttribute('data-ready', '1');
			if (cfg.view === 'sample') initSample(root, cfg);
			else if (cfg.view === 'journal-guest') initGuestJournal(root, cfg);
			else if (cfg.view === 'quiz') initQuiz(root, cfg);
			else if (cfg.view === 'resume') initResumeHub(root, cfg); // 3.21.25
		}
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
	else boot();
})();

/* הצגה והסתרה של סיסמה בשדות סיסמה */
(function () {
	'use strict';
	document.addEventListener('click', function (e) {
		var b = e.target.closest ? e.target.closest('.moeqs-pw-toggle') : null;
		if (!b) { return; }
		var i = b.parentNode.querySelector('input');
		if (!i) { return; }
		var show = i.type === 'password';
		i.type = show ? 'text' : 'password';
		b.textContent = show ? 'הסתר' : 'הצג';
		b.setAttribute('aria-pressed', show ? 'true' : 'false');
		b.setAttribute('aria-label', show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה');
		i.focus();
	});
}());

/* 3.21.9: קישור "לכל מועדי הבחינות וזמני ההרשמה ↓" בכרטיס הטיימר, עם גלילה חלקה ללוח המועדים.
   אם הלוח לא נמצא בעמוד הנוכחי, הקישור מוביל ללוח שבעמוד הבית. */
(function () {
	var ID = 'moeqs-exam-dates-section';
	function board() { return document.getElementById(ID); }
	function go(el) {
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		try { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(true); }
		if (window.history && history.pushState) { history.pushState(null, '', '#' + ID); }
		var h = el.querySelector('h2');
		if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e2) { } }
	}
	function addLinks() {
		var url = board() ? '#' + ID : (window.moeqsExamBoardUrl || '');
		if (!url) return;
		Array.prototype.forEach.call(document.querySelectorAll('.moeqs-cd'), function (box) {
			if (box.querySelector('.moeqs-cd-all')) return;
			var p = document.createElement('p');
			p.className = 'moeqs-cd-more';
			var a = document.createElement('a');
			a.className = 'moeqs-cd-all';
			a.href = url;
			a.appendChild(document.createTextNode('לכל מועדי הבחינות וזמני ההרשמה '));
			var ar = document.createElement('span');
			ar.setAttribute('aria-hidden', 'true');
			ar.textContent = '↓';
			a.appendChild(ar);
			p.appendChild(a);
			var when = box.querySelector('.moeqs-cd-when');
			if (when && when.parentNode === box) { box.insertBefore(p, when.nextSibling); } else { box.appendChild(p); }
		});
	}
	document.addEventListener('click', function (ev) {
		var a = ev.target && ev.target.closest ? ev.target.closest('.moeqs-cd-all') : null;
		if (!a) return;
		var el = board();
		if (!el) return; // אין לוח בעמוד הזה: ממשיכים לעמוד הבית
		ev.preventDefault();
		go(el);
	});
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', addLinks); } else { addLinks(); }
	// הגעה מעמוד אחר עם #moeqs-exam-dates-section: מיישרים שוב אחרי טעינת הגופנים והתמונות, כדי שהכותרת לא תוסתר
	window.addEventListener('load', function () {
		if (location.hash === '#' + ID && board()) { board().scrollIntoView({ block: 'start' }); }
	});
}());
