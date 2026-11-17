/* 3.22.11: מחשבונים מתקדמים לחשמלאי בשטח – ממשק.
   כל החישובים, הטבלאות והספים מגיעים מ-calc-pro-lib.js (window.moeqsProLib), שהוא הקוד המקורי של המחשבונים
   (TypeScript) כפי שהוא, אחרי הידור בלבד. הקובץ הזה רק בונה את המסכים ולא מחשב דבר בעצמו,
   מלבד עיגול לתצוגה (fmt, floor2) והמרת קלט (num) – כמו במסכים המקוריים. */
(function () {
	'use strict';
	var P = window.moeqsProLib;
	if (!P) return;

	/* ---- עזרים: זהים למסכים המקוריים ---- */
	function num(s) { return Number(String(s).replace(',', '.')); }
	function fmt(n, d) { d = d === undefined ? 1 : d; return n.toLocaleString('he-IL', { maximumFractionDigits: d, minimumFractionDigits: d }); }
	function floor2(n) { return (Math.floor(n * 100) / 100).toFixed(2); }
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

	/* ---- רכיבי ממשק ---- */
	function chips(key, options, value, label) {
		return '<div class="mqp-chips" role="group">' + options.map(function (o) {
			var on = String(o) === String(value);
			return '<button type="button" class="mqp-chip' + (on ? ' is-on' : '') + '" data-k="' + key + '" data-v="' + esc(o) + '" aria-pressed="' + on + '">' + esc(label ? label(o) : o) + '</button>';
		}).join('') + '</div>';
	}
	function presets(key, items, isOn, label) {
		return '<div class="mqp-chips" role="group">' + items.map(function (it, i) {
			var on = isOn(it);
			return '<button type="button" class="mqp-preset' + (on ? ' is-on' : '') + '" data-k="' + key + '" data-v="' + i + '" aria-pressed="' + on + '">' + esc(label(it, on)) + '</button>';
		}).join('') + '</div>';
	}
	function select(key, label, options, value, extra) {
		return '<select class="mqp-in" data-k="' + key + '" aria-label="' + esc(label) + '"' + (extra || '') + '>' + options.map(function (o) {
			return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
		}).join('') + '</select>';
	}
	function input(key, label, value, unit) {
		return '<div class="mqp-inw"><input class="mqp-in mqp-ltr" data-k="' + key + '" aria-label="' + esc(label) + '" inputmode="decimal" value="' + esc(value) + '"><span class="mqp-unit">' + esc(unit || '') + '</span></div>';
	}
	function row(title, body, cls) { return '<div class="mqp-row' + (cls ? ' ' + cls : '') + '"><p class="mqp-rt">' + esc(title) + '</p>' + body + '</div>'; }
	function status(ok, inner) { return '<div class="mqp-status ' + (ok ? 'is-ok' : 'is-bad') + '" role="status">' + inner + '</div>'; }
	function list(title, rowsHtml) { return '<div class="mqp-list"><h3>' + esc(title) + '</h3><p class="mqp-sub">לחיצה על שורה מציגה את פירוט החישוב</p><ul>' + rowsHtml + '</ul></div>'; }
	function li(key, val, sel, dotCls, dotLabel, left, right, rightCls) {
		return '<li><button type="button" class="mqp-li' + (sel ? ' is-sel' : '') + '" data-k="' + key + '" data-v="' + esc(val) + '"><span class="mqp-lil"><span class="mqp-dot ' + dotCls + '" aria-label="' + esc(dotLabel) + '"></span><span class="mqp-ltr" dir="ltr">' + esc(left) + '</span></span><span class="mqp-ltr ' + (rightCls || '') + '">' + esc(right) + '</span></button></li>';
	}

	/* ---- מסגרת: טופס שנבנה מחדש בשינוי מבנה, תוצאה שמתעדכנת בכל הקלדה ---- */
	function mount(root, T) {
		var st = T.init();
		root.innerHTML = '<div class="mqp"><div class="mqp-card mqp-form" data-f></div><div class="mqp-res" data-r aria-live="polite"></div></div>';
		var form = root.querySelector('[data-f]'), res = root.querySelector('[data-r]');
		function drawForm() {
			var a = document.activeElement, k = a && a.getAttribute && a.getAttribute('data-k'), v = a && a.getAttribute && a.getAttribute('data-v');
			form.innerHTML = T.form(st);
			if (k) { var t = form.querySelector('[data-k="' + k + '"]' + (v !== null ? '[data-v="' + v + '"]' : '')) || form.querySelector('[data-k="' + k + '"]'); if (t) t.focus({ preventScroll: true }); }
		}
		function drawRes() { res.innerHTML = T.result(st); }
		function all() { drawForm(); drawRes(); }
		function act(k, v, isText) {
			var structural = T.set(st, k, v);
			if (isText && !structural) { drawRes(); if (T.live) T.live(st, form); } else all();
		}
		root.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-k]'); if (!b || !root.contains(b)) return;
			act(b.getAttribute('data-k'), b.getAttribute('data-v'), false);
		});
		root.addEventListener('input', function (e) { var t = e.target; if (t.matches('input[data-k]')) act(t.getAttribute('data-k'), t.value, true); });
		root.addEventListener('change', function (e) { var t = e.target; if (t.matches('select[data-k]')) act(t.getAttribute('data-k'), t.value, false); });
		all();
	}

	var T = {};

	/* ================= 1. ערך LT מרבי ================= */
	T.lt = {
		init: function () { return { panel: 'class2', inAmps: 16, curve: 'C', cMan: false, measured: '' }; },
		k: function (s) { return s.curve === 'C' && s.cMan ? P.C_MANUFACTURER_MULTIPLIER : P.CURVE_MULTIPLIERS[s.curve]; },
		set: function (s, k, v) {
			if (k === 'panel') s.panel = v; else if (k === 'inAmps' || k === 'pick') s.inAmps = Number(v);
			else if (k === 'curve') s.curve = v; else if (k === 'cman') s.cMan = v === 'manufacturer';
			else if (k === 'measured') { s.measured = v; return false; }
			return true;
		},
		form: function (s) {
			var k = this.k(s), L = P.PANEL_LABELS;
			return row('1. סוג הלוח', chips('panel', ['class1', 'class2'], s.panel, function (p) { return L[p].title; })) +
				row('2. ' + L[s.panel].breakerQuestion, select('inAmps', L[s.panel].breakerQuestion, P.MCB_SIZES.map(function (a) { return [a, a + 'A']; }), s.inAmps, ' dir="ltr"')) +
				row('3. אופיין המא"ז', chips('curve', ['B', 'C', 'D', 'K', 'Z'], s.curve) +
					(s.curve === 'C' ? chips('cman', ['standard', 'manufacturer'], s.cMan ? 'manufacturer' : 'standard', function (v) { return v === 'standard' ? '×10 (לפי התקן)' : '×6.6 (לפי נתוני יצרן)'; }) : '') +
					'<p class="mqp-hint">ניתוק תוך 5 שניות בזרם של פי ' + k + ' מהזרם הנקוב' + (s.curve === 'C' && s.cMan ? ' – רק אם היצרן מצהיר על כך באופיין שלו.' : '.') + '</p>') +
				row('4. ערך LT שנמדד (לא חובה)', input('measured', 'ערך LT שנמדד באוהם', s.measured, 'Ω'));
		},
		result: function (s) {
			var k = this.k(s), mv = s.measured.trim() ? num(s.measured) : null;
			var r = P.checkLoop(s.inAmps, k, mv !== null && mv > 0 ? mv : null), bad = r.measuredOk === false;
			var h = status(!bad, '<p class="mqp-sl">ערך LT מרבי מותר</p><p class="mqp-big mqp-ltr" dir="ltr">' + floor2(r.maxZ) + ' Ω</p>' +
				(r.measuredOk !== null ? '<p class="mqp-sv">' + (r.measuredOk ? '✓ הערך שנמדד תקין' : '✗ הערך שנמדד גבוה מהמותר – המא"ז לא ינתק בזמן') + ' <span class="mqp-ltr" dir="ltr">(' + esc(mv) + ' Ω ' + (r.measuredOk ? '≤' : '>') + ' ' + floor2(r.maxZ) + ' Ω)</span></p>' : ''));
			h += '<div class="mqp-card mqp-detail"><h3>החישוב</h3><p class="mqp-ltr" dir="ltr">Ia = ' + k + ' × ' + s.inAmps + 'A = ' + r.ia + 'A</p><p class="mqp-ltr" dir="ltr">Zs = ' + P.U0 + 'V ÷ (' + k + ' × ' + s.inAmps + 'A) = <strong>' + floor2(r.maxZ) + ' Ω</strong></p></div>';
			h += '<div class="mqp-list"><h3>כל הגדלים – אופיין ' + s.curve + ' (×' + k + ')</h3><ul>' + P.MCB_SIZES.map(function (a) {
				return '<li><button type="button" class="mqp-li' + (a === s.inAmps ? ' is-sel' : '') + '" data-k="pick" data-v="' + a + '"><span class="mqp-ltr" dir="ltr">' + a + 'A</span><span class="mqp-ltr" dir="ltr">' + floor2(P.maxLoopImpedance(a, k)) + ' Ω</span></button></li>';
			}).join('') + '</ul></div>';
			return h + '<p class="mqp-src">מקור: המאמר "עכבת לולאת התקלה" של חברת החשמל, טבלה 1 (נתוני ABB). הערכים מעוגלים כלפי מטה. אופיין C לפי נתוני יצרן (×6.6) – רק כשהיצרן מצהיר על כך. כלי עזר – אינו מחליף בדיקה לפי תקנות החשמל.</p>';
		}
	};

	/* ================= 2. מפל מתח על כבל (עמדת טעינה) ================= */
	T.vd = {
		init: function () { return { voltage: 400, mode: 'kw', kw: '11', amps: '16', cos: '1', length: '30', material: 'copper', insulation: 'xlpe', parallel: 1, maxDrop: 3, check: null }; },
		calc: function (s) {
			var cos = Math.min(1, Math.max(0.5, num(s.cos) || 1));
			var amps = s.mode === 'kw' ? P.currentFromPower(num(s.kw) || 0, s.voltage, cos) : num(s.amps) || 0;
			var lengthM = num(s.length) || 0;
			return { cos: cos, amps: amps, lengthM: lengthM, valid: amps > 0 && lengthM > 0 };
		},
		set: function (s, k, v) {
			if (k === 'ev') { var p = P.EV_PRESETS[+v]; s.mode = 'kw'; s.kw = String(p.kw); s.voltage = p.voltage; s.cos = '1'; s.check = null; return true; }
			if (k === 'voltage') { s.voltage = Number(v); return true; }
			if (k === 'mode') { s.mode = v; return true; }
			if (k === 'material' || k === 'insulation') { s[k] = v; return true; }
			if (k === 'parallel' || k === 'maxDrop') { s[k] = Number(v); return true; }
			if (k === 'pick') { s.check = Number(v); return false; }
			if (k === 'range') { s.length = v; return false; }
			if (k === 'kw' || k === 'amps' || k === 'cos' || k === 'length') { s[k] = v; return false; }
			return true;
		},
		live: function (s, form) {
			var c = this.calc(s), cur = form.querySelector('[data-cur]');
			if (cur) cur.innerHTML = c.valid && s.mode === 'kw' ? 'זרם בקו: <strong class="mqp-ltr">' + fmt(c.amps) + 'A</strong>' : '';
			var rg = form.querySelector('[data-k="range"]'); if (rg && document.activeElement !== rg) rg.value = Math.min(300, c.lengthM || 1);
			var ln = form.querySelector('[data-k="length"]'); if (ln && document.activeElement !== ln) ln.value = s.length;
			form.querySelectorAll('[data-k="ev"]').forEach(function (b, i) {
				var p = P.EV_PRESETS[i], on = s.mode === 'kw' && num(s.kw) === p.kw && s.voltage === p.voltage;
				b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); b.textContent = (on ? '✓' : '⚡') + ' ' + p.label;
			});
		},
		form: function (s) {
			var c = this.calc(s), ML = P.MATERIAL_LABELS, IL = P.INSULATION_LABELS;
			return row('עמדת טעינה – בחירה מהירה', presets('ev', P.EV_PRESETS, function (p) { return s.mode === 'kw' && num(s.kw) === p.kw && s.voltage === p.voltage; }, function (p, on) { return (on ? '✓' : '⚡') + ' ' + p.label; })) +
				row('מתח הזנה', chips('voltage', P.VOLTAGES, s.voltage, function (v) { return v + 'V ' + (P.isThreePhase(v) ? 'תלת-פאזי' : 'חד-פאזי'); })) +
				row('עומס', chips('mode', ['kw', 'amps'], s.mode, function (m) { return m === 'kw' ? 'לפי הספק (kW)' : 'לפי זרם (A)'; }) +
					(s.mode === 'kw' ? input('kw', 'הספק בקילוואט', s.kw, 'kW') : input('amps', 'זרם באמפר', s.amps, 'A')) +
					(s.mode === 'kw' ? '<div class="mqp-inline"><span>מקדם הספק cos φ:</span><input class="mqp-in mqp-ltr mqp-sm" data-k="cos" aria-label="מקדם הספק" inputmode="decimal" value="' + esc(s.cos) + '"><span class="mqp-hint">(עמדת טעינה ≈ 1)</span></div>' : '') +
					'<p class="mqp-hint" data-cur>' + (c.valid && s.mode === 'kw' ? 'זרם בקו: <strong class="mqp-ltr">' + fmt(c.amps) + 'A</strong>' : '') + '</p>') +
				row('אורך הקו', input('length', 'אורך הקו במטרים', s.length, 'מטר') + '<input type="range" class="mqp-range" min="1" max="300" data-k="range" aria-label="אורך הקו" value="' + Math.min(300, c.lengthM || 1) + '">') +
				row('סוג הכבל', chips('material', ['copper', 'aluminum'], s.material, function (m) { return ML[m]; }) + chips('insulation', ['xlpe', 'pvc'], s.insulation, function (m) { return IL[m]; })) +
				'<div class="mqp-grid2">' + row('כבלים במקביל', select('parallel', 'מספר כבלים במקביל', Array.from({ length: 30 }, function (_, i) { return [i + 1, i + 1]; }), s.parallel)) +
				row('מפל מותר', select('maxDrop', 'מפל מתח מותר', [3, 4, 5].map(function (p) { return [p, p + '%']; }), s.maxDrop)) + '</div>';
		},
		result: function (s) {
			var c = this.calc(s), ML = P.MATERIAL_LABELS, IL = P.INSULATION_LABELS;
			if (!c.valid) return '<div class="mqp-card"><p class="mqp-empty">הזן עומס ואורך קו</p></div>';
			var rows = P.calcAllSections({ voltage: s.voltage, parallel: s.parallel, material: s.material, insulation: s.insulation, amps: c.amps, lengthM: c.lengthM, cosPhi: c.cos, maxDropPct: s.maxDrop });
			var rec = rows.find(function (r) { return r.ok; }) || null;
			var selS = s.check !== null ? s.check : (rec ? rec.section : null), sel = rows.find(function (r) { return r.section === selS; }) || null;
			var h = status(!!rec, rec ? '<p class="mqp-sl">הכבל המתאים הקטן ביותר</p><p class="mqp-big mqp-ltr" dir="ltr">' + P.cableLabel(s.voltage, rec.section, s.parallel) + ' mm²</p><p class="mqp-sl">' + ML[s.material] + ' · ' + IL[s.insulation] + ' · מפל <span class="mqp-ltr">' + fmt(rec.dropV) + 'V (' + fmt(rec.dropPct, 2) + '%)</span></p>'
				: '<p class="mqp-sv">אין חתך שעומד במפל המותר</p><p class="mqp-sl">הוסף כבלים במקביל, קצר את הקו או בחר מתח גבוה יותר.</p>');
			if (c.amps / s.parallel > 20) h += '<div class="mqp-warn"><strong>לוודא כושר העמסה:</strong> הזרם בכל כבל מעל 20A. המחשבון בודק כרגע מפל מתח בלבד – יש לוודא בטבלאות ההעמסה של התקנות שהחתך מתאים לזרם ולשיטת ההתקנה.</div>';
			if (sel) h += '<div class="mqp-card mqp-detail"><div class="mqp-dh"><h3>פירוט – ' + sel.section + ' ממ"ר</h3><span class="' + (sel.ok ? 'mqp-okt' : 'mqp-badt') + '">' + (sel.ok ? '✓ מתאים' : '✗ לא מתאים') + '</span></div>' +
				'<p class="mqp-ltr" dir="ltr">' + fmt(sel.mvPerAm, 2) + ' ÷ 1000 ÷ ' + s.parallel + ' × ' + fmt(c.amps) + ' × ' + fmt(c.lengthM, 0) + ' = <strong>' + fmt(sel.dropV, 2) + 'V</strong></p>' +
				'<p class="mqp-mute">מפל מותר (' + s.maxDrop + '% מ-' + s.voltage + 'V): <span class="mqp-ltr">' + fmt(sel.allowedV, 2) + 'V</span></p>' +
				(sel.ampacity.status === 'too_small' ? '<p class="mqp-badt">החתך קטן מהמינימום לזרם הזה (' + sel.ampacity.minSection + ' ממ"ר, כלל R-COND-002).</p>' : '') + '</div>';
			h += list('כל החתכים', rows.map(function (r) { return li('pick', r.section, sel && sel.section === r.section, r.ok ? 'is-ok' : 'is-bad', r.ok ? 'מתאים' : 'לא מתאים', P.cableLabel(s.voltage, r.section, s.parallel), fmt(r.dropV) + 'V · ' + fmt(r.dropPct, 2) + '%', r.ok ? 'mqp-okt' : 'mqp-badt'); }).join(''));
			return h + '<p class="mqp-src">חישוב לפי IEC 60364-5-52 נספח G (התנגדות סגולית בטמפרטורת עבודה: נחושת 0.0225, אלומיניום 0.036 Ω·mm²/m). התוצאה היא כלי עזר ואינה מחליפה תכנון ובדיקה לפי תקנות החשמל.</p>';
		}
	};

	/* ================= 3. התאמת מבטח לכבל ================= */
	var TEMPS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
	T.bc = {
		init: function () { return { inAmps: 63, breakerType: 'mcb', threePhase: true, methodId: 'd', material: 'copper', insulation: 'xlpe', parallel: 1, ambientC: 35, grouping: 1, groupCount: 1, spacing: 0, singleCore: false, soil: 2.5, picked: null }; },
		set: function (s, k, v) {
			if (k === 'methodId') {
				var m = P.getMethod(v), prev = P.getMethod(s.methodId);
				s.methodId = v; s.grouping = m.defaultGrouping; s.picked = null;
				if ((prev.env === 'air') !== (m.env === 'air')) s.ambientC = m.env === 'air' ? 35 : 30;
				if (m.env !== prev.env) { s.groupCount = 1; s.spacing = 0; }
				return true;
			}
			if (k === 'inAmps') { s.inAmps = Number(v); s.picked = null; return true; }
			if (k === 'phase') { s.threePhase = v === 'three'; return true; }
			if (k === 'core') { s.singleCore = v === 'single'; return true; }
			if (k === 'pick') { s.picked = Number(v); return false; }
			if (k === 'breakerType' || k === 'material' || k === 'insulation') { s[k] = v; return true; }
			if (k === 'parallel' || k === 'ambientC' || k === 'grouping' || k === 'groupCount' || k === 'spacing' || k === 'soil') { s[k] = Number(v); return true; }
			return true;
		},
		form: function (s) {
			var m = P.getMethod(s.methodId), ML = P.MATERIAL_LABELS, IL = P.INSULATION_LABELS;
			var h = row('מבטח', select('inAmps', 'גודל מבטח', P.BREAKER_SIZES.map(function (a) { return [a, a + 'A']; }), s.inAmps, ' dir="ltr"') + chips('breakerType', ['mcb', 'adjustable', 'fuse'], s.breakerType, function (t) { return P.BREAKER_LABELS[t]; })) +
				row('מעגל', chips('phase', ['single', 'three'], s.threePhase ? 'three' : 'single', function (v) { return v === 'three' ? 'תלת-מופעי' : 'חד-מופעי'; })) +
				row('שיטת התקנה', select('methodId', 'שיטת התקנה', P.INSTALL_METHODS.map(function (x) { return [x.id, x.code + ' – ' + x.description]; }), s.methodId)) +
				row('כבל', chips('material', ['copper', 'aluminum'], s.material, function (x) { return ML[x]; }) + chips('insulation', ['xlpe', 'pvc'], s.insulation, function (x) { return IL[x] + ' (' + (x === 'pvc' ? '70' : '90') + '°C)'; })) +
				'<div class="mqp-grid2">' + row('כבלים במקביל', select('parallel', 'כבלים במקביל', Array.from({ length: 12 }, function (_, i) { return [i + 1, i + 1]; }), s.parallel)) +
				row(m.env === 'air' ? 'טמפ׳ אוויר' : 'טמפ׳ קרקע', select('ambientC', 'טמפרטורה אופפת', TEMPS.map(function (t) { return [t, t + '°C']; }), s.ambientC)) + '</div>';
			if (m.env === 'air') {
				h += row('קיבוץ כבלים (טבלה 4)', select('grouping', 'אופן הקיבוץ', P.K_GROUPING.map(function (g) { return [g.id, g.label]; }), s.grouping) +
					'<div class="mqp-inline"><span>מעגלים / כבלים רב-גידיים בקבוצה:</span>' + select('groupCount', 'מספר מעגלים בקבוצה', P.GROUP_COUNTS.map(function (n) { return [n, n]; }), s.groupCount, ' style="width:6em"') + '</div>');
			} else {
				var gd = m.env === 'ground_direct';
				h += row(gd ? 'מעגלים טמונים (טבלה 5)' : 'צינורות באדמה (טבלאות 6–7)',
					(!gd ? chips('core', ['multi', 'single'], s.singleCore ? 'single' : 'multi', function (v) { return v === 'single' ? 'חד-גידיים' : 'רב-גידיים'; }) : '') +
					'<div class="mqp-grid2">' + select('groupCount', 'מספר מעגלים', [1, 2, 3, 4, 5, 6].map(function (n) { return [n, n === 1 ? 'מעגל יחיד' : n + ' ' + (gd ? 'מעגלים' : 'קבוצות')]; }), s.groupCount) +
					select('spacing', 'מרחק בין המעגלים', (gd ? P.BURIED_SPACINGS : P.DUCT_SPACINGS).map(function (x, i) { return [i, x]; }), s.spacing, s.groupCount <= 1 ? ' disabled' : '') + '</div>' +
					(gd ? '<div class="mqp-inline"><span>התנגדות תרמית של הקרקע (K·m/W):</span>' + select('soil', 'התנגדות תרמית של הקרקע', P.K_SOIL_RESISTIVITY.map(function (r) { return [r[0], r[0]]; }), s.soil, ' style="width:6em"') + '</div>' : ''));
			}
			return h;
		},
		result: function (s) {
			var m = P.getMethod(s.methodId), ML = P.MATERIAL_LABELS, IL = P.INSULATION_LABELS;
			var r = P.calcBreakerCable({ breakerType: s.breakerType, inAmps: s.inAmps, methodId: s.methodId, insulation: s.insulation, material: s.material, threePhase: s.threePhase, parallel: s.parallel,
				corrections: { ambientC: s.ambientC, groupingArrangement: s.grouping, groupCount: s.groupCount, spacingIndex: s.spacing, singleCore: s.singleCore, soilResistivity: s.soil } });
			if (!r.ok) return '<div class="mqp-status is-bad" role="alert"><p class="mqp-sv">' + esc(r.error) + '</p></div>';
			var pickS = s.picked !== null ? s.picked : (r.recommended ? r.recommended.section : null), sel = r.rows.find(function (x) { return x.section === pickS; }) || null;
			var h = status(!!r.recommended, r.recommended ? '<p class="mqp-sl">החתך הקטן ביותר שמתאים למבטח ' + s.inAmps + 'A</p><p class="mqp-big mqp-ltr" dir="ltr">' + (s.parallel > 1 ? s.parallel + ' × ' : '') + r.recommended.section + ' mm²</p><p class="mqp-sl">' + ML[s.material] + ' · ' + IL[s.insulation] + ' · שיטה ' + esc(m.code) + ' · טבלה ' + r.table + '</p>'
				: '<p class="mqp-sv">אין חתך בטבלה שמתאים</p><p class="mqp-sl">הוסף כבלים במקביל, שנה שיטת התקנה או הקטן את המבטח.</p>');
			if (sel) {
				h += '<div class="mqp-card mqp-detail"><div class="mqp-dh"><h3>פירוט – ' + sel.section + ' ממ"ר</h3><span class="' + (sel.ok ? 'mqp-okt' : 'mqp-badt') + '">' + (sel.ok ? '✓ התנאי מתקיים' : '✗ לא מתקיים') + '</span></div>' +
					'<p>זרם נקוב של המבטח: <strong class="mqp-ltr">In = ' + s.inAmps + 'A</strong></p>' +
					'<p>I׳z נדרש (' + esc(P.BREAKER_LABELS[s.breakerType]) + ', I2 = ' + r.i2Factor + '×In): <strong class="mqp-ltr">' + fmt(r.required, 1) + 'A</strong></p>';
				if (sel.iz === null) h += '<p class="mqp-mute">אין ערך בטבלה ' + r.table + ' לחתך הזה.</p>';
				else {
					h += '<p>Iz מטבלה ' + r.table + ': <strong class="mqp-ltr">' + sel.iz + 'A</strong>' + (s.parallel > 1 ? ' <span class="mqp-ltr">× ' + s.parallel + ' = ' + sel.izTotal + 'A</span>' : '') + '</p>';
					r.factors.forEach(function (f) { h += '<p class="mqp-mute">' + esc(f.label) + ': <span class="mqp-ltr">' + f.key + ' = ' + f.value + '</span></p>'; });
					h += '<p class="mqp-ltr" dir="ltr">I\'z = ' + sel.izTotal + ' × ' + r.factors.map(function (f) { return f.value; }).join(' × ') + ' = <strong>' + fmt(sel.izCorrected, 2) + 'A</strong> ' + (sel.ok ? '≥' : '<') + ' ' + fmt(r.required, 1) + 'A</p>';
				}
				h += '</div>';
			}
			h += list('כל החתכים', r.rows.map(function (x) {
				return li('pick', x.section, sel && sel.section === x.section, x.iz === null ? 'is-none' : (x.ok ? 'is-ok' : 'is-bad'), x.iz === null ? 'אין נתון' : (x.ok ? 'מתאים' : 'לא מתאים'),
					(s.parallel > 1 ? s.parallel + '×' : '') + x.section + ' mm²', x.izCorrected === null ? 'אין נתון' : "I'z " + fmt(x.izCorrected, 1) + 'A', x.iz === null ? 'mqp-mute' : (x.ok ? 'mqp-okt' : 'mqp-badt'));
			}).join(''));
			return h + '<p class="mqp-src">מקור: תקנות החשמל (העמסה והגנה על מוליכים מבודדים וכבלים במתח נמוך), התשע״ד-2014, תקנה 6 והתוספות הראשונה עד השלישית. כבלים במקביל: זהים בחומר, חתך, אורך ואופן התקנה. כלי עזר – אינו מחליף תכנון ובדיקה.</p>';
		}
	};

	/* ================= 4. עלות חשמל למכשיר ================= */
	T.ec = {
		init: function () { return { watts: '1500', hours: '3', days: '30', quantity: '1', price: String(P.DEFAULT_TARIFF), discount: '0' }; },
		input: function (s) {
			return { watts: num(s.watts) || 0, hoursPerDay: Math.min(24, num(s.hours) || 0), daysPerMonth: Math.min(31, num(s.days) || 0), quantity: Math.max(1, Math.round(num(s.quantity) || 1)), pricePerKwh: num(s.price) || 0, discountPct: Math.min(100, Math.max(0, num(s.discount) || 0)) };
		},
		set: function (s, k, v) {
			if (k === 'dev') { var d = P.DEVICE_PRESETS[+v]; s.watts = String(d.watts); s.hours = String(d.hours); return true; }
			if (k === 'resetPrice') { s.price = String(P.DEFAULT_TARIFF); return true; }
			s[k] = v; return false;
		},
		live: function (s, form) {
			var i = this.input(s);
			form.querySelectorAll('[data-k="dev"]').forEach(function (b, n) {
				var d = P.DEVICE_PRESETS[n], on = i.watts === d.watts && i.hoursPerDay === d.hours;
				b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); b.textContent = (on ? '✓ ' : '') + d.label;
			});
		},
		form: function (s) {
			var i = this.input(s);
			return row('מכשירים נפוצים (הערכה)', presets('dev', P.DEVICE_PRESETS, function (d) { return i.watts === d.watts && i.hoursPerDay === d.hours; }, function (d, on) { return (on ? '✓ ' : '') + d.label; })) +
				'<div class="mqp-grid2">' + row('הספק', input('watts', 'הספק', s.watts, 'ואט')) + row('שעות ביום', input('hours', 'שעות ביום', s.hours, 'שעות')) +
				row('ימי שימוש בחודש', input('days', 'ימי שימוש בחודש', s.days, 'ימים')) + row('כמות מכשירים', input('quantity', 'כמות מכשירים', s.quantity, 'יח׳')) +
				row('מחיר לקוט"ש', input('price', 'מחיר לקוט"ש', s.price, '₪')) + row('הנחת ספק', input('discount', 'הנחת ספק', s.discount, '%')) + '</div>' +
				'<p class="mqp-hint">ברירת מחדל: התעריף הביתי האחיד מ-' + P.TARIFF_DATE + ', ' + P.DEFAULT_TARIFF + ' ₪ לקוט"ש כולל מע"מ. <button type="button" class="moeqs-link" data-k="resetPrice">איפוס</button></p>';
		},
		result: function (s) {
			var i = this.input(s);
			if (!(i.watts > 0 && i.hoursPerDay > 0 && i.pricePerKwh > 0)) return '<div class="mqp-card"><p class="mqp-empty">הזן הספק, שעות ומחיר</p></div>';
			var r = P.calcEnergyCost(i);
			var h = status(true, '<p class="mqp-sl">עלות לחודש</p><p class="mqp-big mqp-ltr">' + fmt(r.costPerMonth, 2) + ' ₪</p><p class="mqp-sl mqp-ltr">' + fmt(r.kwhPerMonth, 1) + ' קוט"ש בחודש</p>');
			h += '<div class="mqp-trio">' + [['ליום', r.costPerDay, r.kwhPerDay], ['לחודש', r.costPerMonth, r.kwhPerMonth], ['לשנה', r.costPerYear, r.kwhPerYear]].map(function (x) {
				return '<div><p class="mqp-mute">' + x[0] + '</p><p class="mqp-ltr"><strong>' + fmt(x[1], 2) + ' ₪</strong></p><p class="mqp-mute mqp-ltr">' + fmt(x[2], 1) + ' קוט"ש</p></div>';
			}).join('') + '</div>';
			return h + '<div class="mqp-card mqp-detail"><p class="mqp-ltr" dir="ltr">' + i.watts + ' W ÷ 1000 × ' + i.hoursPerDay + ' h × ' + i.quantity + ' = ' + fmt(r.kwhPerDay, 2) + ' kWh/day</p><p class="mqp-ltr" dir="ltr">' + fmt(r.kwhPerDay, 2) + ' × ' + fmt(r.effectivePrice, 4) + ' ₪ = ' + fmt(r.costPerDay, 2) + ' ₪/day</p>' +
				'<p class="mqp-src">לא כולל תשלומים קבועים בחשבון (חלוקה, אספקה וקיבולת). ההספק של מכשירים כמו מזגן ומקרר משתנה לאורך הפעולה.</p></div>';
		}
	};

	function boot() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-moeqs-pro]'), function (r) {
			var id = r.getAttribute('data-moeqs-pro');
			if (r.getAttribute('data-ready') || !T[id]) return;
			r.setAttribute('data-ready', '1');
			mount(r, T[id]);
		});
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
