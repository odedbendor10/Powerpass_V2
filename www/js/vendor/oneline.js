/* 3.22.10: מחולל שרטוט חד קווי ללוח חשמל.
   הכלי רץ כולו בדפדפן. הטיוטה נשמרת ב-localStorage של המשתמש בלבד; שום נתון לא נשלח לשרת.
   מבנה: מצב (state) → עורך (טופס) → שרטוט SVG → הדפסה / PDF / SVG / PNG / קובץ פרויקט JSON. */
(function () {
	'use strict';
	var CFG = window.moeqsOnelineCfg || {};
	var BRAND = CFG.brand || 'POWERPASS';
	var KEY = 'moeqs_oneline_v1', ACK = 'moeqs_oneline_ack';
	var APP = 'moeqs-oneline';

	/* ---------------- עזרים כלליים ---------------- */
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function str(v, max) { return String(v == null ? '' : v).slice(0, max || 80); }
	function pick(v, list, def) { return list.indexOf(String(v)) >= 0 ? String(v) : def; }
	function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; }
	function heb(s) { return /[\u0590-\u05FF]/.test(String(s)); }
	function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
	var uidN = 0;
	function uid() { uidN++; return 'x' + Date.now().toString(36) + uidN; }
	function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
	function ilDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
	function ls(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch (e) { /* מצב פרטי / חסום */ } return null; }

	var AMP_MAIN = [25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250];
	var AMP_MCB = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
	var AMP_RCD = [25, 40, 63, 80, 100, 125];
	var MM = ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150', '185', '240', '300'];
	var KA = [6, 10, 16, 25, 36, 50, 70];
	var MA = ['10', '30', '100', '300', '500'];
	var MAIN_TYPES = [['mcb', 'מאמ"ת (MCB)'], ['mccb', 'מפסק חצי אוטומטי (MCCB)'], ['acb', 'מפסק אוויר (ACB)']];
	var GROUP_COLORS = ['#bd5226', '#2563eb', '#15803d', '#7e22ce', '#a16207', '#0e7490', '#be185d', '#4338ca'];
	var LINE_COLORS = { L1: '#8b4513', L2: '#1f2937', L3: '#6b7280' };

	/* ---------------- מצב ונרמול ---------------- */
	function circuit(o) {
		o = o || {};
		return { id: o.id && /^[\w-]{1,40}$/.test(o.id) ? o.id : uid(), desc: str(o.desc, 60), amp: str(o.amp === undefined ? '16' : o.amp, 6), curve: pick(o.curve, ['B', 'C', 'D'], 'C'), mm: str(o.mm === undefined ? '2.5' : o.mm, 6), pl: pick(o.pl, ['auto', 'L1', 'L2', 'L3', '3P'], 'auto'), qty: Math.max(1, Math.min(20, parseInt(o.qty, 10) || 1)) };
	}
	function group(o) {
		o = o || {};
		var cs = Array.isArray(o.circuits) ? o.circuits.slice(0, 60).map(circuit) : [];
		return {
			id: o.id && /^[\w-]{1,40}$/.test(o.id) ? o.id : uid(),
			kind: pick(o.kind, ['rcd', 'feeder'], 'rcd'), name: str(o.name, 50),
			ph: pick(o.ph, ['1', '3'], '1'), line: pick(o.line, ['auto', 'L1', 'L2', 'L3'], 'auto'),
			amp: str(o.amp === undefined ? '40' : o.amp, 6), ma: pick(o.ma, MA, '30'), rtype: pick(o.rtype, ['AC', 'A', 'F', 'B'], 'A'),
			pre: !!o.pre, preAmp: str(o.preAmp === undefined ? '40' : o.preAmp, 6), preCurve: pick(o.preCurve, ['B', 'C', 'D'], 'C'),
			famp: str(o.famp === undefined ? '32' : o.famp, 6), fcurve: pick(o.fcurve, ['B', 'C', 'D'], 'C'), fmm: str(o.fmm === undefined ? '6' : o.fmm, 6), sub: str(o.sub, 40),
			circuits: cs
		};
	}
	function normalize(s) {
		s = s && typeof s === 'object' ? s : {};
		var m = s.meta || {}, mn = s.main || {};
		return {
			meta: { panel: str(m.panel, 60), client: str(m.client, 60), addr: str(m.addr, 80), order: str(m.order, 30), designer: str(m.designer, 50), lic: str(m.lic, 30), date: /^\d{4}-\d{2}-\d{2}$/.test(m.date || '') ? m.date : today(), rev: str(m.rev === undefined ? '0' : m.rev, 10), notes: str(m.notes, 500) },
			main: { ph: pick(mn.ph, ['1', '3'], '3'), earth: pick(mn.earth, ['TN-C-S', 'TN-S', 'TT'], 'TN-C-S'), src: str(mn.src === undefined ? 'חברת החשמל' : mn.src, 40), type: pick(mn.type, ['mcb', 'mccb', 'acb'], 'mcb'), amp: str(mn.amp === undefined ? '63' : mn.amp, 6), ka: str(mn.ka === undefined ? '10' : mn.ka, 5), mm: str(mn.mm === undefined ? '16' : mn.mm, 6), mat: pick(mn.mat, ['Cu', 'Al'], 'Cu'), cable: str(mn.cable, 30), spd: !!mn.spd, spdType: pick(mn.spdType, ['1', '2', '1+2'], '2') },
			groups: (Array.isArray(s.groups) ? s.groups : []).slice(0, 40).map(group)
		};
	}
	function sample() {
		return normalize({
			meta: { panel: 'לוח דירה', rev: '0' },
			main: { ph: '3', amp: '40', mm: '10', spd: true },
			groups: [
				{ kind: 'rcd', name: 'תאורה ובתי תקע', ph: '3', amp: '40', circuits: [
					{ desc: 'תאורה – סלון ומטבח', amp: '10', curve: 'B', mm: '1.5' },
					{ desc: 'תאורה – חדרים', amp: '10', curve: 'B', mm: '1.5' },
					{ desc: 'בתי תקע – סלון', amp: '16', mm: '2.5' },
					{ desc: 'בתי תקע – מטבח', amp: '16', mm: '2.5', qty: 2 }
				] },
				{ kind: 'rcd', name: 'מזגנים ודוד', ph: '3', amp: '40', circuits: [
					{ desc: 'מזגן סלון', amp: '20', mm: '2.5' },
					{ desc: 'מזגן חדר שינה', amp: '16', mm: '2.5' },
					{ desc: 'דוד חשמלי', amp: '16', mm: '2.5' }
				] },
				{ kind: 'feeder', name: 'מחסן', ph: '1', famp: '25', fmm: '4', sub: 'לוח מחסן' }
			]
		});
	}
	function blank() { return normalize({ groups: [{ kind: 'rcd', ph: '1', circuits: [{}] }] }); }

	/* ---------------- ניתוח: פאזות, מספור, בדיקות ---------------- */
	function eff(st) {
		var p3 = st.main.ph === '3', load = { L1: 0, L2: 0, L3: 0 }, cnt = { L1: 0, L2: 0, L3: 0 }, n = 0;
		function least() { return ['L1', 'L2', 'L3'].reduce(function (a, b) { return load[b] < load[a] ? b : a; }, 'L1'); }
		function add(line, a) { if (line === '3P') { ['L1', 'L2', 'L3'].forEach(function (l) { load[l] += a || 0; cnt[l]++; }); } else if (load[line] !== undefined) { load[line] += a || 0; cnt[line]++; } }
		var groups = st.groups.map(function (g) {
			var gph = p3 ? g.ph : '1', out = { g: g, ph: gph, line: '', items: [] };
			if (g.kind === 'feeder') {
				out.line = !p3 ? '' : (gph === '3' ? '3P' : (g.line !== 'auto' ? g.line : least()));
				if (p3) add(out.line, num(g.famp));
				out.no = ++n;
				return out;
			}
			var gsum = g.circuits.reduce(function (a, c) { return a + (num(c.amp) || 0) * c.qty; }, 0);
			if (p3 && gph === '1') out.line = g.line !== 'auto' ? g.line : least();
			if (p3 && gph === '3') out.line = '3P';
			g.circuits.forEach(function (c, ci) {
				for (var k = 0; k < c.qty; k++) {
					var cph = gph === '3' && c.pl === '3P' ? '3' : '1', line = '';
					if (p3) {
						if (gph === '1') line = out.line;
						else if (cph === '3') line = '3P';
						else line = c.pl !== 'auto' && c.pl !== '3P' ? c.pl : least();
						if (gph === '3') add(line, num(c.amp));
					}
					out.items.push({ c: c, ci: ci, k: k, ph: cph, line: line, no: ++n });
				}
			});
			if (p3 && gph === '1') add(out.line, gsum);
			return out;
		});
		return { p3: p3, groups: groups, load: load, cnt: cnt, total: n };
	}

	function checks(st, E) {
		var out = [], mainA = num(st.main.amp);
		if (!isFinite(mainA)) out.push(['warn', 'חסר זרם נקוב למפסק הראשי.']);
		if (!st.groups.length) out.push(['info', 'עדיין אין קבוצות בלוח. הוסיפו קבוצת פחת או הזנה ללוח משנה.']);
		E.groups.forEach(function (eg, gi) {
			var g = eg.g, tag = 'קבוצה ' + (gi + 1) + (g.name ? ' (' + g.name + ')' : '') + ': ';
			if (g.kind === 'feeder') {
				var fa = num(g.famp);
				if (!isFinite(fa)) out.push(['warn', tag + 'חסר זרם למפסק ההזנה.']);
				else if (isFinite(mainA) && fa > mainA) out.push(['warn', tag + 'מפסק ההזנה (' + fa + 'A) גדול מהמפסק הראשי (' + mainA + 'A).']);
				return;
			}
			var ra = num(g.amp), pa = g.pre ? num(g.preAmp) : NaN, up = g.pre && isFinite(pa) ? pa : mainA;
			if (!isFinite(ra)) out.push(['warn', tag + 'חסר זרם נקוב למפסק הפחת.']);
			if (g.pre && isFinite(pa) && isFinite(ra) && pa > ra) out.push(['warn', tag + 'המא"ז שלפני הפחת (' + pa + 'A) גדול מזרם הפחת (' + ra + 'A).']);
			if (!g.pre && isFinite(mainA) && isFinite(ra) && mainA > ra) out.push(['info', tag + 'הפחת (' + ra + 'A) מוגן רק על ידי המפסק הראשי (' + mainA + 'A). בדקו בנתוני היצרן אם נדרש מא"ז לפני הפחת.']);
			if (!g.circuits.length) out.push(['info', tag + 'אין מעגלים בקבוצה.']);
			g.circuits.forEach(function (c, ci) {
				var a = num(c.amp), nm = c.desc ? '"' + c.desc + '"' : 'מעגל ' + (ci + 1);
				if (!isFinite(a)) { out.push(['warn', tag + 'חסר זרם למפסק של ' + nm + '.']); return; }
				if (isFinite(ra) && a > ra) out.push(['warn', tag + 'המפסק של ' + nm + ' (' + a + 'A) גדול מזרם הפחת (' + ra + 'A).']);
				else if (isFinite(up) && a > up) out.push(['warn', tag + 'המפסק של ' + nm + ' (' + a + 'A) גדול מהמפסק שמזין את הקבוצה (' + up + 'A).']);
				if (!num(c.mm)) out.push(['warn', tag + 'חסר חתך כבל ל-' + nm + '.']);
			});
		});
		return out;
	}

	/* ---------------- תוויות טכניות (תמיד LTR) ---------------- */
	function A(v) { var n = num(v); return isFinite(n) ? String(n) : '?'; }
	function mainRating(m) { return (m.ph === '3' ? '3' : '1') + '×' + A(m.amp) + 'A'; }
	function mainCable(m) { return m.cable ? m.cable : m.mat + ' ' + (m.ph === '3' ? '5' : '3') + '×' + A(m.mm) + 'mm²'; }
	function mcbTxt(ph, curve, amp) { return (ph === '3' ? '3' : '1') + '×' + curve + A(amp) + 'A'; }
	function iso(s) { return '\u2066' + s + '\u2069'; } /* בידוד LTR בתוך טקסט עברי בממשק */
	function gSummary(g, gph, eg) {
		return g.kind === 'feeder' ? 'הזנה ללוח משנה, ' + iso(mcbTxt(gph, g.fcurve, g.famp)) : 'פחת ' + iso((gph === '3' ? '4' : '2') + '×' + A(g.amp) + 'A ' + g.ma + 'mA') + ', ' + eg.items.length + ' יציאות';
	}
	function cableTxt(ph, mm) { return (ph === '3' ? '5' : '3') + '×' + A(mm) + 'mm²'; }

	/* ---------------- שרטוט SVG ---------------- */
	/* טקסט עם כיוון נכון: al = 'r' (צמוד לימין), 'l' (צמוד לשמאל), 'c' (מרכז) */
	function T(x, y, s, o) {
		o = o || {};
		var rtl = heb(s), al = o.al || 'c';
		var anc = al === 'c' ? 'middle' : (al === 'r' ? (rtl ? 'start' : 'end') : (rtl ? 'end' : 'start'));
		return '<text x="' + x + '" y="' + y + '" text-anchor="' + anc + '" direction="' + (rtl ? 'rtl' : 'ltr') + '"' + (o.cls ? ' class="' + o.cls + '"' : '') + (o.fill ? ' fill="' + o.fill + '"' : '') + (o.tr ? ' transform="' + o.tr + '"' : '') + '>' + esc(s) + '</text>';
	}
	function L(x1, y1, x2, y2, cls) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'w') + '"/>'; }
	function dot(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 3.6) + '" class="dot"/>'; }
	/* מאמ"ת: מגע קבוע עם ×, להב פתוח. גובה 44 */
	function symMcb(x, y) {
		return L(x, y, x, y + 10) + '<path d="M' + (x - 4.5) + ' ' + (y + 5.5) + 'l9 9M' + (x + 4.5) + ' ' + (y + 5.5) + 'l-9 9" class="w"/>' + L(x, y + 40, x - 14, y + 13) + L(x, y + 40, x, y + 44);
	}
	/* מפסק פחת: להב + טבעת זרם דלף וקישור מכני מקווקו. גובה 60 */
	function symRcd(x, y) {
		return L(x, y, x, y + 10) + L(x - 5, y + 10, x + 5, y + 10) + L(x, y + 38, x - 14, y + 12) + L(x, y + 38, x, y + 60) +
			'<ellipse cx="' + x + '" cy="' + (y + 50) + '" rx="10" ry="4.5" class="w"/>' + '<path d="M' + (x - 10) + ' ' + (y + 50) + 'h-9v-26h11" class="dash"/>';
	}
	/* מגן מתח יתר: מלבן עם חץ פריקה. גובה 34 */
	function symSpd(x, y) {
		return '<rect x="' + (x - 9) + '" y="' + y + '" width="18" height="34" class="w"/>' + '<path d="M' + (x + 3) + ' ' + (y + 5) + 'l-6 11h6l-6 12" class="w"/><path d="M' + (x - 6) + ' ' + (y + 24) + 'l3 5 3-4" class="w"/>';
	}
	function symEarth(x, y) { return L(x, y, x, y + 8) + L(x - 11, y + 8, x + 11, y + 8) + L(x - 7, y + 13, x + 7, y + 13) + L(x - 3, y + 18, x + 3, y + 18); }
	function ticks(x, y, n) { var s = ''; for (var i = 0; i < n; i++) s += L(x - 5, y + 3 + i * 4, x + 5, y - 3 + i * 4, 'thin'); return s; }
	function lineTag(x, y, line) { return line && line !== '3P' ? T(x, y, line, { al: 'r', cls: 'tag', fill: LINE_COLORS[line] }) : ''; }

	var H = 1000, CW = 80, GPAD = 18, GMIN = 214, FEEDW = 176, GAP = 16;

	function draw(st) {
		var E = eff(st), m = st.main, p3 = E.p3;
		var widths = E.groups.map(function (eg) { return eg.g.kind === 'feeder' ? FEEDW : Math.max(GMIN, eg.items.length * CW + GPAD * 2); });
		var total = widths.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, widths.length - 1) * GAP;
		var spdW = m.spd ? 190 : 60, assembly = total + spdW + 60;
		var W = Math.max(1414, assembly + 120);
		var right = W / 2 + assembly / 2, xm = right - 60, gRight = xm - spdW, gLeft = gRight - total;
		var BUS = 240, s = '';

		/* מסגרת */
		s += '<rect x="14" y="14" width="' + (W - 28) + '" height="' + (H - 28) + '" class="frame"/><rect x="20" y="20" width="' + (W - 40) + '" height="' + (H - 40) + '" class="thin" fill="none"/>';

		/* הזנה ומפסק ראשי */
		s += T(xm, 50, 'הזנה: ' + (m.src || '—'), { cls: 'b' });
		s += '<path d="M' + (xm - 7) + ' 60h14l-7 11z" class="fill"/>' + L(xm, 71, xm, 130);
		s += T(xm - 14, 104, mainCable(m), { al: 'r', cls: 's' });
		if (p3) s += ticks(xm, 118, 3);
		s += symMcb(xm, 130);
		s += T(xm - 22, 146, 'מפסק ראשי', { al: 'r', cls: 'b' }) + T(xm - 22, 162, mainRating(m), { al: 'r' }) + T(xm - 22, 177, m.type.toUpperCase() + (num(m.ka) ? '  Icu ' + A(m.ka) + 'kA' : ''), { al: 'r', cls: 's' });
		s += L(xm, 174, xm, BUS) + dot(xm, BUS, 4.5);

		/* פס צבירה */
		var busL = Math.min(gLeft, xm - 40) - 14, busR = xm + 30;
		s += L(busL, BUS, busR, BUS, 'bus');
		s += T(busL + 4, BUS - 26, 'פס צבירה ראשי', { al: 'l', cls: 'b' });
		s += T(busL + 4, BUS - 10, (p3 ? '3~ 400/230V' : '1~ 230V') + '  50Hz  ' + m.earth, { al: 'l', cls: 's' });

		/* מגן מתח יתר */
		if (m.spd) {
			var xs = xm - 70;
			s += dot(xs, BUS) + L(xs, BUS, xs, 290) + symSpd(xs, 290) + L(xs, 324, xs, 336) + symEarth(xs, 336);
			s += T(xs - 18, 300, 'מגן מתח יתר', { al: 'r', cls: 'b' }) + T(xs - 18, 316, 'SPD Type ' + m.spdType, { al: 'r', cls: 's' });
		}

		/* קבוצות */
		var cursor = gRight;
		E.groups.forEach(function (eg, gi) {
			var g = eg.g, w = widths[gi], x1 = cursor - w, x2 = cursor, cx = Math.round((x1 + x2) / 2), col = GROUP_COLORS[gi % GROUP_COLORS.length];
			cursor = x1 - GAP;
			s += '<rect x="' + (x1 + 2) + '" y="254" width="' + (w - 4) + '" height="516" rx="6" class="gframe"/>';
			s += '<rect x="' + (x1 + 2) + '" y="746" width="' + (w - 4) + '" height="24" rx="0" class="gtab"/>' + L(x1 + 2, 746, x2 - 2, 746, 'gline');
			s += '<rect x="' + (x2 - 6) + '" y="255" width="4" height="514" fill="' + col + '"/>';
			var tab = 'קבוצה ' + (gi + 1) + (g.name ? ' – ' + g.name : '');
			s += T(cx - 3, 763, cut(tab, Math.floor((w - 20) / 6.6)), { cls: 'b' });
			s += dot(cx, BUS);
			if (g.kind === 'feeder') {
				s += L(cx, BUS, cx, 330) + lineTag(cx - 8, 300, eg.line);
				if (eg.ph === '3') s += ticks(cx, 318, 3);
				s += symMcb(cx, 330);
				s += T(cx - 22, 346, 'מפסק הזנה', { al: 'r', cls: 'b' }) + T(cx - 22, 362, mcbTxt(eg.ph, g.fcurve, g.famp), { al: 'r' }) + T(cx - 22, 377, 'C' + eg.no, { al: 'r', cls: 's' });
				s += L(cx, 374, cx, 520) + T(cx - 10, 452, cableTxt(eg.ph, g.fmm), { al: 'r', cls: 's' });
				s += '<rect x="' + (cx - 62) + '" y="520" width="124" height="60" rx="4" class="box"/>';
				s += T(cx, 542, 'לוח משנה', { cls: 's' }) + T(cx, 565, cut(g.sub || g.name || '—', 17), { cls: 'b' });
				s += T(cx, 606, 'הגנת הפחת בלוח המשנה', { cls: 's mute' });
				return;
			}
			var yR = 330;
			s += lineTag(cx - 8, 266, eg.line);
			if (g.pre) {
				s += L(cx, BUS, cx, 270);
				if (eg.ph === '3') s += ticks(cx, 262, 3);
				s += symMcb(cx, 270) + L(cx, 314, cx, yR);
				s += T(cx - 22, 286, 'מא"ז לפני הפחת', { al: 'r', cls: 'b' }) + T(cx - 22, 302, mcbTxt(eg.ph, g.preCurve, g.preAmp), { al: 'r' });
			} else {
				s += L(cx, BUS, cx, yR);
				if (eg.ph === '3') s += ticks(cx, yR - 10, 3);
			}
			s += symRcd(cx, yR);
			s += T(cx - 22, yR + 18, 'מפסק פחת', { al: 'r', cls: 'b' }) + T(cx - 22, yR + 34, (eg.ph === '3' ? '4' : '2') + '×' + A(g.amp) + 'A', { al: 'r' }) + T(cx - 22, yR + 49, g.ma + 'mA  Type ' + g.rtype, { al: 'r', cls: 's' });
			var SUB = 432;
			s += L(cx, yR + 60, cx, SUB);
			var n = eg.items.length;
			if (!n) { s += T(cx, 470, 'אין מעגלים', { cls: 's mute' }); return; }
			var startR = cx + n * CW / 2;
			var xsFirst = startR - CW / 2, xsLast = startR - CW * (n - 0.5);
			if (n > 1) s += L(Math.min(xsLast, cx), SUB, Math.max(xsFirst, cx), SUB, 'sub');
			if (n > 1) s += dot(cx, SUB, 3);
			eg.items.forEach(function (it, k) {
				var x = Math.round(startR - CW * (k + 0.5));
				s += L(x, SUB, x, 468) + lineTag(x - 7, 456, it.line);
				if (it.ph === '3') s += ticks(x, 458, 3);
				s += symMcb(x, 468) + T(x - 18, 504, 'C' + it.no, { al: 'r', cls: 'tag' });
				s += L(x, 512, x, 552) + '<circle cx="' + x + '" cy="556" r="3.6" class="term"/>';
				s += T(0, 0, mcbTxt(it.ph, it.c.curve, it.c.amp), { al: 'r', cls: 'b', tr: 'translate(' + (x - 4) + ',570) rotate(-90)' });
				s += T(0, 0, cableTxt(it.ph, it.c.mm), { al: 'r', cls: 's', tr: 'translate(' + (x + 10) + ',570) rotate(-90)' });
				var d = it.c.desc || '—';
				if (it.c.qty > 1) d += ' (' + (it.k + 1) + '/' + it.c.qty + ')';
				s += T(0, 0, cut(d, 29), { al: 'r', cls: 'd', tr: 'translate(' + (x + 24) + ',570) rotate(-90)' });
			});
		});

		/* תחתית: מקרא, הערות, טבלת כותרת */
		var TB = 600, tbx = W - 40 - TB, ty = 780, bh = 152;
		/* מקרא */
		var lgx = 40, lgw = 380;
		s += '<rect x="' + lgx + '" y="' + ty + '" width="' + lgw + '" height="' + bh + '" class="box"/>';
		s += T(lgx + lgw - 12, ty + 20, 'מקרא', { al: 'r', cls: 'b' });
		var legend = [
			[function (x, y) { return '<g transform="translate(' + x + ',' + (y - 15) + ') scale(.62)">' + symMcb(0, 0) + '</g>'; }, 'מאמ"ת / מפסק זרם'],
			[function (x, y) { return '<g transform="translate(' + x + ',' + (y - 18) + ') scale(.6)">' + symRcd(0, 0) + '</g>'; }, 'מפסק פחת (זרם דלף)'],
			[function (x, y) { return '<g transform="translate(' + x + ',' + (y - 11) + ') scale(.62)">' + symSpd(0, 0) + '</g>'; }, 'מגן מתח יתר'],
			[function (x, y) { return L(x, y - 12, x, y + 12) + ticks(x, y - 4, 3); }, 'מעגל תלת-פאזי'],
			[function (x, y) { return '<g transform="translate(' + x + ',' + (y - 9) + ')">' + symEarth(0, 0) + '</g>'; }, 'הארקה'],
			[function (x, y) { return L(x, y - 12, x, y - 3) + '<circle cx="' + x + '" cy="' + (y + 1) + '" r="3.6" class="term"/>'; }, 'יציאה לצרכן']
		];
		legend.forEach(function (it, i) {
			var colX = lgx + lgw - 30 - (i % 2) * (lgw / 2), rowY = ty + 50 + Math.floor(i / 2) * 34;
			s += it[0](colX, rowY) + T(colX - 22, rowY + 4, it[1], { al: 'r', cls: 's' });
		});
		/* הערות */
		var nx = lgx + lgw + 16, nw = tbx - 16 - nx;
		if (nw > 160) {
			s += '<rect x="' + nx + '" y="' + ty + '" width="' + nw + '" height="' + bh + '" class="box"/>';
			s += T(nx + nw - 12, ty + 20, 'הערות', { al: 'r', cls: 'b' });
			var lines = wrap(st.meta.notes, Math.floor((nw - 24) / 6.2)).slice(0, 5);
			lines.forEach(function (ln, i) { s += T(nx + nw - 12, ty + 42 + i * 17, ln, { al: 'r', cls: 's' }); });
			var gc = st.groups.filter(function (g) { return g.kind === 'rcd'; }).length, fc = st.groups.length - gc;
			s += T(nx + nw - 12, ty + bh - 12, 'בלוח: ' + gc + ' קבוצות פחת, ' + fc + ' הזנות ללוחות משנה, ' + E.total + ' יציאות.', { al: 'r', cls: 's mute' });
		}
		/* טבלת כותרת */
		var md = st.meta;
		s += '<rect x="' + tbx + '" y="' + ty + '" width="' + TB + '" height="' + bh + '" class="frame"/>';
		var r0 = 43;
		s += L(tbx, ty + r0, tbx + TB, ty + r0, 'thin') + L(tbx + 230, ty, tbx + 230, ty + r0, 'thin');
		s += T(tbx + TB - 10, ty + 14, 'שם הלוח', { al: 'r', cls: 'lab' }) + T(tbx + TB - 10, ty + 35, cut(md.panel || '—', 30), { al: 'r', cls: 'big' });
		s += T(tbx + 220, ty + 14, 'סוג השרטוט', { al: 'r', cls: 'lab' }) + T(tbx + 220, ty + 34, 'שרטוט חד קווי', { al: 'r', cls: 'b' });
		var rows = [[['לקוח', md.client], ['כתובת המתקן', md.addr]], [['מס\' הזמנה בחברת החשמל', md.order], ['תאריך', ilDate(md.date)]], [['מתכנן / מבצע', md.designer], ['מס\' רישיון חשמל', md.lic]], [['גרסה', md.rev], ['גיליון', '1 מתוך 1']]];
		var rh = (bh - r0) / rows.length;
		rows.forEach(function (row, i) {
			var y0 = ty + r0 + i * rh;
			if (i) s += L(tbx, y0, tbx + TB, y0, 'thin');
			s += L(tbx + TB / 2, y0, tbx + TB / 2, y0 + rh, 'thin');
			row.forEach(function (cell, j) {
				var cr = tbx + TB - j * (TB / 2) - 10;
				s += T(cr, y0 + 10, cell[0], { al: 'r', cls: 'lab' }) + T(cr, y0 + 22.5, cut(cell[1] || '—', 40), { al: 'r', cls: 'v' });
			});
		});
		/* הבהרה משפטית בתחתית השרטוט */
		var legal = wrap(CFG.legal || '', Math.floor((W - 120) / 5.3)).slice(0, 2);
		legal.forEach(function (ln, i) { s += T(W / 2, H - 50 + i * 13, ln, { cls: 'legal' }); });
		s += T(W / 2, H - 50 + legal.length * 13, 'הופק באמצעות ' + BRAND + (CFG.site ? ' – ' + CFG.site : ''), { cls: 'legal' });

		var css = 'text{font-family:Assistant,"Segoe UI",Arial,sans-serif;font-size:12.5px;fill:#111}.b{font-weight:700}.s{font-size:11px}.d{font-size:11.5px}.tag{font-size:11px;font-weight:700}.lab{font-size:9px;fill:#555}.v{font-size:11.5px;font-weight:700}.big{font-size:17px;font-weight:700}.mute{fill:#666}.legal{font-size:9.5px;fill:#555}' +
			'.w{stroke:#111;stroke-width:1.8;fill:none;stroke-linecap:round}.thin{stroke:#111;stroke-width:1;fill:none}.bus{stroke:#111;stroke-width:6;stroke-linecap:square}.sub{stroke:#111;stroke-width:3;stroke-linecap:square}.dot{fill:#111}.term{fill:#fff;stroke:#111;stroke-width:1.6}.fill{fill:#111}.dash{stroke:#111;stroke-width:1.1;fill:none;stroke-dasharray:3 2.5}' +
			'.frame{fill:none;stroke:#111;stroke-width:2}.box{fill:none;stroke:#111;stroke-width:1.2}.gframe{fill:#fafbfc;stroke:#9aa3b2;stroke-width:1.2;stroke-dasharray:6 4}.gtab{fill:#eef1f6}.gline{stroke:#9aa3b2;stroke-width:1}';
		return { W: W, H: H, E: E, body: '<style>' + css + '</style><rect width="' + W + '" height="' + H + '" fill="#fff"/>' + s };
	}
	function wrap(text, max) {
		var out = [];
		String(text || '').split(/\r?\n/).forEach(function (para) {
			var line = '';
			para.split(/\s+/).forEach(function (w) {
				if (!w) return;
				if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
			});
			if (line) out.push(line);
		});
		return out;
	}
	function svgString(d, full) {
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + d.W + ' ' + d.H + '"' + (full ? ' width="' + d.W + '" height="' + d.H + '"' : ' role="img" aria-label="שרטוט חד קווי של הלוח"') + '>' + d.body + '</svg>';
	}

	/* ---------------- אייקונים לממשק ---------------- */
	var IC = {
		print: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z"/>',
		down: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
		img: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
		save: '<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
		open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
		full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
		reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		minus: '<path d="M5 12h14"/>',
		copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
		trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
		up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
		dn: '<path d="M12 5v14M6 13l6 6 6-6"/>',
		chev: '<path d="M6 9l6 6 6-6"/>'
	};
	function ic(n) { return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + IC[n] + '</svg>'; }
	function ibtn(act, icon, label, data) { return '<button type="button" class="moeqs-ol-ib" data-act="' + act + '"' + (data || '') + ' aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(icon) + '</button>'; }

	/* ---------------- עורך ---------------- */
	function idOf(k) { return 'ol-' + k.replace(/[^\w]/g, '-'); }
	function inp(label, k, v, o) {
		o = o || {};
		var id = idOf(k);
		var ctl = o.area ? '<textarea id="' + id + '" data-k="' + k + '" rows="3" maxlength="500"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(v) + '</textarea>'
			: '<input id="' + id + '" data-k="' + k + '" type="' + (o.type || 'text') + '" value="' + esc(v) + '"' + (o.list ? ' list="' + o.list + '" inputmode="decimal" autocomplete="off"' : '') + (o.ltr ? ' dir="ltr"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.min ? ' min="' + o.min + '" max="' + o.max + '"' : '') + ' maxlength="' + (o.max ? 3 : 80) + '">';
		return '<div class="moeqs-ol-f' + (o.wide ? ' is-wide' : '') + '"><label for="' + id + '">' + esc(label) + '</label>' + (o.unit ? '<div class="moeqs-ol-unitw">' + ctl + '<span>' + esc(o.unit) + '</span></div>' : ctl) + (o.hint ? '<small>' + esc(o.hint) + '</small>' : '') + '</div>';
	}
	function sel(label, k, v, opts, o) {
		o = o || {};
		var id = idOf(k);
		return '<div class="moeqs-ol-f' + (o.wide ? ' is-wide' : '') + '"><label for="' + id + '">' + esc(label) + '</label><select id="' + id + '" data-k="' + k + '"' + (o.rr ? ' data-rr="1"' : '') + '>' + opts.map(function (op) { return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + (op[2] ? ' disabled' : '') + '>' + esc(op[1]) + '</option>'; }).join('') + '</select></div>';
	}
	function seg(label, k, v, opts) {
		var nm = idOf(k);
		return '<fieldset class="moeqs-ol-f is-wide moeqs-ol-segf"><legend>' + esc(label) + '</legend><div class="moeqs-ol-seg">' + opts.map(function (op, i) {
			var id = nm + '-' + i;
			return '<input type="radio" id="' + id + '" name="' + nm + '" value="' + esc(op[0]) + '" data-k="' + k + '" data-rr="1"' + (String(op[0]) === String(v) ? ' checked' : '') + (op[2] ? ' disabled' : '') + '><label for="' + id + '">' + esc(op[1]) + '</label>';
		}).join('') + '</div></fieldset>';
	}
	function chk(label, k, v) { var id = idOf(k); return '<div class="moeqs-ol-f is-wide"><label class="moeqs-ol-chk" for="' + id + '"><input type="checkbox" id="' + id + '" data-k="' + k + '" data-rr="1"' + (v ? ' checked' : '') + '> ' + esc(label) + '</label></div>'; }
	function sec(n, title, body, open) { return '<details class="moeqs-panel moeqs-ol-sec"' + (open ? ' open' : '') + ' data-sec="' + n + '"><summary><span class="moeqs-ol-step">' + n + '</span><span>' + esc(title) + '</span>' + ic('chev') + '</summary><div class="moeqs-ol-secb">' + body + '</div></details>'; }
	function autoNote(plOpts, c, its) {
		if (!plOpts || c.pl !== 'auto' || !its.length) return '';
		var ls2 = its.map(function (it) { return it.line; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
		return ls2.length ? 'שובץ אוטומטית ל-' + ls2.join(', ') : '';
	}
	function curveOpts() { return [['B', 'B'], ['C', 'C'], ['D', 'D']]; }

	function editorHtml(st, E, ui) {
		var m = st.main, md = st.meta, p3 = m.ph === '3';
		var h = '<datalist id="ol-dl-main">' + AMP_MAIN.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
			'<datalist id="ol-dl-mcb">' + AMP_MCB.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
			'<datalist id="ol-dl-rcd">' + AMP_RCD.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
			'<datalist id="ol-dl-mm">' + MM.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
			'<datalist id="ol-dl-ka">' + KA.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>';

		h += sec(1, 'פרטי הלוח והפרויקט', '<div class="moeqs-ol-fg">' +
			inp('שם הלוח', 'meta.panel', md.panel, { ph: 'לדוגמה: לוח דירה, קומה 2' }) +
			inp('שם הלקוח', 'meta.client', md.client, { ph: 'לדוגמה: משפחת לוי' }) +
			inp('כתובת המתקן', 'meta.addr', md.addr, { ph: 'לדוגמה: הדקל 7, חולון', wide: true }) +
			inp('מס\' הזמנה בחברת החשמל', 'meta.order', md.order, { ltr: true }) +
			inp('תאריך', 'meta.date', md.date, { type: 'date', ltr: true }) +
			inp('מתכנן / מבצע', 'meta.designer', md.designer) +
			inp('מס\' רישיון חשמל', 'meta.lic', md.lic, { ltr: true }) +
			inp('גרסת השרטוט', 'meta.rev', md.rev, { ltr: true, ph: '0' }) +
			inp('הערות לשרטוט', 'meta.notes', md.notes, { area: true, wide: true, ph: 'יופיעו בתיבת ההערות בתחתית השרטוט' }) +
			'</div>', ui.open[1]);

		h += sec(2, 'הזנה ומפסק ראשי', '<div class="moeqs-ol-fg">' +
			seg('סוג המערכת', 'main.ph', m.ph, [['1', 'חד-פאזי 230V'], ['3', 'תלת-פאזי 400V']]) +
			inp('מקור ההזנה', 'main.src', m.src, { ph: 'חברת החשמל / לוח ראשי' }) +
			sel('שיטת הארקה', 'main.earth', m.earth, [['TN-C-S', 'TN-C-S (איפוס)'], ['TN-S', 'TN-S'], ['TT', 'TT (הארקת הגנה)']]) +
			sel('סוג המפסק הראשי', 'main.type', m.type, MAIN_TYPES) +
			inp('זרם נקוב', 'main.amp', m.amp, { list: 'ol-dl-main', unit: 'A' }) +
			inp('כושר ניתוק', 'main.ka', m.ka, { list: 'ol-dl-ka', unit: 'kA' }) +
			inp('חתך כבל ההזנה', 'main.mm', m.mm, { list: 'ol-dl-mm', unit: 'mm²' }) +
			seg('חומר המוליך', 'main.mat', m.mat, [['Cu', 'נחושת'], ['Al', 'אלומיניום']]) +
			inp('תצורת כבל (לא חובה)', 'main.cable', m.cable, { ltr: true, wide: true, ph: '4×50+25', hint: 'אם השדה ריק, התצורה נכתבת לפי מספר הפאזות והחתך.' }) +
			chk('מגן מתח יתר (SPD) בלוח', 'main.spd', m.spd) +
			(m.spd ? sel('דרגת ה-SPD', 'main.spdType', m.spdType, [['1', 'Type 1'], ['2', 'Type 2'], ['1+2', 'Type 1+2']]) : '') +
			'</div>', ui.open[2]);

		var gh = '';
		st.groups.forEach(function (g, gi) {
			var eg = E.groups[gi], col = GROUP_COLORS[gi % GROUP_COLORS.length], gp = 'groups.' + gi + '.', closed = ui.closed[g.id];
			var gph = p3 ? g.ph : '1';
			var summ = gSummary(g, gph, eg);
			gh += '<article class="moeqs-ol-group" style="--gc:' + col + '" data-gid="' + g.id + '">';
			gh += '<header><span class="moeqs-ol-gbadge">' + (gi + 1) + '</span><div class="moeqs-ol-gtitle"><strong>' + esc(g.name || (g.kind === 'feeder' ? 'הזנה ללוח משנה' : 'קבוצת פחת')) + '</strong><span>' + esc(summ) + '</span></div>';
			gh += '<div class="moeqs-ol-gact">' + ibtn('g-up', 'up', 'הזזת הקבוצה למעלה', ' data-g="' + gi + '"') + ibtn('g-dn', 'dn', 'הזזת הקבוצה למטה', ' data-g="' + gi + '"') + ibtn('g-dup', 'copy', 'שכפול הקבוצה', ' data-g="' + gi + '"') + ibtn('g-del', 'trash', 'מחיקת הקבוצה', ' data-g="' + gi + '"') +
				'<button type="button" class="moeqs-ol-ib moeqs-ol-tog" data-act="g-tog" data-g="' + gi + '" aria-expanded="' + (closed ? 'false' : 'true') + '" aria-label="הצגה או הסתרה של פרטי הקבוצה">' + ic('chev') + '</button></div></header>';
			gh += '<div class="moeqs-ol-gbody"' + (closed ? ' hidden' : '') + '><div class="moeqs-ol-fg">';
			gh += inp('שם הקבוצה', gp + 'name', g.name, { ph: g.kind === 'feeder' ? 'לדוגמה: מחסן' : 'לדוגמה: מטבח' });
			gh += sel('סוג', gp + 'kind', g.kind, [['rcd', 'קבוצת פחת ומעגלים'], ['feeder', 'הזנה ללוח משנה (בלי פחת בלוח זה)']], { rr: 1 });
			gh += seg('מספר פאזות', gp + 'ph', gph, [['1', g.kind === 'feeder' ? 'חד-פאזי' : 'חד-פאזי (פחת 2 קטבים)'], ['3', g.kind === 'feeder' ? 'תלת-פאזי' : 'תלת-פאזי (פחת 4 קטבים)', !p3]]);
			if (p3 && gph === '1') gh += sel('חיבור לפאזה', gp + 'line', g.line, [['auto', 'אוטומטי (איזון)'], ['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3']]);
			if (g.kind === 'feeder') {
				gh += inp('זרם מפסק ההזנה', gp + 'famp', g.famp, { list: 'ol-dl-mcb', unit: 'A' });
				gh += sel('עקומה', gp + 'fcurve', g.fcurve, curveOpts());
				gh += inp('חתך הכבל ללוח המשנה', gp + 'fmm', g.fmm, { list: 'ol-dl-mm', unit: 'mm²' });
				gh += inp('שם לוח המשנה', gp + 'sub', g.sub, { ph: 'לדוגמה: לוח מחסן' });
				gh += '</div>';
			} else {
				gh += inp('זרם נקוב של הפחת', gp + 'amp', g.amp, { list: 'ol-dl-rcd', unit: 'A' });
				gh += sel('רגישות', gp + 'ma', g.ma, MA.map(function (x) { return [x, x + ' mA']; }));
				gh += sel('סוג הפחת', gp + 'rtype', g.rtype, [['AC', 'AC'], ['A', 'A'], ['F', 'F'], ['B', 'B']]);
				gh += chk('מא"ז לפני הפחת', gp + 'pre', g.pre);
				if (g.pre) { gh += inp('זרם המא"ז', gp + 'preAmp', g.preAmp, { list: 'ol-dl-mcb', unit: 'A' }) + sel('עקומה', gp + 'preCurve', g.preCurve, curveOpts()); }
				gh += '</div><div class="moeqs-ol-cs"><h4>מעגלים בקבוצה</h4>';
				var plOpts = p3 && gph === '3' ? [['auto', 'אוטומטי'], ['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3'], ['3P', 'תלת-פאזי']] : null;
				g.circuits.forEach(function (c, ci) {
					var its = eg.items.filter(function (it) { return it.ci === ci; }), cp = gp + 'circuits.' + ci + '.';
					var nos = its.length ? 'C' + its[0].no + (its.length > 1 ? '–C' + its[its.length - 1].no : '') : '';
					var shown = its.length ? its[0].line : '';
					gh += '<div class="moeqs-ol-c"><div class="moeqs-ol-chead"><span class="moeqs-ol-cno" dir="ltr" data-cno="' + gi + '-' + ci + '">' + nos + '</span>' +
						'<label class="moeqs-ol-sr" for="' + idOf(cp + 'desc') + '">תיאור המעגל</label><input id="' + idOf(cp + 'desc') + '" data-k="' + cp + 'desc" value="' + esc(c.desc) + '" maxlength="60" placeholder="תיאור, לדוגמה: בתי תקע – מטבח">' +
						'<div class="moeqs-ol-cact">' + ibtn('c-up', 'up', 'הזזת המעגל למעלה', ' data-g="' + gi + '" data-c="' + ci + '"') + ibtn('c-dn', 'dn', 'הזזת המעגל למטה', ' data-g="' + gi + '" data-c="' + ci + '"') + ibtn('c-dup', 'copy', 'שכפול המעגל', ' data-g="' + gi + '" data-c="' + ci + '"') + ibtn('c-del', 'trash', 'מחיקת המעגל', ' data-g="' + gi + '" data-c="' + ci + '"') + '</div></div>';
					gh += '<div class="moeqs-ol-cf">' +
						inp('מפסק', cp + 'amp', c.amp, { list: 'ol-dl-mcb', unit: 'A' }) +
						sel('עקומה', cp + 'curve', c.curve, curveOpts()) +
						inp('חתך', cp + 'mm', c.mm, { list: 'ol-dl-mm', unit: 'mm²' }) +
						(plOpts ? sel('פאזה', cp + 'pl', c.pl, plOpts) : '<div class="moeqs-ol-f"><span class="moeqs-ol-flab">פאזה</span><span class="moeqs-ol-fixed" dir="ltr" data-fixed="' + gi + '-' + ci + '">' + (p3 ? esc(shown || '—') : 'L') + '</span></div>') +
						inp('כמות', cp + 'qty', c.qty, { type: 'number', min: 1, max: 20 }) +
						'</div><small class="moeqs-ol-auto" data-auto="' + gi + '-' + ci + '">' + esc(autoNote(plOpts, c, its)) + '</small></div>';
				});
				gh += '<button type="button" class="moeqs-btn moeqs-ol-add" data-act="c-add" data-g="' + gi + '">' + ic('plus') + 'הוספת מעגל</button></div>';
			}
			gh += '</div></article>';
		});
		gh += '<div class="moeqs-ol-gadd"><button type="button" class="moeqs-btn moeqs-primary" data-act="g-add">' + ic('plus') + 'קבוצת פחת</button><button type="button" class="moeqs-btn" data-act="f-add">' + ic('plus') + 'הזנה ללוח משנה</button></div>';
		h += sec(3, 'קבוצות ומעגלים', gh, ui.open[3]);
		return h;
	}

	/* ---------------- אפליקציה ---------------- */
	function App(root) {
		var st, ui = { open: { 1: true, 2: true, 3: true }, closed: {} }, zoom = 1, raf = 0, last = null;
		var saved = ls(KEY);
		try { st = saved ? normalize(JSON.parse(saved)) : sample(); } catch (e) { st = sample(); }

		root.innerHTML =
			'<div class="moeqs-ol-grid">' +
			'<div class="moeqs-ol-editor" data-ol-editor></div>' +
			'<div class="moeqs-ol-view moeqs-panel" data-ol-view>' +
			'<div class="moeqs-ol-tb" role="toolbar" aria-label="פעולות על השרטוט">' +
			'<button type="button" class="moeqs-btn moeqs-primary" data-act="print" data-out>' + ic('print') + 'הדפסה או PDF</button>' +
			'<label class="moeqs-ol-paper"><span class="moeqs-ol-sr">גודל דף</span><select data-ol-paper aria-label="גודל דף להדפסה"><option value="A4">A4 לרוחב</option><option value="A3">A3 לרוחב</option></select></label>' +
			'<button type="button" class="moeqs-btn" data-act="svg" data-out>' + ic('down') + 'SVG</button>' +
			'<button type="button" class="moeqs-btn" data-act="png" data-out>' + ic('img') + 'תמונה</button>' +
			'<span class="moeqs-ol-tbsep" aria-hidden="true"></span>' +
			'<button type="button" class="moeqs-btn" data-act="json-out" data-out>' + ic('save') + 'שמירת פרויקט</button>' +
			'<button type="button" class="moeqs-btn" data-act="json-in">' + ic('open') + 'פתיחת פרויקט</button>' +
			'<input type="file" accept=".json,application/json" hidden data-ol-file>' +
			'</div>' +
			'<p class="moeqs-ol-need" data-ol-need hidden>כדי להדפיס או להוריד, סמנו קודם שקראתם את ההבהרה המשפטית שלמעלה.</p>' +
			'<div class="moeqs-ol-canvas-wrap"><div class="moeqs-ol-zoom">' + ibtn('zoom-out', 'minus', 'הקטנה') + '<span data-ol-zoom dir="ltr">100%</span>' + ibtn('zoom-in', 'plus', 'הגדלה') + ibtn('full', 'full', 'מסך מלא') + '</div>' +
			'<div class="moeqs-ol-canvas" data-ol-canvas tabindex="0" aria-label="תצוגה מקדימה של השרטוט"></div></div>' +
			'<div class="moeqs-ol-info"><section><h4>בדיקת עקביות</h4><ul data-ol-checks></ul></section><section data-ol-phases><h4>חלוקה בין הפאזות</h4><div data-ol-bal></div></section></div>' +
			'<p class="moeqs-ol-foot"><span data-ol-saved>הטיוטה נשמרת אוטומטית בדפדפן הזה בלבד.</span> <button type="button" class="moeqs-link" data-act="reset">' + 'התחלה מחדש</button> <button type="button" class="moeqs-link" data-act="sample">טעינת דוגמה</button></p>' +
			'</div></div>' +
			'<button type="button" class="moeqs-btn moeqs-primary moeqs-ol-jump" data-act="jump" hidden>הצגת השרטוט</button>' +
			'<p class="moeqs-ol-msg" role="status" aria-live="polite" data-ol-msg></p>';

		var ed = root.querySelector('[data-ol-editor]'), view = root.querySelector('[data-ol-view]'), canvas = root.querySelector('[data-ol-canvas]');
		var ackBox = document.querySelector('[data-ol-ack]'), need = root.querySelector('[data-ol-need]'), msgEl = root.querySelector('[data-ol-msg]');
		var file = root.querySelector('[data-ol-file]'), paper = root.querySelector('[data-ol-paper]');

		function acked() { return !ackBox || ackBox.checked; }
		function syncAck() { root.querySelectorAll('[data-out]').forEach(function (b) { b.setAttribute('aria-disabled', acked() ? 'false' : 'true'); }); need.hidden = acked(); }
		if (ackBox) { ackBox.checked = ls(ACK) === '1'; ackBox.addEventListener('change', function () { ls(ACK, ackBox.checked ? '1' : null); syncAck(); }); }
		syncAck();
		if (window.moeqsOnelineNoPrint) { /* 3.22.13: באפליקציה אין הדפסה ישירה – מדפיסים מהתמונה או מה-SVG ששותפו */
			var pb = root.querySelector('[data-act="print"]'), pl = root.querySelector('.moeqs-ol-paper');
			if (pb) pb.style.display = 'none'; if (pl) pl.style.display = 'none';
		}

		function say(t) { msgEl.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { msgEl.textContent = ''; }, 5000); }
		function save() { ls(KEY, JSON.stringify(st)); }

		function renderEditor() {
			var a = document.activeElement, fk = a && a.getAttribute && a.getAttribute('data-k'), fv = a && a.type === 'radio' ? a.value : null, fa = a && a.getAttribute && a.getAttribute('data-act'), fg = a && a.getAttribute && a.getAttribute('data-g');
			ed.querySelectorAll('details[data-sec]').forEach(function (d) { ui.open[d.getAttribute('data-sec')] = d.open; });
			ed.innerHTML = editorHtml(st, eff(st), ui);
			var t = null;
			if (fk) t = ed.querySelector('[data-k="' + fk + '"]' + (fv !== null ? '[value="' + fv + '"]' : ''));
			else if (fa && fg !== null) { var fc = a.getAttribute('data-c'); t = ed.querySelector('[data-act="' + fa + '"][data-g="' + fg + '"]' + (fc !== null ? '[data-c="' + fc + '"]' : '')) || ed.querySelector('[data-act="' + fa + '"][data-g="' + fg + '"]'); }
			if (t) t.focus({ preventScroll: true });
		}
		function renderView() {
			last = draw(st);
			canvas.innerHTML = svgString(last, false);
			canvas.firstChild.style.width = (zoom * 100) + '%';
			var ck = checks(st, last.E), ul = root.querySelector('[data-ol-checks]');
			ul.innerHTML = ck.length ? ck.map(function (c) { return '<li class="is-' + c[0] + '">' + esc(c[1]) + '</li>'; }).join('') : '<li class="is-ok">לא נמצאו סתירות בין גדלי המפסקים. הבדיקה בודקת עקביות בלבד ואינה מחליפה תכנון.</li>';
			var ph = root.querySelector('[data-ol-phases]'), bal = root.querySelector('[data-ol-bal]');
			ph.hidden = !last.E.p3;
			if (last.E.p3) {
				var ld = last.E.load, mx = Math.max(ld.L1, ld.L2, ld.L3, 1);
				bal.innerHTML = ['L1', 'L2', 'L3'].map(function (l) { return '<div class="moeqs-ol-bar"><span dir="ltr" style="color:' + LINE_COLORS[l] + '">' + l + '</span><i><b style="width:' + Math.round(ld[l] / mx * 100) + '%;background:' + LINE_COLORS[l] + '"></b></i><span dir="ltr">' + Math.round(ld[l]) + 'A</span></div>'; }).join('') + '<small>סכום זרמי המפסקים בכל פאזה. מדד לפיזור המעגלים בלבד, לא חישוב עומס.</small>';
			}
		}
		function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { renderView(); save(); }); }
		function all() { renderEditor(); renderView(); save(); }

		function setPath(path, val) {
			var ks = path.split('.'), o = st;
			for (var i = 0; i < ks.length - 1; i++) { o = o[/^\d+$/.test(ks[i]) ? +ks[i] : ks[i]]; if (o == null) return; }
			var last2 = ks[ks.length - 1];
			if (last2 === 'qty') val = Math.max(1, Math.min(20, parseInt(val, 10) || 1));
			o[last2] = val;
		}
		function onField(e) {
			var t = e.target, k = t.getAttribute && t.getAttribute('data-k');
			if (!k) return;
			if (t.type === 'radio' && !t.checked) return;
			if (t.type === 'number' && e.type === 'input' && t.value === '') return;
			setPath(k, t.type === 'checkbox' ? t.checked : t.value);
			if (t.getAttribute('data-rr')) { st = normalize(st); all(); }
			else { schedule(); refreshHeads(); }
		}
		/* עדכון הסיכום בכותרות הקבוצות בלי לבנות מחדש את הטופס (שומר על הפוקוס) */
		function refreshHeads() {
			var E = eff(st), p3 = st.main.ph === '3';
			st.groups.forEach(function (g, gi) {
				var art = ed.querySelector('[data-gid="' + g.id + '"]'); if (!art) return;
				var gph = p3 ? g.ph : '1', eg = E.groups[gi];
				art.querySelector('.moeqs-ol-gtitle strong').textContent = g.name || (g.kind === 'feeder' ? 'הזנה ללוח משנה' : 'קבוצת פחת');
				art.querySelector('.moeqs-ol-gtitle span').textContent = gSummary(g, gph, eg);
				if (g.kind !== 'rcd') return;
				var plOpts = p3 && gph === '3';
				g.circuits.forEach(function (c, ci) {
					var its = eg.items.filter(function (it) { return it.ci === ci; }), key = gi + '-' + ci;
					var a = art.querySelector('[data-cno="' + key + '"]'); if (a) a.textContent = its.length ? 'C' + its[0].no + (its.length > 1 ? '–C' + its[its.length - 1].no : '') : '';
					var f = art.querySelector('[data-fixed="' + key + '"]'); if (f) f.textContent = p3 ? (its.length && its[0].line) || '—' : 'L';
					var n = art.querySelector('[data-auto="' + key + '"]'); if (n) n.textContent = autoNote(plOpts, c, its);
				});
			});
		}
		ed.addEventListener('input', onField);
		ed.addEventListener('change', onField);

		function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return false; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; return true; }
		function clone(o) { var c = JSON.parse(JSON.stringify(o)); c.id = uid(); if (c.circuits) c.circuits.forEach(function (x) { x.id = uid(); }); return c; }

		root.addEventListener('click', function (e) {
			var b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
			var act = b.getAttribute('data-act'), gi = +b.getAttribute('data-g'), ci = +b.getAttribute('data-c'), G = st.groups;
			if (b.hasAttribute('data-out') && !acked()) { need.hidden = false; if (ackBox) { ackBox.focus(); ackBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); } return; }
			switch (act) {
				case 'g-add': G.push(group({ kind: 'rcd', ph: st.main.ph === '3' ? '3' : '1', circuits: [{}] })); all(); focusLast(); say('נוספה קבוצת פחת.'); break;
				case 'f-add': G.push(group({ kind: 'feeder', ph: '1' })); all(); say('נוספה הזנה ללוח משנה.'); break;
				case 'g-del': if (window.confirm('למחוק את קבוצה ' + (gi + 1) + (G[gi].name ? ' (' + G[gi].name + ')' : '') + ' על כל המעגלים שבה?')) { G.splice(gi, 1); all(); say('הקבוצה נמחקה.'); } break;
				case 'g-dup': G.splice(gi + 1, 0, clone(G[gi])); all(); say('הקבוצה שוכפלה.'); break;
				case 'g-up': if (move(G, gi, -1)) all(); break;
				case 'g-dn': if (move(G, gi, 1)) all(); break;
				case 'g-tog': ui.closed[G[gi].id] = !ui.closed[G[gi].id]; renderEditor(); break;
				case 'c-add': G[gi].circuits.push(circuit({})); all(); var cs = ed.querySelectorAll('[data-gid="' + G[gi].id + '"] .moeqs-ol-chead input'); if (cs.length) cs[cs.length - 1].focus(); break;
				case 'c-del': G[gi].circuits.splice(ci, 1); all(); break;
				case 'c-dup': var cc = JSON.parse(JSON.stringify(G[gi].circuits[ci])); cc.id = uid(); G[gi].circuits.splice(ci + 1, 0, cc); all(); break;
				case 'c-up': if (move(G[gi].circuits, ci, -1)) all(); break;
				case 'c-dn': if (move(G[gi].circuits, ci, 1)) all(); break;
				case 'zoom-in': zoom = Math.min(3, zoom + 0.25); renderView(); root.querySelector('[data-ol-zoom]').textContent = Math.round(zoom * 100) + '%'; break;
				case 'zoom-out': zoom = Math.max(1, zoom - 0.25); renderView(); root.querySelector('[data-ol-zoom]').textContent = Math.round(zoom * 100) + '%'; break;
				case 'full': toggleFull(); break;
				case 'jump': view.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
				case 'print': doPrint(); break;
				case 'svg': download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svgString(draw(st), true)], { type: 'image/svg+xml;charset=utf-8' }), fname('svg')); say('קובץ ה-SVG הורד.'); break;
				case 'png': doPng(); break;
				case 'json-out': download(new Blob([JSON.stringify({ app: APP, v: 1, saved: new Date().toISOString(), data: st }, null, 2)], { type: 'application/json' }), fname('json')); say('קובץ הפרויקט נשמר. אפשר לפתוח אותו כאן בכל עת.'); break;
				case 'json-in': file.value = ''; file.click(); break;
				case 'reset': if (window.confirm('להתחיל שרטוט חדש? הטיוטה הנוכחית תימחק מהדפדפן. כדאי לשמור קודם קובץ פרויקט.')) { st = blank(); ui.closed = {}; all(); say('התחלתם שרטוט חדש.'); } break;
				case 'sample': if (window.confirm('לטעון את לוח הדוגמה? הטיוטה הנוכחית תוחלף.')) { st = sample(); ui.closed = {}; all(); say('לוח הדוגמה נטען.'); } break;
			}
		});
		function focusLast() { var arts = ed.querySelectorAll('[data-gid]'); if (arts.length) { var i = arts[arts.length - 1].querySelector('input'); if (i) { i.focus(); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } }

		file.addEventListener('change', function () {
			var f = file.files && file.files[0]; if (!f) return;
			if (f.size > 500000) { say('הקובץ גדול מדי לקובץ פרויקט.'); return; }
			var r = new FileReader();
			r.onload = function () {
				try {
					var j = JSON.parse(String(r.result));
					if (!j || j.app !== APP || !j.data) throw new Error('bad');
					st = normalize(j.data); ui.closed = {}; all(); say('הפרויקט נפתח: ' + (st.meta.panel || 'ללא שם') + '.');
				} catch (x) { say('לא ניתן לפתוח את הקובץ. בחרו קובץ פרויקט שנשמר במחולל הזה.'); }
			};
			r.readAsText(f);
		});

		function fname(ext) { var n = (st.meta.panel || 'שרטוט חד קווי').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-'); return (n || 'oneline') + '.' + ext; }
		function download(blob, name) {
			if (typeof window.moeqsOnelineSave === 'function') { window.moeqsOnelineSave(blob, name); return; } /* 3.22.13: באפליקציה – שיתוף/שמירה דרך מערכת ההפעלה */
			var u = URL.createObjectURL(blob), a = document.createElement('a');
			a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
			setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
		}
		function doPng() {
			var d = draw(st), sc = 2, img = new Image();
			var u = URL.createObjectURL(new Blob([svgString(d, true)], { type: 'image/svg+xml;charset=utf-8' }));
			img.onload = function () {
				var c = document.createElement('canvas'); c.width = d.W * sc; c.height = d.H * sc;
				var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
				URL.revokeObjectURL(u);
				c.toBlob(function (b) { if (b) { download(b, fname('png')); say('התמונה הורדה.'); } else say('הדפדפן לא הצליח ליצור תמונה. נסו את הורדת ה-SVG.'); }, 'image/png');
			};
			img.onerror = function () { URL.revokeObjectURL(u); say('הדפדפן לא הצליח ליצור תמונה. נסו את הורדת ה-SVG.'); };
			img.src = u;
		}
		/* הדפסה בחלון נפרד שמכיל רק את השרטוט */
		function doPrint() {
			var d = draw(st), A3 = paper.value === 'A3', w = window.open('', '_blank');
			if (!w) { say('הדפדפן חסם את חלון ההדפסה. אפשרו חלונות קופצים לאתר ונסו שוב, או הורידו SVG או תמונה.'); return; }
			var f = CFG.fonts || '';
			var font = f ? '@font-face{font-family:Assistant;font-weight:400;src:url(' + f + 'assistant-hebrew-400-normal.woff2) format("woff2");unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:Assistant;font-weight:400;src:url(' + f + 'assistant-latin-400-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2212}@font-face{font-family:Assistant;font-weight:700;src:url(' + f + 'assistant-hebrew-600-normal.woff2) format("woff2");unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:Assistant;font-weight:700;src:url(' + f + 'assistant-latin-600-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2212}' : '';
			var title = esc((st.meta.panel || 'שרטוט חד קווי') + ' – שרטוט חד קווי');
			w.document.open();
			w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + title + '</title><style>' + font + '@page{size:' + (A3 ? 'A3' : 'A4') + ' landscape;margin:7mm}html,body{margin:0;background:#fff}svg{display:block;width:100%;height:auto;max-height:' + (A3 ? '282mm' : '195mm') + ';margin:0 auto}@media screen{body{padding:16px;background:#e5e7eb}svg{background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.2);max-height:none}}</style></head><body>' + svgString(d, false) + '</body></html>');
			w.document.close();
			var go = function () { try { w.focus(); w.print(); } catch (x) { /* ignore */ } };
			try { if (w.document.fonts && w.document.fonts.ready) w.document.fonts.ready.then(function () { setTimeout(go, 150); }); else setTimeout(go, 500); } catch (x) { setTimeout(go, 500); }
		}
		function toggleFull(force) {
			var on = force === undefined ? !view.classList.contains('is-full') : force;
			view.classList.toggle('is-full', on);
			document.documentElement.classList.toggle('moeqs-ol-noscroll', on);
			var fb = root.querySelector('[data-act="full"]'); if (fb) { fb.setAttribute('aria-label', on ? 'יציאה ממסך מלא' : 'מסך מלא'); fb.title = fb.getAttribute('aria-label'); }
			if (on) canvas.focus();
		}
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && view.classList.contains('is-full')) toggleFull(false); });
		/* מובייל: כפתור צף לשרטוט כשהעורך מוצג והשרטוט מחוץ למסך */
		var jump = root.querySelector('[data-act="jump"]');
		if ('IntersectionObserver' in window) {
			var vis = { ed: false, view: false };
			var io = new IntersectionObserver(function (ents) {
				ents.forEach(function (en) { vis[en.target === view ? 'view' : 'ed'] = en.isIntersecting; });
				jump.hidden = !(vis.ed && !vis.view && window.matchMedia('(max-width: 1020px)').matches);
			});
			io.observe(view); io.observe(ed);
		}

		all();
	}

	function boot() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-moeqs-oneline]'), function (r) {
			if (r.getAttribute('data-ready')) return;
			r.setAttribute('data-ready', '1');
			App(r);
		});
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
