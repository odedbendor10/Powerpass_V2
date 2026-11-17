/* POWERPASS – שכבת הליבה: אחסון, תקשורת עם התוסף, התחברות, רישיון אופליין, מאגר מוצפן וסנכרון.
   משותפת למסך הראשי (index.html) ולמסך הסימולציה (quiz.html). */
(function () {
	'use strict';
	var C = window.PP_CONFIG;
	var LS = window.localStorage;
	var K = {
		auth: 'pp_auth', me: 'pp_me', settings: 'pp_settings', device: 'pp_device', lic: 'pp_license',
		clock: 'pp_clock', state: 'pp_state', outbox: 'pp_outbox', sync: 'pp_lastsync', manifest: 'pp_manifest', kicked: 'pp_kicked'
	};

	/* ------------------------------------------------------------------ אחסון */
	function jget(k, d) { try { var v = LS.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
	function jset(k, v) { try { if (v === null || v === undefined) LS.removeItem(k); else LS.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full */ } }
	function now() { return Math.floor(Date.now() / 1000); }
	function uuid() {
		if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
		var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
		var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
		return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
	}
	function deviceId() { var d = LS.getItem(K.device); if (!d) { d = uuid(); LS.setItem(K.device, d); } return d; }

	/* IndexedDB: המאגר המוצפן (kv) והשרטוטים (img) */
	var dbp = null;
	function db() {
		if (dbp) return dbp;
		dbp = new Promise(function (res, rej) {
			var r = indexedDB.open('powerpass', 1);
			r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('img')) d.createObjectStore('img'); };
			r.onsuccess = function () { res(r.result); };
			r.onerror = function () { rej(r.error); };
		});
		return dbp;
	}
	function idb(store, mode, fn) {
		return db().then(function (d) {
			return new Promise(function (res, rej) {
				var tx = d.transaction(store, mode), st = tx.objectStore(store), out;
				var req = fn(st);
				if (req) req.onsuccess = function () { out = req.result; };
				tx.oncomplete = function () { res(out); };
				tx.onerror = tx.onabort = function () { rej(tx.error); };
			});
		});
	}
	var IDB = {
		get: function (s, k) { return idb(s, 'readonly', function (st) { return st.get(k); }); },
		put: function (s, k, v) { return idb(s, 'readwrite', function (st) { return st.put(v, k); }); },
		del: function (s, k) { return idb(s, 'readwrite', function (st) { return st.delete(k); }); },
		keys: function (s) { return idb(s, 'readonly', function (st) { return st.getAllKeys(); }); },
		clear: function (s) { return idb(s, 'readwrite', function (st) { return st.clear(); }); }
	};

	/* ------------------------------------------------------------------ אירועים */
	var listeners = {};
	function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
	function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }

	/* ------------------------------------------------------------------ HTTP */
	function native() { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
	/* תוסף Capacitor לפי שם (core: CapacitorHttp / SystemBars; תוספים: App / Browser – נטענים מ-js/cap/*.js) */
	function plugin(name) {
		if (!native()) return null;
		var P = window.Capacitor && Capacitor.Plugins;
		if (P && P[name]) return P[name];
		var ex = window.capacitorExports; if (ex && ex[name]) return ex[name];
		var g = window['capacitor' + name]; return (g && g[name]) || null;
	}
	function httpPlugin() { return plugin('CapacitorHttp'); }
	function NetErr(msg) { var e = new Error(msg || 'network'); e.offline = true; return e; }

	/* בקשה גולמית. HTTP מקורי באפליקציה (בלי CORS ובלי עוגיות), fetch בדפדפן (לבדיקות) */
	function raw(method, url, headers, body, responseType) {
		var H = httpPlugin();
		if (H) {
			return H.request({ url: url, method: method, headers: headers, data: body === undefined ? undefined : body, responseType: responseType || 'json', connectTimeout: 15000, readTimeout: 90000 })
				.then(function (r) {
					var d = r.data;
					if (responseType !== 'blob' && typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { /* not json */ } }
					return { status: r.status, data: d };
				}, function (e) { throw NetErr(e && e.message); });
		}
		var opt = { method: method, headers: headers, cache: 'no-store' };
		if (body !== undefined) opt.body = JSON.stringify(body);
		return fetch(url, opt).then(function (r) {
			if (responseType === 'blob') return r.blob().then(function (b) { return { status: r.status, data: b }; });
			return r.text().then(function (t) { var d = t; try { d = JSON.parse(t); } catch (e) { /* not json */ } return { status: r.status, data: d }; });
		}, function (e) { throw NetErr(e && e.message); });
	}

	function apiError(res) {
		var d = res.data || {};
		var e = new Error((d && d.message) || ('שגיאה ' + res.status));
		e.status = res.status; e.code = (d && d.code) || ''; e.data = d;
		return e;
	}

	var refreshing = null;
	function auth() { return jget(K.auth, null); }
	function loggedIn() { return !!auth(); }

	function refreshTokens() {
		if (refreshing) return refreshing;
		var a = auth();
		if (!a) return Promise.reject(apiError({ status: 401, data: { code: 'moeqs_app_invalid', message: 'יש להתחבר.' } }));
		refreshing = raw('POST', C.API_BASE + '/app/refresh', baseHeaders(), { refresh: a.refresh })
			.then(function (res) {
				if (res.status === 200 && res.data && res.data.access) {
					jset(K.auth, { access: res.data.access, refresh: res.data.refresh, exp: now() + (res.data.expires_in || 3600) - 60, uid: a.uid });
					return res.data.access;
				}
				throw apiError(res);
			})
			.then(function (t) { refreshing = null; return t; }, function (e) { refreshing = null; if (e.status) handleAuthError(e); throw e; });
		return refreshing;
	}

	function baseHeaders() {
		return { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-PowerPass-Device': deviceId(), 'X-PowerPass-App': C.APP_VERSION };
	}

	/* קריאה ל-API של התוסף. path יחסי ל-moeqs/v1 */
	function api(method, path, body, opts) {
		opts = opts || {};
		var go = function (tok) {
			var h = baseHeaders();
			if (tok) { h.Authorization = 'Bearer ' + tok; h['X-PowerPass-Token'] = tok; }
			return raw(method, C.API_BASE + path, h, body);
		};
		var a = auth();
		var start = opts.auth === false || !a ? Promise.resolve(null) : (a.exp < now() ? refreshTokens() : Promise.resolve(a.access));
		return start.then(go).then(function (res) {
			if (res.status === 401 && opts.auth !== false && res.data && res.data.code === 'moeqs_app_expired' && !opts.retried) {
				return refreshTokens().then(function () { return api(method, path, body, { retried: true }); });
			}
			if (res.status >= 400) { var e = apiError(res); if (opts.auth !== false) handleAuthError(e); throw e; }
			return res.data;
		});
	}

	/* ------------------------------------------------------------------ ניתוק, התנתקות, מחיקת נתונים */
	function handleAuthError(e) {
		if (e.code === 'moeqs_app_kicked') { wipe(true, e.message); }
		else if (e.code === 'moeqs_app_invalid' || e.code === 'moeqs_app_suspended') { wipe(false, e.code === 'moeqs_app_suspended' ? e.message : ''); }
	}

	/* מחיקת ההתחברות, מפתח הרישיון והמאגר המוצפן מהמכשיר. השרטוטים (ציבוריים) נשארים כדי לחסוך הורדה חוזרת. */
	function wipe(kicked, msg) {
		[K.auth, K.me, K.lic, K.state, K.outbox, K.sync, K.manifest].forEach(function (k) { LS.removeItem(k); });
		try { Object.keys(LS).forEach(function (k) { if (k.indexOf('moeqs_run:') === 0 || k === 'moeqs_lastrun') LS.removeItem(k); }); } catch (e) { /* ignore */ }
		if (msg) jset(K.kicked, { kicked: !!kicked, msg: msg, at: now() });
		IDB.del('kv', 'bank').catch(function () {});
		emit('logout', { kicked: !!kicked, msg: msg || '' });
	}

	function login(user, pass) {
		var dev = { name: (navigator.userAgent.match(/Android[^;)]*;\s*([^;)]+)/) || [])[1] || 'Android', platform: 'android', app: C.APP_VERSION };
		return raw('POST', C.API_BASE + '/app/login', baseHeaders(), { login: user, password: pass, device: dev }).then(function (res) {
			if (res.status !== 200 || !res.data || !res.data.access) throw apiError(res);
			var d = res.data;
			LS.removeItem(K.kicked);
			jset(K.auth, { access: d.access, refresh: d.refresh, exp: now() + (d.expires_in || 3600) - 60, uid: d.me.user.id });
			applyMe(d.me);
			return d;
		});
	}

	function logout() {
		var p = loggedIn() ? api('POST', '/app/logout', {}).catch(function () {}) : Promise.resolve();
		return p.then(function () { wipe(false, ''); });
	}

	/* ------------------------------------------------------------------ פרטי משתמש ורישיון אופליין */
	function me() { return jget(K.me, null); }
	function settings() { return jget(K.settings, null); }

	function applyMe(m) {
		if (!m) return;
		var skew = (m.server_time || now()) - now(); // הפרש שעון המכשיר מהשרת
		jset(K.me, m);
		if (m.license && m.license.key) {
			jset(K.lic, { key: m.license.key, offline_until: m.license.offline_until, access_until: m.license.access_until, offline_days: m.license.offline_days, skew: skew, rev: (m.bank || {}).rev });
		} else {
			LS.removeItem(K.lic); // אין מנוי פעיל / החשבון מושהה: המפתח נמחק והמאגר כבר לא נפתח
			IDB.del('kv', 'bank').catch(function () {});
		}
		touchClock();
		emit('me', m);
	}

	function touchClock() { var c = jget(K.clock, 0); var t = now(); if (t > c) jset(K.clock, t); }

	/* מצב הרישיון: { ok, reason, until, daysLeft } */
	function license() {
		var l = jget(K.lic, null);
		if (!l || !l.key) {
			var m = me();
			if (m && m.membership && m.membership.frozen_until) return { ok: false, reason: 'frozen', until: m.membership.frozen_until };
			return { ok: false, reason: m ? 'not_member' : 'logged_out' };
		}
		var t = now(), maxSeen = jget(K.clock, 0), tol = (C.CLOCK_TOLERANCE_H || 6) * 3600;
		if (maxSeen && t < maxSeen - tol) return { ok: false, reason: 'clock' };
		var local = l.offline_until - (l.skew || 0); // offline_until בזמן השרת → זמן המכשיר
		if (t > local) {
			LS.removeItem(K.lic);
			return { ok: false, reason: 'offline_expired' };
		}
		touchClock();
		return { ok: true, until: local, daysLeft: Math.max(0, Math.ceil((local - t) / 86400)), access_until: l.access_until - (l.skew || 0) };
	}

	/* ------------------------------------------------------------------ קריפטו */
	function b64bytes(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
	function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x + 256).toString(16).slice(1); }).join(''); }

	function decryptBank(rec, keyB64) {
		return crypto.subtle.importKey('raw', b64bytes(keyB64), 'AES-GCM', false, ['decrypt'])
			.then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64bytes(rec.iv) }, k, b64bytes(rec.ct)); })
			.then(function (pt) { return new TextDecoder().decode(pt); });
	}

	var bankCache = null;
	/* פותח את המאגר מהמכשיר (רק עם רישיון בתוקף). מחזיר את אובייקט המאגר או זורק שגיאה עם reason. */
	function openBank() {
		var L = license();
		if (!L.ok) { var e = new Error('license'); e.reason = L.reason; return Promise.reject(e); }
		if (bankCache) return Promise.resolve(bankCache);
		var key = jget(K.lic, {}).key;
		return IDB.get('kv', 'bank').then(function (rec) {
			if (!rec) { var e = new Error('no bank'); e.reason = 'no_bank'; throw e; }
			return decryptBank(rec, key).then(function (txt) { bankCache = JSON.parse(txt); return bankCache; }, function () {
				var e2 = new Error('decrypt'); e2.reason = 'no_bank'; IDB.del('kv', 'bank'); throw e2; // מפתח חדש (התחברות חדשה): צריך להוריד שוב
			});
		});
	}

	/* ------------------------------------------------------------------ מצב מקומי (שיקוף של השרת + פעולות שלא סונכרנו) */
	function state() { return jget(K.state, { history: [], saved: [], qstats: {}, wrong: {} }); }
	function setState(s) { jset(K.state, s); emit('state', s); }
	function outbox() { return jget(K.outbox, { results: [], answers: [], bookmarks: [], reports: [] }); }
	function setOutbox(o) { jset(K.outbox, o); emit('outbox', o); }
	function pendingCount() { var o = outbox(); return o.results.length + o.bookmarks.length + o.reports.length + (o.answers.length ? 1 : 0); }

	/* אותו חישוב כמו moeqs_update_qstats בתוסף */
	function applyAnswers(s, answers) {
		answers.forEach(function (a) {
			var n = a[0] | 0, r = a[1] | 0; if (!n || (r !== 0 && r !== 1)) return;
			var row = s.qstats[n] || [0, 0, 0];
			row[r ? 0 : 1] = (row[r ? 0 : 1] | 0) + 1; row[2] = now();
			s.qstats[n] = row;
			if (r) delete s.wrong[n]; else s.wrong[n] = (s.wrong[n] | 0) + 1;
		});
	}

	function recordAnswers(answers) {
		if (!answers || !answers.length) return;
		var o = outbox(); o.answers = o.answers.concat(answers); setOutbox(o);
		var s = state(); applyAnswers(s, answers); setState(s);
		scheduleSync();
	}
	function recordResult(entry) {
		var e = { cid: uuid(), time: now(), label: entry.label, total: entry.total, correct: entry.correct, pct: entry.pct, passed: !!entry.passed, secs: entry.secs, items: entry.items || [] };
		var o = outbox(); o.results.push(e); setOutbox(o);
		var s = state(); var copy = JSON.parse(JSON.stringify(e)); copy.pending = true; s.history.push(copy); setState(s);
		recordAnswers(entry.answers || []);
		scheduleSync();
	}
	function setBookmark(n, on) {
		var s = state(), set = {}; s.saved.forEach(function (x) { set[x] = 1; });
		if (on) set[n] = 1; else delete set[n];
		s.saved = Object.keys(set).map(Number).sort(function (a, b) { return a - b; }); setState(s);
		var o = outbox(); o.bookmarks = o.bookmarks.filter(function (b) { return b.n !== n; }); o.bookmarks.push({ n: n, on: on ? 1 : 0, t: now() }); setOutbox(o);
		scheduleSync();
	}
	function sendReport(n, message) {
		return api('POST', '/report', { n: n, message: message }).catch(function (e) {
			if (e.offline) { var o = outbox(); o.reports.push({ n: n, message: message }); setOutbox(o); return { ok: true, queued: true }; }
			throw e;
		});
	}

	/* ------------------------------------------------------------------ סנכרון */
	var syncing = null, syncT = null;
	function scheduleSync() { clearTimeout(syncT); syncT = setTimeout(function () { if (navigator.onLine !== false) sync({ quiet: true }).catch(function () {}); }, 2500); }

	function flushOutbox() {
		var o = outbox();
		var p = Promise.resolve();
		if (o.reports.length) {
			var reps = o.reports.slice();
			p = reps.reduce(function (acc, r) { return acc.then(function () { return api('POST', '/report', r).catch(function (e) { if (e.offline) throw e; }); }); }, p)
				.then(function () { var cur = outbox(); cur.reports = cur.reports.slice(reps.length); setOutbox(cur); });
		}
		return p.then(function () {
			var snap = outbox();
			var body = { results: snap.results, answers: snap.answers, bookmarks: snap.bookmarks };
			return api(body.results.length || body.answers.length || body.bookmarks.length ? 'POST' : 'GET', '/app/history', body.results.length || body.answers.length || body.bookmarks.length ? body : undefined).then(function (d) {
				var cur = outbox(); // מה שנוסף בזמן השליחה נשאר לשליחה הבאה
				cur.results = cur.results.slice(snap.results.length); cur.answers = cur.answers.slice(snap.answers.length); cur.bookmarks = cur.bookmarks.slice(snap.bookmarks.length);
				setOutbox(cur);
				var s = { history: d.history || [], saved: d.saved || [], qstats: d.qstats || {}, wrong: d.wrong || {} };
				applyAnswers(s, cur.answers);
				cur.results.forEach(function (r) { var c = JSON.parse(JSON.stringify(r)); c.pending = true; s.history.push(c); });
				var set = {}; s.saved.forEach(function (x) { set[x] = 1; }); cur.bookmarks.forEach(function (b) { if (b.on) set[b.n] = 1; else delete set[b.n]; });
				s.saved = Object.keys(set).map(Number);
				setState(s);
			});
		});
	}

	function bankRec() { return IDB.get('kv', 'bank'); }

	function syncImages(man, progress) {
		var list = (man && man.images) || [];
		return IDB.keys('img').then(function (keys) {
			var have = {}; keys.forEach(function (k) { have[k] = 1; });
			return Promise.all(list.map(function (it) { return have[it[0]] ? IDB.get('img', it[0]).then(function (r) { return r && r.v === it[2] ? null : it; }) : Promise.resolve(it); }));
		}).then(function (need) {
			need = need.filter(Boolean);
			var total = need.length, done = 0, fails = 0, idx = 0;
			if (!total) { progress && progress(1, 0, 0); return { downloaded: 0, failed: 0 }; }
			function worker() {
				if (idx >= need.length) return Promise.resolve();
				var it = need[idx++];
				var url = man.images_base + encodeURIComponent(it[0]) + '?v=' + it[2];
				return raw('GET', url, { 'Accept': 'image/*' }, undefined, 'blob').then(function (r) {
					if (r.status !== 200) throw new Error('img ' + r.status);
					var blob = r.data;
					if (typeof blob === 'string') { // HTTP מקורי מחזיר base64
						var type = /\.png$/i.test(it[0]) ? 'image/png' : (/\.jpe?g$/i.test(it[0]) ? 'image/jpeg' : 'image/webp');
						blob = new Blob([b64bytes(blob.replace(/^data:[^,]*,/, ''))], { type: type });
					}
					return IDB.put('img', it[0], { v: it[2], blob: blob });
				}).catch(function () { fails++; }).then(function () { done++; progress && progress(done / total, done, total); return worker(); });
			}
			var ws = []; for (var i = 0; i < (C.IMG_PARALLEL || 6); i++) ws.push(worker());
			return Promise.all(ws).then(function () { return { downloaded: total - fails, failed: fails }; });
		});
	}

	function fetchSettings() {
		return api('GET', '/app/settings', undefined, { auth: false }).then(function (s) { jset(K.settings, s); emit('settings', s); return s; });
	}

	/* סנכרון מלא: פעולות שנאספו → פרטי משתמש ורישיון → מאגר (אם השתנה) → שרטוטים חסרים */
	function sync(opts) {
		opts = opts || {};
		if (syncing) return syncing;
		if (!loggedIn()) return fetchSettings().catch(function () {});
		emit('sync', { phase: 'start' });
		syncing = flushOutbox()
			.then(function () { return api('GET', '/app/me'); })
			.then(function (m) { applyMe(m); return fetchSettings().catch(function () {}); })
			.then(function () {
				if (!license().ok) return null;
				return api('GET', '/app/bank/manifest').then(function (man) {
					jset(K.manifest, man);
					return bankRec().then(function (rec) {
						if (rec && rec.rev === man.rev) return man;
						emit('sync', { phase: 'bank' });
						return api('GET', '/app/bank').then(function (b) {
							var key = jget(K.lic, {}).key;
							return decryptBank(b, key).then(function () { return IDB.put('kv', 'bank', { rev: b.rev, iv: b.iv, ct: b.ct, at: now() }); })
								.then(function () { bankCache = null; return man; });
						});
					});
				}).then(function (man) {
					if (!man) return null;
					emit('sync', { phase: 'images' });
					return syncImages(man, function (f, d, t) { emit('sync', { phase: 'images', frac: f, done: d, total: t }); });
				});
			})
			.then(function () { jset(K.sync, now()); emit('sync', { phase: 'done' }); })
			.catch(function (e) { emit('sync', { phase: 'error', error: e }); throw e; })
			.then(function (x) { syncing = null; return x; }, function (e) { syncing = null; throw e; });
		return syncing;
	}

	/* ------------------------------------------------------------------ שרטוטים מהמכשיר */
	var urlCache = {};
	function imageUrl(name) {
		if (/^https?:\/\//i.test(name)) return Promise.resolve(name);
		if (urlCache[name]) return Promise.resolve(urlCache[name]);
		return IDB.get('img', name).then(function (r) {
			if (r && r.blob) { urlCache[name] = URL.createObjectURL(r.blob); return urlCache[name]; }
			var man = jget(K.manifest, null);
			return man ? man.images_base + encodeURIComponent(name) : name; // עוד לא הורד: מהאתר (דורש רשת)
		}).catch(function () { return name; });
	}

	/* ------------------------------------------------------------------ עיצוב: צבעים, מצב כהה, סימן מים, הגנות */
	function applyPalette(s) {
		s = s || settings();
		if (!s || !s.palette) return;
		var r = document.documentElement.style;
		r.setProperty('--pp-dark', s.palette.dark); r.setProperty('--pp-primary', s.palette.primary);
		r.setProperty('--pp-accent', s.palette.accent); r.setProperty('--pp-info', s.palette.info || '#2563eb');
	}
	function themePref() { try { return LS.getItem('moeqs_theme') || 'auto'; } catch (e) { return 'auto'; } }
	function applyTheme(pref) {
		pref = pref || themePref();
		var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
		if (dark) document.documentElement.setAttribute('data-moeqs-theme', 'dark'); else document.documentElement.removeAttribute('data-moeqs-theme');
		var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#0f1226' : '#151c36');
		try { // הכותרת העליונה תמיד כהה (סמלים בהירים); סרגל הניווט לפי מצב התצוגה
			var SB = plugin('SystemBars');
			if (SB && SB.setStyle) { SB.setStyle({ style: dark ? 'DARK' : 'LIGHT', bar: 'NavigationBar' }); SB.setStyle({ style: 'DARK', bar: 'StatusBar' }); }
		} catch (e) { /* ignore */ }
	}
	function setTheme(pref) { try { if (pref === 'auto') LS.removeItem('moeqs_theme'); else LS.setItem('moeqs_theme', pref); } catch (e) { /* ignore */ } applyTheme(pref); }
	if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { applyTheme(); }); } catch (e) { /* old webview */ } }

	/* סימן מים עדין עם שם המשתמש, מעל כל המסך, לא חוסם לחיצות (כמו moeqs_acc_watermark_html באתר) */
	function watermark() {
		var m = me(); var old = document.getElementById('pp-wm'); if (old) old.remove();
		if (!m || !m.user || m.user.admin) return;
		var line = 'רישיון אישי: ' + [m.user.name, m.user.email].filter(Boolean).join(' | ');
		var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><g transform="rotate(-24 210 110)">' +
			'<text x="210" y="104" text-anchor="middle" direction="rtl" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#808080" fill-opacity=".13">' + esc(line) + '</text>' +
			'<text x="210" y="132" text-anchor="middle" direction="rtl" font-family="Arial,sans-serif" font-size="11" fill="#808080" fill-opacity=".11">POWERPASS · עודד אלקטריק · כל הזכויות שמורות</text></g></svg>';
		var d = document.createElement('div'); d.id = 'pp-wm'; d.setAttribute('aria-hidden', 'true');
		d.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
		document.body.appendChild(d);
	}

	/* חסימת העתקה / תפריט לחיצה ארוכה (צילום מסך נחסם ברמת מערכת ההפעלה: FLAG_SECURE ב-MainActivity) */
	function shield() {
		['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(function (ev) {
			document.addEventListener(ev, function (e) {
				var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
				e.preventDefault();
			}, true);
		});
	}

	/* קישורים חיצוניים (סימוכין, תקנון, אתר): נפתחים בדפדפן ולא בתוך האפליקציה */
	function openExternal(url) {
		var B = plugin('Browser');
		if (B) return B.open({ url: url, presentationStyle: 'popover' });
		window.open(url, '_blank', 'noopener');
		return Promise.resolve();
	}
	function interceptLinks() {
		document.addEventListener('click', function (e) {
			var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
			if (!a) return;
			var href = a.getAttribute('href') || '';
			if (/^https?:\/\//i.test(href) && href.indexOf(location.origin) !== 0) { e.preventDefault(); openExternal(href); }
		}, true);
	}

	/* קישור חד-פעמי לאתר כשהמשתמש מחובר (רכישה / ניהול חשבון) */
	function openSite(to, plan) {
		return api('POST', '/app/handoff', { to: to, plan: plan || '' }).then(function (d) { return openExternal(d.url); });
	}

	function fmtDate(ts) { var d = new Date(ts * 1000); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
	function fmtDateTime(ts) { var d = new Date(ts * 1000); return fmtDate(ts) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

	/* כשהאפליקציה חוזרת לחזית / חוזר חיבור: סנכרון */
	function lifecycle() {
		window.addEventListener('online', function () { emit('net', true); if (loggedIn()) sync({ quiet: true }).catch(function () {}); });
		window.addEventListener('offline', function () { emit('net', false); });
		var App = plugin('App');
		if (App) {
			App.addListener('appStateChange', function (st) { if (st.isActive) { emit('resume'); if (loggedIn()) sync({ quiet: true }).catch(function () {}); } });
		}
	}

	window.PP = {
		C: C, K: K, jget: jget, jset: jset, now: now, uuid: uuid, deviceId: deviceId, IDB: IDB,
		on: on, emit: emit, native: native, plugin: plugin, api: api, raw: raw,
		auth: auth, loggedIn: loggedIn, login: login, logout: logout, wipe: wipe,
		me: me, settings: settings, applyMe: applyMe, license: license, openBank: openBank,
		state: state, setState: setState, outbox: outbox, pendingCount: pendingCount,
		recordAnswers: recordAnswers, recordResult: recordResult, setBookmark: setBookmark, sendReport: sendReport,
		sync: sync, fetchSettings: fetchSettings, imageUrl: imageUrl,
		applyPalette: applyPalette, applyTheme: applyTheme, setTheme: setTheme, themePref: themePref,
		watermark: watermark, shield: shield, interceptLinks: interceptLinks, openExternal: openExternal, openSite: openSite,
		fmtDate: fmtDate, fmtDateTime: fmtDateTime, lifecycle: lifecycle
	};
	try { applyTheme(); } catch (e) { /* before body */ }
})();
