/* מחשבונים */
(function () {
	'use strict';
	var CFG = window.moeqsCalcCfg || { kwh: 63.52 };
	var SQ3 = Math.sqrt(3);
	var DEG = Math.PI / 180;

	function el(tag, attrs, kids) {
		var n = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			var v = attrs[k];
			if (v === null || v === undefined || v === false) return;
			if (k === 'text') n.textContent = v;
			else if (k === 'html') n.innerHTML = v;
			else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
			else n.setAttribute(k, v === true ? '' : v);
		});
		(kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
		return n;
	}
	var nfs = {};
	function fmt(x, d) {
		d = d === undefined ? 2 : d;
		if (!isFinite(x)) return '–';
		nfs[d] = nfs[d] || new Intl.NumberFormat('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: d });
		return nfs[d].format(x);
	}
	function all() { for (var i = 0; i < arguments.length; i++) { if (!isFinite(arguments[i])) return false; } return true; }

	/* עזרי MathML */
	function mi(s) { return '<mi>' + s + '</mi>'; }
	function mo(s) { return '<mo>' + s + '</mo>'; }
	function mn(s) { return '<mn>' + s + '</mn>'; }
	function row() { return '<mrow>' + Array.prototype.join.call(arguments, '') + '</mrow>'; }
	function frac(a, b) { return '<mfrac>' + row(a) + row(b) + '</mfrac>'; }
	function sub(a, b) { return '<msub>' + a + '<mrow>' + b + '</mrow></msub>'; }
	function sup(a, b) { return '<msup>' + a + '<mrow>' + b + '</mrow></msup>'; }
	function sqrt(a) { return '<msqrt>' + a + '</msqrt>'; }
	function M() { return '<math display="block" dir="ltr">' + Array.prototype.join.call(arguments, '') + '</math>'; }
	var EQ = mo('='), DOT = mo('·');

	var C = {};

	C.ohm = {
		title: 'מחשבון חוק אום והספק',
		intro: 'בחרו אילו שני גדלים נתונים, והמחשבון יחשב את המתח, הזרם, ההתנגדות וההספק.',
		formula: M(mi('V'), EQ, mi('I'), DOT, mi('R')) + M(mi('P'), EQ, mi('V'), DOT, mi('I')),
		fields: [
			{ id: 'mode', label: 'מה נתון?', type: 'select', value: 'VI', options: [['VI', 'מתח וזרם'], ['VR', 'מתח והתנגדות'], ['IR', 'זרם והתנגדות'], ['PV', 'הספק ומתח'], ['PI', 'הספק וזרם'], ['PR', 'הספק והתנגדות']] },
			{ id: 'a', label: function (v) { return { V: 'מתח', I: 'זרם', P: 'הספק' }[v.mode.charAt(0)]; }, unit: function (v) { return { V: 'V', I: 'A', P: 'W' }[v.mode.charAt(0)]; }, type: 'number', value: 230 },
			{ id: 'b', label: function (v) { return { I: 'זרם', R: 'התנגדות', V: 'מתח' }[v.mode.charAt(1)]; }, unit: function (v) { return { I: 'A', R: 'Ω', V: 'V' }[v.mode.charAt(1)]; }, type: 'number', value: 10 }
		],
		compute: function (v) {
			var a = v.a, b = v.b, V, I, R, P;
			if (!all(a, b)) return null;
			switch (v.mode) {
				case 'VI': V = a; I = b; R = V / I; P = V * I; break;
				case 'VR': V = a; R = b; I = V / R; P = V * V / R; break;
				case 'IR': I = a; R = b; V = I * R; P = I * I * R; break;
				case 'PV': P = a; V = b; I = P / V; R = V * V / P; break;
				case 'PI': P = a; I = b; V = P / I; R = P / (I * I); break;
				default: P = a; R = b; I = Math.sqrt(P / R); V = Math.sqrt(P * R);
			}
			return [{ l: 'מתח', v: V, u: 'V', big: 1 }, { l: 'זרם', v: I, u: 'A', big: 1 }, { l: 'התנגדות', v: R, u: 'Ω' }, { l: 'הספק', v: P, u: 'W' }];
		}
	};

	C.vdrop = {
		title: 'חישוב מפל מתח בכבל',
		intro: 'חישוב מפל המתח בהדקי הצרכן לפי אורך הכבל, שטח החתך והזרם.',
		formula: M(mi('ΔU'), EQ, frac(mi('K') + DOT + mi('I') + DOT + mi('L') + DOT + mi('ρ'), mi('A'))) + '<p class="moeqs-note-sm">K = 2 במערכת חד פאזית, ו-K = √3 במערכת תלת פאזית.</p>',
		fields: [
			{ id: 'ph', label: 'סוג המערכת', type: 'select', value: '3', options: [['1', 'חד פאזי (K = 2)'], ['3', 'תלת פאזי (K = √3)']] },
			{ id: 'U', label: 'מתח נקוב', unit: 'V', type: 'number', value: 400 },
			{ id: 'I', label: 'זרם', unit: 'A', type: 'number', value: 63 },
			{ id: 'L', label: 'אורך הכבל (כיוון אחד)', unit: 'מטר', type: 'number', value: 50 },
			{ id: 'A', label: 'שטח חתך', unit: 'ממ"ר', type: 'select', value: '16', options: ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150', '185', '240'].map(function (x) { return [x, x]; }) },
			{ id: 'mat', label: 'חומר המוליך', type: 'select', value: 'cu', options: [['cu', 'נחושת'], ['al', 'אלומיניום']] },
			{ id: 'rho', label: 'התנגדות סגולית ρ', unit: 'Ω·ממ"ר/מ\'', type: 'number', value: 0.0175, step: '0.0001', hint: 'בשאלות במבחן משתמשים בערך הנתון בשאלה.' },
			{ id: 'lim', label: 'גבול מפל מתח לבדיקה', unit: '%', type: 'number', value: 3 }
		],
		onChange: function (id, v, set) {
			if (id === 'mat') set('rho', v.mat === 'cu' ? 0.0175 : 0.028);
			if (id === 'ph') set('U', v.ph === '3' ? 400 : 230);
		},
		compute: function (v) {
			if (!all(v.U, v.I, v.L, v.A, v.rho, v.lim) || v.A <= 0) return null;
			var K = v.ph === '3' ? SQ3 : 2, dU = K * v.I * v.L * v.rho / v.A, pct = dU / v.U * 100;
			return [{ l: 'מפל מתח', v: dU, u: 'V', big: 1 }, { l: 'מפל מתח באחוזים', v: pct, u: '%', big: 1 },
				{ t: pct <= v.lim ? 'מפל המתח (' + fmt(pct) + '%) אינו חורג מהגבול שהוזן (' + fmt(v.lim) + '%).' : 'מפל המתח (' + fmt(pct) + '%) חורג מהגבול שהוזן (' + fmt(v.lim) + '%).', cls: pct <= v.lim ? 'ok' : 'warn' }];
		}
	};

	C.trshort = {
		title: 'זרם קצר בהדקי שנאי ושטח חתך הארקת השיטה',
		intro: 'חישוב הזרם הנקוב וזרם הקצר בהדקי השנאי, ושטח החתך המינימלי של כבל ההארקה לפי זמן תגובת המבטח.',
		formula: M(sub(mi('I'), mi('sc')), EQ, frac(mi('S') + DOT + mn('100'), sqrt(mn('3')) + DOT + mi('V') + DOT + sub(mi('U'), mi('k')) + mo('%'))) + M(mi('A'), EQ, frac(sub(mi('I'), mi('sc')) + DOT + sqrt(mi('t')), mi('k'))),
		fields: [
			{ id: 'S', label: 'הספק השנאי', unit: 'kVA', type: 'number', value: 630 },
			{ id: 'V', label: 'מתח השנאי', unit: 'V', type: 'number', value: 400 },
			{ id: 'Uk', label: 'Uk', unit: '%', type: 'number', value: 6 },
			{ id: 't', label: 'זמן תגובת המבטח', unit: 'שניות', type: 'number', value: 1, step: 'any', hint: 'הזמן המקסימלי עד שהמפסק יקפוץ (בדרך כלל בין 0.1 ל-5 שניות).' },
			{ id: 'k', label: 'מקדם k', type: 'radio', value: '143', options: [['76', 'אלומיניום 70°C (k=76)'], ['94', 'אלומיניום 90°C (k=94)'], ['115', 'נחושת 70°C (k=115)'], ['143', 'נחושת 90°C (k=143)']] }
		],
		compute: function (v) {
			if (!all(v.S, v.V, v.Uk, v.t) || v.V <= 0 || v.Uk <= 0 || v.t < 0) return null;
			var In = v.S * 1000 / (SQ3 * v.V), Isc = In * 100 / v.Uk, A = Isc * Math.sqrt(v.t) / parseFloat(v.k);
			return [{ l: 'זרם נקוב (נומינלי) של השנאי', v: In, u: 'A', d: 1, big: 1 }, { l: 'זרם קצר בהדקי השנאי', v: Isc / 1000, u: 'kA', d: 2, big: 1 }, { l: 'שטח חתך הארקת השיטה לפחות', v: A, u: 'ממ"ר', d: 1, big: 1 }];
		}
	};

	C.cost = {
		title: 'חישוב עלות צריכת חשמל',
		intro: 'כמה עולה להפעיל מכשיר חשמלי? העלות לשעה, ליממה ולחודש.',
		formula: M(mi('עלות'), EQ, mi('הספק') + '<mo>[kW]</mo>' + DOT + mi('שעות') + DOT + mi('תעריף')),
		fields: [
			{ id: 'tar', label: 'תעריף החשמל (כולל מע"מ)', unit: 'אגורות לקוט"ש', type: 'number', value: CFG.kwh, step: 'any', hint: 'ברירת המחדל: תעריף ביתי אחיד' + (CFG.kwhDate ? ' (' + CFG.kwhDate + ')' : '') + '. אפשר לשנות.' },
			{ id: 'unit', label: 'יחידות', type: 'radio', value: 'W', options: [['W', 'וואט לשעה [W]'], ['kW', 'קילו וואט לשעה [kW]'], ['A', 'אמפר [A]']] },
			{ id: 'val', label: 'כמה צורך המכשיר?', type: 'number', value: 100 },
			{ id: 'U', label: 'מתח', unit: 'V', type: 'number', value: 230, show: function (v) { return v.unit === 'A'; } },
			{ id: 'qty', label: 'מספר מכשירים', type: 'number', value: 1, min: 1 },
			{ id: 'disc', label: 'הנחה מספק החשמל', unit: '%', type: 'number', value: 0 }
		],
		compute: function (v) {
			if (!all(v.tar, v.val, v.qty, v.disc)) return null;
			var kW = v.unit === 'W' ? v.val / 1000 : (v.unit === 'kW' ? v.val : v.val * v.U / 1000);
			if (!isFinite(kW)) return null;
			var h = kW * v.qty * v.tar / 100 * (1 - v.disc / 100);
			return [{ l: 'עלות הפעלה לשעה', v: h, u: '₪', d: 2, big: 1 }, { l: 'עלות הפעלה ל-24 שעות', v: h * 24, u: '₪', d: 2, big: 1 }, { l: 'עלות הפעלה ל-30 ימים', v: h * 24 * 30, u: '₪', d: 2, big: 1 }];
		}
	};

	C.breaker = {
		title: 'כיול מפסק אלקטרוני LS/I',
		intro: 'במפסק אלקטרוני מכוונים את ההגנה התרמית (L) וההגנה המגנטית (S) באמצעות מפסקים זעירים. כל מפסק זעיר שמוגדר "למעלה" נכלל בחישוב.',
		formula: M(sub(mi('I'), mn('1')), EQ, sub(mi('I'), mi('n')), DOT, mo('(') + mn('0.4') + mo('+') + mo('Σ') + mo(')')) + M(sub(mi('I'), mn('2')), EQ, sub(mi('I'), mi('n')), DOT, mo('Σ')),
		fields: [
			{ id: 'In', label: 'זרם נקוב של המפסק (In)', unit: 'A', type: 'number', value: 400 },
			{ id: 'L', label: 'הגנה תרמית L: המפסקים הזעירים שלמעלה (נוסף על 0.4)', type: 'checks', value: [0.32, 0.04], options: [[0.04, '0.04'], [0.08, '0.08'], [0.16, '0.16'], [0.32, '0.32']] },
			{ id: 'S', label: 'הגנה מגנטית S: המפסקים הזעירים שלמעלה', type: 'checks', value: [1, 5.5], options: [[1, '1'], [1.5, '1.5'], [2, '2'], [5.5, '5.5']] },
			{ id: 'N', label: 'הגנת מוליך האפס N', type: 'select', value: '100', options: [['100', '100% (חתך האפס זהה לחתך הפאזה)'], ['50', '50% (חתך האפס חצי מחתך הפאזה)']] },
			{ id: 'Isc', label: 'זרם הקצר הצפוי', unit: 'A', type: 'number', value: 2900 }
		],
		compute: function (v) {
			if (!all(v.In, v.Isc) || v.In <= 0) return null;
			var sl = v.L.reduce(function (a, b) { return a + b; }, 0), ss = v.S.reduce(function (a, b) { return a + b; }, 0);
			var i1 = v.In * (0.4 + sl), i2 = v.In * ss, out = [{ l: 'ערך המנגנון התרמי (L)', v: i1, u: 'A', d: 1, big: 1 }, { l: 'ערך המנגנון המגנטי (S)', v: i2, u: 'A', d: 1, big: 1 }];
			if (i2 > 0) {
				out.push({ l: 'יחס זרם הקצר הצפוי לערך המגנטי', v: v.Isc / i2, u: '×', d: 2 });
				out.push(v.Isc >= i2 ? { t: 'זרם הקצר הצפוי גבוה מערך המנגנון המגנטי, לכן ההגנה המגנטית תנתק את המתקן.', cls: 'ok' } : { t: 'זרם הקצר הצפוי נמוך מערך המנגנון המגנטי, ולכן ההגנה המגנטית לא תנתק את המתקן. יש להקטין את הכיול.', cls: 'warn' });
			} else { out.push({ t: 'לא נבחר אף מפסק זעיר בהגנה המגנטית S.', cls: 'warn' }); }
			out.push({ t: 'הגנת מוליך האפס מכוילת ל-' + v.N + '%.', cls: '' });
			return out;
		}
	};

	C.bund = {
		title: 'חישוב גודל מאצרה',
		intro: 'מאצרה אוספת שמן שדלף מציוד כמו שנאי. החישוב מראה את הנפח ואת העומק הדרושים לפי כמות השמן ומידות המאצרה. את הדרישות המחייבות יש לבדוק בחוק החשמל ובתקנים.',
		formula: M(mi('נפח'), EQ, mi('אורך'), DOT, mi('רוחב'), DOT, mi('עומק')),
		fields: [
			{ id: 'oil', label: 'כמות השמן בציוד', unit: 'ליטר', type: 'number', value: 600 },
			{ id: 'mar', label: 'תוספת ביטחון לנפח', unit: '%', type: 'number', value: 10 },
			{ id: 'len', label: 'אורך המאצרה', unit: 'מטר', type: 'number', value: 2.5, step: 'any' },
			{ id: 'wid', label: 'רוחב המאצרה', unit: 'מטר', type: 'number', value: 2, step: 'any' },
			{ id: 'avail', label: 'עומק קיים (לא חובה)', unit: 'ס"מ', type: 'number', value: '', step: 'any' }
		],
		compute: function (v) {
			if (!all(v.oil, v.mar, v.len, v.wid) || v.len <= 0 || v.wid <= 0) return null;
			var vol = v.oil * (1 + v.mar / 100), depth = vol / 1000 / (v.len * v.wid) * 100;
			var out = [{ l: 'נפח נדרש', v: vol, u: 'ליטר', d: 0, big: 1 }, { l: 'עומק נדרש', v: depth, u: 'ס"מ', d: 1, big: 1 }];
			if (isFinite(v.avail) && v.avail > 0) { out.push(v.avail >= depth ? { t: 'העומק הקיים מספיק לנפח הנדרש.', cls: 'ok' } : { t: 'העומק הקיים אינו מספיק. חסרים ' + fmt(depth - v.avail, 1) + ' ס"מ.', cls: 'warn' }); }
			return out;
		}
	};

	C.ib = {
		title: 'זרם עבודה מהספק (Ib)',
		intro: 'חישוב זרם העבודה מהספק מדומה וממתח, במערכת חד פאזית או תלת פאזית.',
		formula: M(sub(mi('I'), mi('b')), EQ, frac(mi('S'), mi('V'))) + M(sub(mi('I'), mi('b')), EQ, frac(mi('S'), sqrt(mn('3')) + DOT + mi('V') + DOT + mi('cosφ'))),
		fields: [
			{ id: 'ph', label: 'סוג המערכת', type: 'select', value: '3', options: [['1', 'חד פאזי'], ['3', 'תלת פאזי']] },
			{ id: 'S', label: 'הספק מדומה', unit: 'kVA', type: 'number', value: 50 },
			{ id: 'V', label: 'מתח', unit: 'V', type: 'number', value: 400 },
			{ id: 'cos', label: 'מקדם הספק cosφ (כשלא נתון: 1)', type: 'number', value: 1, step: 'any', show: function (v) { return v.ph === '3'; } }
		],
		onChange: function (id, v, set) { if (id === 'ph') set('V', v.ph === '3' ? 400 : 230); },
		compute: function (v) {
			if (!all(v.S, v.V) || v.V <= 0) return null;
			var cs = v.ph === '3' ? v.cos : 1; if (!isFinite(cs) || cs <= 0) return null;
			var I = v.ph === '3' ? v.S * 1000 / (SQ3 * v.V * cs) : v.S * 1000 / v.V;
			return [{ l: 'זרם עבודה', v: I, u: 'A', d: 2, big: 1 }];
		}
	};

	C.derate = {
		title: 'זרם כבל מתוקן במקדמים (I′z)',
		intro: 'מכפילים את זרם הכבל מהטבלה במקדמי התיקון (טמפרטורה, קיבוץ, אופן התקנה ועוד).',
		formula: M(sub('<mrow><mi>I</mi><mo>′</mo></mrow>', mi('z')), EQ, mi('I'), DOT, sub(mi('K'), mn('1')), DOT, sub(mi('K'), mn('2')), DOT, sub(mi('K'), mn('3')), DOT, mo('…')),
		fields: [
			{ id: 'I', label: 'זרם הכבל מהטבלה', unit: 'A', type: 'number', value: 100 },
			{ id: 'k1', label: 'מקדם K1', type: 'number', value: 0.87, step: 'any' },
			{ id: 'k2', label: 'מקדם K2', type: 'number', value: 0.8, step: 'any' },
			{ id: 'k3', label: 'מקדם K3', type: 'number', value: 1, step: 'any' },
			{ id: 'ib', label: 'זרם העבודה Ib (לבדיקה, לא חובה)', unit: 'A', type: 'number', value: '', step: 'any' }
		],
		compute: function (v) {
			if (!all(v.I, v.k1, v.k2, v.k3)) return null;
			var iz = v.I * v.k1 * v.k2 * v.k3, out = [{ l: 'זרם הכבל המתוקן', v: iz, u: 'A', d: 2, big: 1 }];
			if (isFinite(v.ib) && v.ib > 0) out.push(iz >= v.ib ? { t: 'הזרם המתוקן גדול מזרם העבודה, והכבל מתאים.', cls: 'ok' } : { t: 'הזרם המתוקן קטן מזרם העבודה, ויש לבחור כבל גדול יותר.', cls: 'warn' });
			return out;
		}
	};

	C.paralleltr = {
		title: 'הספק מרבי של שנאים במקביל',
		intro: 'כששנאים עובדים במקביל, ההספק שאפשר למשוך מהם מוגבל על ידי השנאי עם ה-Uk הקטן ביותר.',
		formula: M(sub(mi('S'), mi('max')), EQ, sub(mi('U'), mi('k-min')), DOT, mo('(') + frac(sub(mi('S'), mn('1')), sub(mi('U'), mi('k1'))) + mo('+') + frac(sub(mi('S'), mn('2')), sub(mi('U'), mi('k2'))) + mo('+') + frac(sub(mi('S'), mn('3')), sub(mi('U'), mi('k3'))) + mo(')')),
		fields: [
			{ id: 's1', label: 'הספק שנאי 1', unit: 'kVA', type: 'number', value: 1000 }, { id: 'u1', label: 'Uk שנאי 1', unit: '%', type: 'number', value: 6 },
			{ id: 's2', label: 'הספק שנאי 2', unit: 'kVA', type: 'number', value: 630 }, { id: 'u2', label: 'Uk שנאי 2', unit: '%', type: 'number', value: 4 },
			{ id: 's3', label: 'הספק שנאי 3 (לא חובה)', unit: 'kVA', type: 'number', value: '' }, { id: 'u3', label: 'Uk שנאי 3', unit: '%', type: 'number', value: '' }
		],
		compute: function (v) {
			var tr = [[v.s1, v.u1], [v.s2, v.u2], [v.s3, v.u3]].filter(function (x) { return isFinite(x[0]) && isFinite(x[1]) && x[0] > 0 && x[1] > 0; });
			if (tr.length < 2) return null;
			var ukmin = Math.min.apply(null, tr.map(function (x) { return x[1]; })), sum = tr.reduce(function (a, x) { return a + x[0] / x[1]; }, 0), smax = ukmin * sum, inst = tr.reduce(function (a, x) { return a + x[0]; }, 0);
			return [{ l: 'ההספק המרבי של השנאים במקביל', v: smax, u: 'kVA', d: 1, big: 1 }, { l: 'סך ההספק המותקן', v: inst, u: 'kVA', d: 0 }, { l: 'ניצול ההספק המותקן', v: smax / inst * 100, u: '%', d: 1 }];
		}
	};

	C.impedance = {
		title: 'אימפדנס קצר וזרם קצר בפסי הצבירה',
		intro: 'חישוב אימפדנס הרשת, אימפדנס השנאי ואימפדנס המערכת, והזרם הקצר המתמיד בפסי הצבירה.',
		formula: M(sub(mi('Z'), mi('r')), EQ, frac(sup(mi('U'), mn('2')), sub(mi('S'), mi('sc')))) + M(sub(mi('Z'), mi('Tr')), EQ, frac(sup(mi('U'), mn('2')), mi('S')), DOT, sub(mi('U'), mi('k')) + mo('%')) + M(sub(mi('Z'), mi('Sc')), EQ, sub(mi('Z'), mi('r')), mo('+'), sub(mi('Z'), mi('Tr'))) + M(sub(mi('I'), mi('sc')), EQ, frac(mi('V'), sqrt(mn('3')) + DOT + sub(mi('Z'), mi('Sc')))),
		fields: [
			{ id: 'U', label: 'מתח', unit: 'V', type: 'number', value: 400 },
			{ id: 'Ssc', label: 'הספק קצר של הרשת', unit: 'MVA', type: 'number', value: 250 },
			{ id: 'S', label: 'הספק השנאי', unit: 'kVA', type: 'number', value: 1000 },
			{ id: 'Uk', label: 'Uk', unit: '%', type: 'number', value: 6 }
		],
		compute: function (v) {
			if (!all(v.U, v.Ssc, v.S, v.Uk) || v.Ssc <= 0 || v.S <= 0) return null;
			var zr = v.U * v.U / (v.Ssc * 1e6), ztr = v.U * v.U / (v.S * 1000) * v.Uk / 100, zs = zr + ztr, isc = v.U / (SQ3 * zs);
			return [{ l: 'אימפדנס קצר של הרשת', v: zr * 1000, u: 'mΩ', d: 3 }, { l: 'אימפדנס קצר של השנאי', v: ztr * 1000, u: 'mΩ', d: 3 }, { l: 'אימפדנס קצר של המערכת', v: zs * 1000, u: 'mΩ', d: 3, big: 1 }, { l: 'זרם הקצר המתמיד בפסי הצבירה', v: isc / 1000, u: 'kA', d: 2, big: 1 }];
		}
	};

	C.thd = {
		title: 'עיוות הרמוני כולל (THD)',
		intro: 'העיוות ההרמוני הכולל הוא שורש סכום ריבועי ההרמוניות 3 ו-5, חלקי ההרמוניה הראשונה (הגדולה).',
		formula: M(mi('THD'), EQ, frac(sqrt(sup(sub(mi('H'), mn('3')), mn('2')) + mo('+') + sup(sub(mi('H'), mn('5')), mn('2'))), sub(mi('H'), mn('1')))),
		fields: [{ id: 'h1', label: 'הרמוניה 1', type: 'number', value: 100, step: 'any' }, { id: 'h3', label: 'הרמוניה 3', type: 'number', value: 20, step: 'any' }, { id: 'h5', label: 'הרמוניה 5', type: 'number', value: 10, step: 'any' }],
		compute: function (v) {
			if (!all(v.h1, v.h3, v.h5) || v.h1 <= 0) return null;
			var t = Math.sqrt(v.h3 * v.h3 + v.h5 * v.h5) / v.h1;
			return [{ l: 'THD', v: t * 100, u: '%', d: 2, big: 1 }, { l: 'THD כיחס', v: t, d: 4 }];
		}
	};

	C.motor = {
		title: 'מהירות סיבוב מנוע',
		intro: 'המהירות הסינכרונית של מנוע לפי תדר הרשת ומספר זוגות הקטבים.',
		formula: M(mi('n'), EQ, frac(mi('f') + DOT + mn('60'), mi('P'))),
		fields: [{ id: 'f', label: 'תדר', unit: 'Hz', type: 'number', value: 50 }, { id: 'p', label: 'מספר זוגות קטבים (P)', type: 'select', value: '2', options: ['1', '2', '3', '4', '5', '6'].map(function (x) { return [x, x + ' (' + (x * 2) + ' קטבים)']; }) }],
		compute: function (v) {
			if (!all(v.f)) return null;
			return [{ l: 'מהירות סיבוב סינכרונית', v: v.f * 60 / parseFloat(v.p), u: 'סל"ד', d: 0, big: 1 }];
		}
	};

	C.pfc = {
		title: 'שיפור מקדם הספק לסוללת קבלים',
		intro: 'חישוב ההספק הריאקטיבי של סוללת הקבלים הדרושה כדי לשפר את מקדם ההספק מערך נוכחי לערך רצוי.',
		formula: M(sub(mi('Q'), mi('C')), EQ, mi('P'), DOT, mo('(') + mi('tan') + sub(mi('φ'), mn('1')) + mo('−') + mi('tan') + sub(mi('φ'), mn('2')) + mo(')')) + M(mi('φ'), EQ, sup(mi('cos'), mn('-1')), mo('(') + mi('Pf') + mo(')')),
		fields: [
			{ id: 'P', label: 'הספק פעיל', unit: 'kW', type: 'number', value: 200 },
			{ id: 'pf1', label: 'מקדם הספק נוכחי', type: 'number', value: 0.8, step: 'any' },
			{ id: 'pf2', label: 'מקדם הספק רצוי', type: 'number', value: 0.95, step: 'any' }
		],
		compute: function (v) {
			if (!all(v.P, v.pf1, v.pf2) || v.pf1 <= 0 || v.pf1 > 1 || v.pf2 <= 0 || v.pf2 > 1) return null;
			var f1 = Math.acos(v.pf1), f2 = Math.acos(v.pf2), q = v.P * (Math.tan(f1) - Math.tan(f2));
			return [{ l: 'הספק ריאקטיבי של סוללת הקבלים', v: q, u: 'kVAr', d: 2, big: 1 }, { l: 'זווית נוכחית', v: f1 / DEG, u: '°', d: 2 }, { l: 'זווית רצויה', v: f2 / DEG, u: '°', d: 2 }];
		}
	};

	C.trvdrop = {
		title: 'מפל מתח ביציאה מהשנאי',
		intro: 'מפל המתח ביציאה מהשנאי כשהוא מועמס באחוז מסוים מההספק הנקוב.',
		formula: M(mi('β'), mo('('), sub(mi('e'), mi('r')), mo('%'), mi('cosφ'), mo('+'), sub(mi('e'), mi('x')), mo('%'), mi('sinφ'), mo(')'), mo('+'), frac(mn('1'), mn('200')), DOT, sup(mi('β'), mn('2')), sup(mo('(') + sub(mi('e'), mi('r')) + mo('%') + mi('sinφ') + mo('+') + sub(mi('e'), mi('x')) + mo('%') + mi('cosφ') + mo(')'), mn('2'))),
		fields: [
			{ id: 'beta', label: 'אחוז העמסה על השנאי (β)', unit: '%', type: 'number', value: 100 },
			{ id: 'cos', label: 'מקדם הספק cosφ', type: 'number', value: 0.8, step: 'any' },
			{ id: 'LL', label: 'הפסדי נחושת (LL)', unit: 'kW', type: 'number', value: 9.5, step: 'any' },
			{ id: 'SB', label: 'הספק השנאי (SB)', unit: 'kVA', type: 'number', value: 1000 },
			{ id: 'Uk', label: 'Uk', unit: '%', type: 'number', value: 6 },
			{ id: 'V0', label: 'מתח בריקם (לא חובה)', unit: 'V', type: 'number', value: 400 }
		],
		compute: function (v) {
			if (!all(v.beta, v.cos, v.LL, v.SB, v.Uk) || v.SB <= 0 || v.cos <= 0 || v.cos > 1) return null;
			var er = v.LL / v.SB * 100; if (v.Uk < er) return [{ t: 'ה-Uk קטן מ-er%. בדקו את הנתונים.', cls: 'warn' }];
			var ex = Math.sqrt(v.Uk * v.Uk - er * er), b = v.beta / 100, sn = Math.sqrt(1 - v.cos * v.cos);
			var du = b * (er * v.cos + ex * sn) + b * b / 200 * Math.pow(er * sn + ex * v.cos, 2);
			var out = [{ l: 'er%', v: er, u: '%', d: 3 }, { l: 'ex%', v: ex, u: '%', d: 3 }, { l: 'מפל מתח ביציאה מהשנאי', v: du, u: '%', d: 2, big: 1 }];
			if (isFinite(v.V0)) out.push({ l: 'מתח ביציאה בעומס', v: v.V0 * (1 - du / 100), u: 'V', d: 1 });
			return out;
		}
	};

	/* ---- בניית הממשק ---- */
	function build(root, id) {
		var def = C[id];
		if (!def) return;
		var state = {}, resBox = el('div', { class: 'moeqs-calc-res', 'aria-live': 'polite' });
		var rows = {};
		def.fields.forEach(function (f) { state[f.id] = f.type === 'checks' ? (f.value || []).slice() : f.value; });

		function read() {
			var v = {};
			def.fields.forEach(function (f) {
				var s = state[f.id];
				if (f.type === 'number') { var n = parseFloat(String(s).replace(',', '.')); v[f.id] = isFinite(n) ? n : NaN; }
				else v[f.id] = s;
			});
			return v;
		}
		function set(fid, val) {
			state[fid] = val;
			var inp = root.querySelector('[name="' + fid + '"]');
			if (inp && inp.type !== 'radio' && inp.type !== 'checkbox') inp.value = val;
		}
		function lab(f, v) { return typeof f.label === 'function' ? f.label(v) : f.label; }
		function unit(f, v) { return typeof f.unit === 'function' ? f.unit(v) : f.unit; }
		function refreshLabels() {
			var v = read();
			def.fields.forEach(function (f) {
				var r = rows[f.id]; if (!r) return;
				var l = r.querySelector('.moeqs-calc-lab'); if (l && typeof f.label === 'function') l.textContent = lab(f, v);
				var u = r.querySelector('.moeqs-calc-unit'); if (u && typeof f.unit === 'function') u.textContent = unit(f, v);
				if (f.show) r.hidden = !f.show(v);
			});
		}
		function render() {
			var out = def.compute(read());
			while (resBox.firstChild) resBox.removeChild(resBox.firstChild);
			if (!out) { resBox.appendChild(el('p', { class: 'moeqs-calc-hint', text: 'הזינו את כל הנתונים כדי לראות את התוצאה.' })); return; }
			out.forEach(function (o) {
				if (o.t) resBox.appendChild(el('p', { class: 'moeqs-calc-note ' + (o.cls || ''), text: o.t }));
				else resBox.appendChild(el('div', { class: 'moeqs-calc-out' + (o.big ? ' is-big' : '') }, [el('span', { class: 'moeqs-calc-olab', text: o.l }), el('strong', { text: fmt(o.v, o.d === undefined ? 2 : o.d) }), o.u ? el('span', { class: 'moeqs-calc-ounit', text: o.u }) : null]));
			});
		}
		var form = el('div', { class: 'moeqs-calc-form', role: 'group', 'aria-label': def.title });
		def.fields.forEach(function (f) {
			var fid = 'calc-' + id + '-' + f.id, ctrl, row;
			var ev = function () {
				if (f.type === 'number') state[f.id] = ctrl.value;
				if (f.type === 'select') state[f.id] = ctrl.value;
				if (def.onChange) def.onChange(f.id, read(), set);
				refreshLabels(); render();
			};
			if (f.type === 'select') {
				ctrl = el('select', { id: fid, name: f.id, onchange: ev }, f.options.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
				ctrl.value = f.value;
				row = el('div', { class: 'moeqs-calc-row' }, [el('label', { for: fid, class: 'moeqs-calc-lab', text: lab(f, read()) }), ctrl]);
			} else if (f.type === 'radio') {
				var grp = el('div', { class: 'moeqs-calc-radios', role: 'radiogroup', 'aria-labelledby': fid + '-l' });
				f.options.forEach(function (o, i) {
					var rid = fid + '-' + i, inp = el('input', { type: 'radio', name: f.id, id: rid, value: o[0], onchange: function () { state[f.id] = inp.value; if (def.onChange) def.onChange(f.id, read(), set); refreshLabels(); render(); } });
					if (String(o[0]) === String(f.value)) inp.checked = true;
					grp.appendChild(el('label', { for: rid, class: 'moeqs-calc-radio' }, [inp, el('span', { text: o[1] })]));
				});
				row = el('div', { class: 'moeqs-calc-row' }, [el('span', { id: fid + '-l', class: 'moeqs-calc-lab', text: lab(f, read()) }), grp]);
			} else if (f.type === 'checks') {
				var cg = el('div', { class: 'moeqs-calc-radios', role: 'group', 'aria-labelledby': fid + '-l' });
				f.options.forEach(function (o, i) {
					var cid = fid + '-' + i, inp = el('input', { type: 'checkbox', name: f.id, id: cid, value: o[0], onchange: function () {
						var cur = state[f.id].slice(), val = parseFloat(o[0]), ix = cur.indexOf(val);
						if (inp.checked && ix < 0) cur.push(val); if (!inp.checked && ix >= 0) cur.splice(ix, 1);
						state[f.id] = cur; render();
					} });
					if (state[f.id].indexOf(parseFloat(o[0])) >= 0) inp.checked = true;
					cg.appendChild(el('label', { for: cid, class: 'moeqs-calc-radio' }, [inp, el('span', { text: o[1] })]));
				});
				row = el('div', { class: 'moeqs-calc-row' }, [el('span', { id: fid + '-l', class: 'moeqs-calc-lab', text: lab(f, read()) }), cg]);
			} else {
				ctrl = el('input', { id: fid, name: f.id, type: 'text', inputmode: 'decimal', value: f.value, oninput: ev, 'aria-describedby': f.hint ? fid + '-h' : null });
				var u = unit(f, read());
				row = el('div', { class: 'moeqs-calc-row' }, [el('label', { for: fid, class: 'moeqs-calc-lab', text: lab(f, read()) }), el('div', { class: 'moeqs-calc-inwrap' }, [ctrl, el('span', { class: 'moeqs-calc-unit', text: u || '' })]), f.hint ? el('small', { id: fid + '-h', class: 'moeqs-hint', text: f.hint }) : null]);
			}
			rows[f.id] = row; form.appendChild(row);
		});
		root.appendChild(el('div', { class: 'moeqs-calc-grid' }, [form, el('div', { class: 'moeqs-calc-side' }, [el('h3', { class: 'moeqs-calc-restitle', text: 'תוצאה' }), resBox])]));
		root.appendChild(el('div', { class: 'moeqs-calc-formula' }, [el('h3', { text: 'הנוסחה' }), el('div', { html: def.formula })]));
		refreshLabels(); render();
	}

	function boot() {
		var roots = document.querySelectorAll('[data-moeqs-calc]');
		Array.prototype.forEach.call(roots, function (r) { if (!r.getAttribute('data-ready')) { r.setAttribute('data-ready', '1'); build(r, r.getAttribute('data-moeqs-calc')); } });
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
