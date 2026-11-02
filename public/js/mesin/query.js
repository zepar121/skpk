/*
 * SKPK prototipe To-Be: mesin query SQL bergaya PostgreSQL untuk menyaring data di browser.
 *
 *   "Trf Bm" >= 10 AND "Ur Brg" ~* 'COIL|STRIP'
 *   WHERE "Neg Asal" IN ('CN', 'JP') ORDER BY "Nilai Devisa Idr" DESC LIMIT 100
 *   SELECT "Ur Brg", "Hs Code" FROM pib WHERE ... ORDER BY 2 LIMIT 50 OFFSET 10
 *
 * Hanya satu tabel (pib, peb, ... sesuai jenis dokumen aktif). Kondisi diurai ke pohon (AST) lalu dijalankan per baris.
 * Perbandingan teks, ILIKE/LIKE, dan ~* tidak membedakan huruf besar/kecil; ~ peka huruf.
 * Pesan untuk pengguna berbahasa Inggris.
 */
(function (root) {
  'use strict';

  class QueryError extends Error {
    constructor(pesan, pos, len) {
      super(pesan);
      this.pos = pos || 0;
      this.len = Math.max(1, len || 1);
    }
  }

  // ---------- pola LIKE dan wildcard ----------
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cache = new Map();
  function simpan(kunci, buat) {
    let re = cache.get(kunci);
    if (!re) {
      re = buat();
      if (cache.size > 800) cache.clear();
      cache.set(kunci, re);
    }
    return re;
  }
  // LIKE: % rangkaian karakter, _ satu karakter, \ untuk karakter apa adanya
  function polaLike(p) {
    return simpan('L' + p, () => {
      let out = '';
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === '\\' && i + 1 < p.length) { out += escRe(p[++i]); continue; }
        out += ch === '%' ? '[\\s\\S]*' : ch === '_' ? '[\\s\\S]' : escRe(ch);
      }
      return new RegExp('^' + out + '$', 'i');
    });
  }
  // wildcard Custom AutoFilter: * dan ?, ~ untuk karakter apa adanya
  function polaWildcard(p, mode) {
    return simpan('W' + mode + p, () => {
      let out = '';
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === '~' && i + 1 < p.length && '*?~'.includes(p[i + 1])) { out += escRe(p[++i]); continue; }
        out += ch === '*' ? '[\\s\\S]*' : ch === '?' ? '[\\s\\S]' : escRe(ch);
      }
      return new RegExp(mode === 'penuh' ? '^' + out + '$' : mode === 'awal' ? '^' + out : mode === 'akhir' ? out + '$' : out, 'i');
    });
  }
  const adaWildcard = s => /(^|[^~])[*?]/.test(s);
  function wildcardKeLike(p) {
    let out = '';
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      if (ch === '~' && i + 1 < p.length && '*?~'.includes(p[i + 1])) { out += p[++i]; continue; }
      out += ch === '*' ? '%' : ch === '?' ? '_' : '%_\\'.includes(ch) ? '\\' + ch : ch;
    }
    return out;
  }
  function likeKeWildcard(p) {
    let out = '';
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      if (ch === '\\' && i + 1 < p.length) { const c = p[++i]; out += '*?~'.includes(c) ? '~' + c : c; continue; }
      out += ch === '%' ? '*' : ch === '_' ? '?' : '*?~'.includes(ch) ? '~' + ch : ch;
    }
    return out;
  }
  const escWildcard = s => String(s).replace(/[*?~]/g, '~$&');

  // regex PostgreSQL ke JS: \y \m \M (batas kata) dan kelas POSIX [[:alpha:]] dst
  const POSIX = { alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', space: '\\s', upper: 'A-Z', lower: 'a-z', punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', word: '\\w' };
  function regexPg(p) {
    return String(p)
      .replace(/\\[ymM]/g, '\\b')
      .replace(/\[:(\w+):\]/g, (m, k) => POSIX[k] || m);
  }
  function buatRegex(pola, flag) {
    return simpan('R' + flag + pola, () => new RegExp(regexPg(pola), flag));
  }

  // ---------- nilai ----------
  const kosong = v => v === null || v === undefined || v === '';
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const angkaDari = v => {
    if (isNum(v)) return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v)) return +v;
    return null;
  };
  const teks = v => (kosong(v) ? null : String(v));
  function bandingkan(a, b) {
    if (kosong(a) || kosong(b)) return null;
    if (isNum(a) || isNum(b) || typeof a === 'boolean' || typeof b === 'boolean') {
      const x = angkaDari(a);
      const y = angkaDari(b);
      if (x !== null && y !== null) return x < y ? -1 : x > y ? 1 : 0;
    }
    const x = String(a).toLowerCase();
    const y = String(b).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const tanggalBagian = (v, i) => {
    const s = teks(v);
    const m = s && /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? +m[i] : null;
  };
  const jadiBool = v => (v === null ? false : typeof v === 'boolean' ? v : isNum(v) ? v !== 0 : !kosong(v));

  // kemiripan teks diisi oleh analisis.js
  let mirip = null;

  // ---------- fungsi ----------
  const FUNGSI = {
    UPPER: { n: [1, 1], ket: 'upper case', f: a => (teks(a[0]) === null ? null : teks(a[0]).toUpperCase()) },
    LOWER: { n: [1, 1], ket: 'lower case', f: a => (teks(a[0]) === null ? null : teks(a[0]).toLowerCase()) },
    LENGTH: { n: [1, 1], ket: 'text length', f: a => (teks(a[0]) === null ? null : teks(a[0]).length) },
    TRIM: { n: [1, 1], ket: 'remove leading/trailing spaces', f: a => (teks(a[0]) === null ? null : teks(a[0]).trim()) },
    SUBSTR: {
      n: [2, 3], ket: 'substring (starts at 1)', f: a => {
        const s = teks(a[0]);
        if (s === null) return null;
        const m = Math.max(1, angkaDari(a[1]) || 1) - 1;
        return a.length > 2 ? s.substr(m, Math.max(0, angkaDari(a[2]) || 0)) : s.slice(m);
      }
    },
    LEFT: { n: [2, 2], ket: 'first n characters', f: a => (teks(a[0]) === null ? null : teks(a[0]).slice(0, Math.max(0, angkaDari(a[1]) || 0))) },
    RIGHT: { n: [2, 2], ket: 'last n characters', f: a => { const s = teks(a[0]); const n = Math.max(0, angkaDari(a[1]) || 0); return s === null ? null : n ? s.slice(-n) : ''; } },
    CONCAT: { n: [1, 99], ket: 'join text', f: a => a.map(x => teks(x) || '').join('') },
    REPLACE: { n: [3, 3], ket: 'replace text', f: a => (teks(a[0]) === null ? null : teks(a[0]).split(teks(a[1]) || '').join(teks(a[2]) || '')) },
    REGEXP_REPLACE: {
      n: [3, 4], ket: "replace by regex; flags 'g' all, 'i' ignore case", f: a => {
        const s = teks(a[0]);
        const pola = teks(a[1]);
        if (s === null || pola === null) return null;
        const fl = String(teks(a[3]) || '');
        let re;
        try { re = buatRegex(pola, (fl.includes('g') ? 'g' : '') + (fl.includes('i') ? 'i' : '')); } catch (e) { return null; }
        const ganti = teks(a[2]) || '';
        re.lastIndex = 0;
        return s.replace(re, (...m) => ganti.replace(/\\(\d)/g, (x, d) => m[+d] || ''));
      }
    },
    SPLIT_PART: { n: [3, 3], ket: 'n-th part after splitting', f: a => { const s = teks(a[0]); if (s === null) return null; const n = angkaDari(a[2]) || 0; const b = s.split(teks(a[1]) || ''); return n > 0 ? b[n - 1] || '' : n < 0 ? b[b.length + n] || '' : null; } },
    STRPOS: { n: [2, 2], ket: 'position of text, 0 if not found', f: a => { const s = teks(a[0]); const c = teks(a[1]); return s === null || c === null ? null : s.toLowerCase().indexOf(c.toLowerCase()) + 1; } },
    NULLIF: { n: [2, 2], ket: 'NULL if both are equal', f: a => (bandingkan(a[0], a[1]) === 0 ? null : a[0]) },
    COALESCE: { n: [1, 99], ket: 'first non-null value', f: a => { for (const x of a) if (!kosong(x)) return x; return null; } },
    ABS: { n: [1, 1], ket: 'absolute value', f: a => (angkaDari(a[0]) === null ? null : Math.abs(angkaDari(a[0]))) },
    ROUND: { n: [1, 2], ket: 'round', f: a => { const x = angkaDari(a[0]); const d = Math.pow(10, angkaDari(a[1]) || 0); return x === null ? null : Math.round(x * d) / d; } },
    YEAR: { n: [1, 1], ket: 'year of a date', f: a => tanggalBagian(a[0], 1) },
    MONTH: { n: [1, 1], ket: 'month of a date', f: a => tanggalBagian(a[0], 2) },
    DAY: { n: [1, 1], ket: 'day of a date', f: a => tanggalBagian(a[0], 3) },
    SIMILAR: { n: [2, 2], ket: 'description similarity 0-1', f: a => { const x = teks(a[0]); const y = teks(a[1]); return x === null || y === null || !mirip ? null : mirip(x, y); } }
  };
  const ALIAS = { UCASE: 'UPPER', LCASE: 'LOWER', LEN: 'LENGTH', CHAR_LENGTH: 'LENGTH', SUBSTRING: 'SUBSTR', MID: 'SUBSTR', IFNULL: 'COALESCE', NVL: 'COALESCE' };
  const KATA = new Set(['AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ILIKE', 'REGEXP', 'RLIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'WHERE', 'XOR',
    'SELECT', 'FROM', 'ORDER', 'BY', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'LIMIT', 'OFFSET']);
  const CAST = { text: 'text', varchar: 'text', char: 'text', bpchar: 'text', numeric: 'angka', decimal: 'angka', int: 'angka', integer: 'angka', bigint: 'angka', smallint: 'angka', real: 'angka', float: 'angka', double: 'angka', date: 'tanggal', timestamp: 'tanggal' };
  // nama tabel = jenis dokumen aktif (pib, peb, ...)
  const TABEL = (root.SKPK_DATA && root.SKPK_DATA.DOK && root.SKPK_DATA.DOK.tabel) || 'pib';

  // ---------- saran nama mirip ----------
  function jarak(a, b) {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function terdekat(nama, calon) {
    const n = nama.toLowerCase();
    let best = null;
    let bestD = Infinity;
    for (const c of calon) {
      const d = jarak(n, c.toLowerCase());
      if (d < bestD) { bestD = d; best = c; }
    }
    return bestD <= Math.max(2, Math.floor(n.length / 3)) ? best : null;
  }

  function petaKolom(kolomList) {
    const peta = new Map();
    for (const k of kolomList) {
      peta.set(k.key.toLowerCase(), k);
      peta.set(k.label.toLowerCase(), k);
      peta.set(k.label.toLowerCase().replace(/\s+/g, ''), k);
    }
    return peta;
  }

  // ---------- token ----------
  function tokenSql(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      const mulai = i;
      if (ch === '-' && src[i + 1] === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (ch === '/' && src[i + 1] === '*') {
        const j = src.indexOf('*/', i + 2);
        if (j < 0) throw new QueryError('Unterminated comment /* ... */.', mulai, src.length - mulai);
        i = j + 2;
        continue;
      }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
        out.push({ t: 'num', v: +m[0], pos: mulai, len: m[0].length });
        i += m[0].length;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
        const tutup = ch === '[' ? ']' : ch;
        let s = '';
        i++;
        for (;;) {
          if (i >= src.length) throw new QueryError(ch === "'" ? 'Unterminated string: closing \' is missing.' : 'Unterminated identifier: closing ' + tutup + ' is missing.', mulai, src.length - mulai);
          if (src[i] === tutup) {
            if (tutup !== ']' && src[i + 1] === tutup) { s += tutup; i += 2; continue; }
            i++;
            break;
          }
          s += src[i++];
        }
        out.push({ t: ch === "'" ? 'str' : 'id', v: s, pos: mulai, len: i - mulai, kutip: true });
        continue;
      }
      if (/[A-Za-z_À-￿]/.test(ch)) {
        const m = /^[A-Za-z_À-￿][A-Za-z0-9_À-￿]*/.exec(src.slice(i));
        const up = m[0].toUpperCase();
        out.push({ t: KATA.has(up) ? 'kw' : 'id', v: KATA.has(up) ? up : m[0], pos: mulai, len: m[0].length });
        i += m[0].length;
        continue;
      }
      const tiga = src.slice(i, i + 3);
      const dua = src.slice(i, i + 2);
      const op = tiga === '!~*' ? tiga : ['<=', '>=', '<>', '!=', '==', '||', '&&', '~*', '!~', '::'].includes(dua) ? dua : '=<>+-*/%(),~;'.includes(ch) ? ch : null;
      if (!op) throw new QueryError('Unexpected character "' + ch + '".', i, 1);
      out.push({ t: 'op', v: op === '==' ? '=' : op === '!=' ? '<>' : op === '&&' ? 'AND' : op, pos: mulai, len: op.length });
      i += op.length;
    }
    out.push({ t: 'akhir', pos: src.length, len: 1 });
    return out;
  }

  // ---------- pengurai ----------
  function pengurai(src, kolomList) {
    const peta = petaKolom(kolomList);
    const tk = tokenSql(src);
    let p = 0;
    const lihat = () => tk[p];
    const ambil = () => tk[p++];
    const kw = v => tk[p].t === 'kw' && tk[p].v === v;
    const op = v => tk[p].t === 'op' && tk[p].v === v;
    const teksTok = t => src.substr(t.pos, t.len);
    const pos = t => ({ pos: t.pos, len: t.len });
    function harap(cek, pesan) {
      if (!cek) { const t = tk[p]; throw new QueryError(t.t === 'akhir' ? 'Incomplete query: ' + pesan : pesan, t.pos, t.len); }
      return tk[p++];
    }
    function kolom(t) {
      const k = peta.get(t.v.toLowerCase()) || peta.get(t.v.toLowerCase().replace(/\s+/g, ''));
      if (!k) {
        const saran = terdekat(t.v, kolomList.map(x => x.key).concat(kolomList.map(x => x.label)));
        const k2 = saran && peta.get(saran.toLowerCase());
        throw new QueryError('Column "' + t.v + '" does not exist.' + (k2 ? ' Did you mean "' + k2.label + '"?' : ''), t.pos, t.len);
      }
      return { t: 'col', key: k.key, ...pos(t) };
    }
    function cekRegex(node) {
      if (node.t === 'str') {
        try { new RegExp(regexPg(node.v)); } catch (e) { throw new QueryError('Invalid regular expression: ' + e.message.replace(/^.*: /, ''), node.pos, node.len); }
      }
    }
    const logika = (jenis, anak) => (anak.length === 1 ? anak[0] : { t: jenis, a: anak });
    function parseOr() {
      const a = [parseXor()];
      while (kw('OR')) { ambil(); a.push(parseXor()); }
      return logika('or', a);
    }
    function parseXor() {
      const a = [parseAnd()];
      while (kw('XOR')) { ambil(); a.push(parseAnd()); }
      return logika('xor', a);
    }
    function parseAnd() {
      const a = [parseNot()];
      while (kw('AND') || op('AND')) { ambil(); a.push(parseNot()); }
      return logika('and', a);
    }
    function parseNot() {
      if (kw('NOT')) { ambil(); return { t: 'not', x: parseNot() }; }
      return parsePredikat();
    }
    function parsePredikat() {
      const a = parseTambah();
      const t = lihat();
      if (t.t === 'op' && ['=', '<>', '<', '<=', '>', '>='].includes(t.v)) {
        ambil();
        return { t: 'cmp', op: t.v, l: a, r: parseTambah() };
      }
      if (t.t === 'op' && ['~', '~*', '!~', '!~*'].includes(t.v)) {
        ambil();
        const pola = parseTambah();
        cekRegex(pola);
        return { t: 'regex', x: a, pola, peka: !t.v.endsWith('*'), neg: t.v.startsWith('!') };
      }
      if (kw('IS')) {
        ambil();
        const neg = kw('NOT') ? (ambil(), true) : false;
        harap(kw('NULL'), 'IS must be followed by NULL or NOT NULL.');
        return { t: 'isnull', x: a, neg };
      }
      let neg = false;
      if (kw('NOT')) { ambil(); neg = true; }
      if (kw('IN')) {
        ambil();
        harap(op('('), "IN needs a list in parentheses, e.g. IN ('CN', 'JP').");
        const list = [parseTambah()];
        while (op(',')) { ambil(); list.push(parseTambah()); }
        harap(op(')'), 'Missing ) after the IN list.');
        return { t: 'in', x: a, list, neg };
      }
      if (kw('BETWEEN')) {
        ambil();
        const lo = parseTambah();
        harap(kw('AND'), 'BETWEEN needs AND, e.g. BETWEEN 1 AND 10.');
        return { t: 'between', x: a, lo, hi: parseTambah(), neg };
      }
      if (kw('LIKE') || kw('ILIKE')) {
        ambil();
        return { t: 'like', x: a, pola: parseTambah(), neg };
      }
      if (kw('REGEXP') || kw('RLIKE')) {
        ambil();
        const pola = parseTambah();
        cekRegex(pola);
        return { t: 'regex', x: a, pola, peka: false, neg };
      }
      if (neg) { const x = lihat(); throw new QueryError('NOT here must be followed by IN, BETWEEN, LIKE, or REGEXP.', x.pos, x.len); }
      return a;
    }
    function parseTambah() {
      let a = parseKali();
      while (op('+') || op('-') || op('||')) {
        const o = ambil().v;
        const b = parseKali();
        a = o === '||' ? { t: 'concat', l: a, r: b } : { t: 'arith', op: o, l: a, r: b };
      }
      return a;
    }
    function parseKali() {
      let a = parseUnary();
      while (op('*') || op('/') || op('%')) {
        const o = ambil().v;
        a = { t: 'arith', op: o, l: a, r: parseUnary() };
      }
      return a;
    }
    function parseUnary() {
      if (op('-')) { ambil(); const x = parseUnary(); return x.t === 'num' ? { ...x, v: -x.v } : { t: 'arith', op: '-', l: { t: 'num', v: 0 }, r: x }; }
      if (op('+')) { ambil(); return parseUnary(); }
      let x = parseDasar();
      // cast gaya PostgreSQL: "Hs Code"::text
      while (op('::')) { ambil(); x = { t: 'cast', x, tipe: tipeCast(harap(lihat().t === 'id' || lihat().t === 'kw', 'Expected a type name after ::, e.g. ::text.')) }; }
      return x;
    }
    function tipeCast(t) {
      const tipe = CAST[String(t.v).toLowerCase()];
      if (!tipe) throw new QueryError('Unknown type ' + t.v + '. Use text, numeric, integer, or date.', t.pos, t.len);
      return tipe;
    }
    function parseDasar() {
      const t = lihat();
      if (t.t === 'num') { ambil(); return { t: 'num', v: t.v, ...pos(t) }; }
      if (t.t === 'str') { ambil(); return { t: 'str', v: t.v, ...pos(t) }; }
      if (t.t === 'kw' && (t.v === 'TRUE' || t.v === 'FALSE')) { ambil(); return { t: 'bool', v: t.v === 'TRUE' }; }
      if (t.t === 'kw' && t.v === 'NULL') { ambil(); return { t: 'null' }; }
      if (op('(')) {
        ambil();
        const a = parseOr();
        harap(op(')'), 'Missing closing parenthesis ).');
        return a;
      }
      // seperti PostgreSQL: "..." selalu nama kolom, teks memakai kutip tunggal '...'
      if (t.t === 'id') {
        ambil();
        if (!t.kutip && op('(')) return fungsi(t);
        return kolom(t);
      }
      if (t.t === 'akhir') throw new QueryError('Incomplete query.', t.pos, 1);
      throw new QueryError('Unexpected "' + teksTok(t) + '".', t.pos, t.len);
    }
    function fungsi(t) {
      const up = t.v.toUpperCase();
      const nama = ALIAS[up] || up;
      if (nama === 'CAST') {
        ambil();
        const x = parseOr();
        harap(lihat().t === 'id' && lihat().v.toUpperCase() === 'AS', 'CAST needs AS, e.g. CAST("Netto" AS text).');
        const tipe = tipeCast(harap(lihat().t === 'id' || lihat().t === 'kw', 'Expected a type name after AS.'));
        harap(op(')'), 'Missing ) after CAST.');
        return { t: 'cast', x, tipe };
      }
      if (nama === 'POSITION') {
        ambil();
        const sub = parseTambah();
        harap(kw('IN'), 'Write POSITION(\'text\' IN "Column").');
        const isi = parseTambah();
        harap(op(')'), 'Missing ) after POSITION.');
        return { t: 'fn', nama: 'STRPOS', args: [isi, sub] };
      }
      if (nama === 'REGEXP_LIKE') {
        ambil();
        const args = argumen(t);
        if (args.length < 2 || args.length > 3) throw new QueryError('REGEXP_LIKE takes 2 to 3 arguments.', t.pos, t.len);
        cekRegex(args[1]);
        return { t: 'regex', x: args[0], pola: args[1], peka: args[2] ? args[2].t === 'str' && args[2].v.includes('c') : false, neg: false };
      }
      if (!FUNGSI[nama]) {
        const saran = terdekat(t.v, Object.keys(FUNGSI));
        throw new QueryError('Function ' + t.v.toLowerCase() + '() does not exist.' + (saran ? ' Did you mean ' + saran.toLowerCase() + '()?' : ''), t.pos, t.len);
      }
      ambil();
      const args = argumen(t);
      const def = FUNGSI[nama];
      if (args.length < def.n[0] || args.length > def.n[1]) {
        throw new QueryError(nama.toLowerCase() + '() takes ' + (def.n[0] === def.n[1] ? def.n[0] : def.n[0] + ' to ' + def.n[1]) + ' argument' + (def.n[1] > 1 ? 's' : '') + '.', t.pos, t.len);
      }
      return { t: 'fn', nama, args };
    }
    function argumen(t) {
      const args = [];
      if (!op(')')) {
        args.push(parseOr());
        while (op(',')) { ambil(); args.push(parseOr()); }
      }
      harap(op(')'), 'Missing ) after ' + t.v.toLowerCase() + '(.');
      return args;
    }
    // nama kolom tunggal untuk SELECT dan ORDER BY
    function namaKolom(pesan) {
      const t = lihat();
      if (t.t !== 'id') throw new QueryError(pesan, t.pos, t.len);
      ambil();
      if (!t.kutip && op('(')) throw new QueryError(pesan, t.pos, t.len);
      return kolom(t);
    }

    // pernyataan: kondisi saja, WHERE ..., atau SELECT ... FROM pib ...
    function pernyataan() {
      const st = { kolom: null, where: null, adaWhere: false, urut: [], limit: null, offset: null };
      if (lihat().t === 'akhir') throw new QueryError('Query is empty.', 0, 1);
      if (kw('SELECT')) {
        ambil();
        if (op('*')) { ambil(); st.kolom = '*'; } else {
          st.kolom = [namaKolom('SELECT supports column names only, e.g. SELECT "Ur Brg", "Hs Code".').key];
          while (op(',')) { ambil(); st.kolom.push(namaKolom('Expected a column name after the comma.').key); }
        }
        if (lihat().t === 'id' && lihat().v.toUpperCase() === 'AS') { const t = lihat(); throw new QueryError('Column aliases (AS) are not supported.', t.pos, t.len); }
        harap(kw('FROM'), 'Expected FROM ' + TABEL + ' after the column list.');
        const t = harap(lihat().t === 'id', 'Expected a table name after FROM.');
        if (t.v.toLowerCase() !== TABEL) throw new QueryError('Table "' + t.v + '" does not exist. Only table ' + TABEL + ' is available.', t.pos, t.len);
      }
      const bebas = !st.kolom;
      if (kw('WHERE')) { ambil(); st.adaWhere = true; st.where = parseOr(); }
      else if (bebas && !kw('ORDER') && !kw('LIMIT') && !kw('OFFSET') && !op(';') && lihat().t !== 'akhir') st.where = parseOr();
      if (kw('ORDER')) {
        ambil();
        harap(kw('BY'), 'Expected BY after ORDER.');
        do {
          if (st.urut.length) ambil();
          const t = lihat();
          let key;
          if (t.t === 'num') {
            ambil();
            const daftar = Array.isArray(st.kolom) ? st.kolom : null;
            if (!daftar || t.v < 1 || t.v > daftar.length || t.v % 1) throw new QueryError(daftar ? 'ORDER BY ' + t.v + ' is out of range of the SELECT list.' : 'ORDER BY by position needs an explicit SELECT column list.', t.pos, t.len);
            key = daftar[t.v - 1];
          } else key = namaKolom('ORDER BY supports column names or positions only.').key;
          let arah = 1;
          if (kw('ASC')) ambil(); else if (kw('DESC')) { ambil(); arah = -1; }
          let nulls = null;
          if (kw('NULLS')) { ambil(); nulls = kw('FIRST') ? 'first' : kw('LAST') ? 'last' : null; harap(nulls, 'Expected FIRST or LAST after NULLS.'); }
          st.urut.push({ key, arah, nulls });
        } while (op(','));
      }
      if (kw('LIMIT')) {
        ambil();
        const t = harap(lihat().t === 'num', 'LIMIT needs a number.');
        st.limit = Math.max(0, Math.floor(t.v));
      }
      if (kw('OFFSET')) {
        ambil();
        const t = harap(lihat().t === 'num', 'OFFSET needs a number.');
        st.offset = Math.max(0, Math.floor(t.v));
      }
      if (op(';')) ambil();
      if (lihat().t !== 'akhir') {
        const t = lihat();
        throw new QueryError(t.t === 'op' && t.v === ')' ? 'Unexpected closing parenthesis ).' : 'Unexpected "' + teksTok(t) + '". Missing AND or OR?', t.pos, t.len);
      }
      return st;
    }
    return { pernyataan };
  }
  const literal = n => n && (n.t === 'str' || n.t === 'num');

  // ---------- evaluator ----------
  function kompilasiNode(n) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': { const v = n.v; return () => v; }
      case 'null': return () => null;
      case 'col': { const k = n.key; return r => r[k]; }
      case 'and': {
        const fs = n.a.map(kompilasiNode);
        return r => { let nul = false; for (const f of fs) { const v = f(r); if (v === null) nul = true; else if (!jadiBool(v)) return false; } return nul ? null : true; };
      }
      case 'or': {
        const fs = n.a.map(kompilasiNode);
        return r => { let nul = false; for (const f of fs) { const v = f(r); if (v === null) nul = true; else if (jadiBool(v)) return true; } return nul ? null : false; };
      }
      case 'xor': {
        const fs = n.a.map(kompilasiNode);
        return r => { let x = false; for (const f of fs) { const v = f(r); if (v === null) return null; x = x !== jadiBool(v); } return x; };
      }
      case 'not': { const f = kompilasiNode(n.x); return r => { const v = f(r); return v === null ? null : !jadiBool(v); }; }
      case 'cmp': {
        const a = kompilasiNode(n.l);
        const b = kompilasiNode(n.r);
        const uji = { '=': c => c === 0, '<>': c => c !== 0, '<': c => c < 0, '<=': c => c <= 0, '>': c => c > 0, '>=': c => c >= 0 }[n.op];
        return r => { const c = bandingkan(a(r), b(r)); return c === null ? null : uji(c); };
      }
      case 'in': {
        const x = kompilasiNode(n.x);
        const list = n.list.map(kompilasiNode);
        return r => { const v = x(r); if (kosong(v)) return null; const ada = list.some(f => bandingkan(v, f(r)) === 0); return n.neg ? !ada : ada; };
      }
      case 'between': {
        const x = kompilasiNode(n.x);
        const lo = kompilasiNode(n.lo);
        const hi = kompilasiNode(n.hi);
        return r => { const v = x(r); const c1 = bandingkan(v, lo(r)); const c2 = bandingkan(v, hi(r)); if (c1 === null || c2 === null) return null; const ok = c1 >= 0 && c2 <= 0; return n.neg ? !ok : ok; };
      }
      case 'like': {
        const x = kompilasiNode(n.x);
        const p = kompilasiNode(n.pola);
        return r => { const v = teks(x(r)); const pola = teks(p(r)); if (v === null || pola === null) return null; const ok = polaLike(pola).test(v); return n.neg ? !ok : ok; };
      }
      case 'regex': {
        const x = kompilasiNode(n.x);
        const p = kompilasiNode(n.pola);
        const flag = n.peka ? '' : 'i';
        return r => {
          const v = teks(x(r));
          const pola = teks(p(r));
          if (v === null || pola === null) return null;
          let re;
          try { re = buatRegex(pola, flag); } catch (e) { return null; }
          const ok = re.test(v);
          return n.neg ? !ok : ok;
        };
      }
      case 'isnull': { const x = kompilasiNode(n.x); return r => kosong(x(r)) !== n.neg; }
      case 'concat': { const a = kompilasiNode(n.l); const b = kompilasiNode(n.r); return r => (teks(a(r)) || '') + (teks(b(r)) || ''); }
      case 'arith': {
        const a = kompilasiNode(n.l);
        const b = kompilasiNode(n.r);
        return r => {
          const u = angkaDari(a(r));
          const v = angkaDari(b(r));
          if (u === null || v === null) return null;
          switch (n.op) {
            case '+': return u + v;
            case '-': return u - v;
            case '*': return u * v;
            case '/': return v === 0 ? null : u / v;
            case '%': return v === 0 ? null : u % v;
          }
          return null;
        };
      }
      case 'fn': { const def = FUNGSI[n.nama]; const fs = n.args.map(kompilasiNode); return r => def.f(fs.map(f => f(r))); }
      case 'cast': {
        const x = kompilasiNode(n.x);
        if (n.tipe === 'text') return r => teks(x(r));
        if (n.tipe === 'angka') return r => angkaDari(x(r));
        return r => { const v = teks(x(r)); return v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null; };
      }
    }
    throw new Error('simpul tidak dikenal: ' + n.t);
  }

  // ---------- pencetak ----------
  const kutipSql = s => "'" + String(s).replace(/'/g, "''") + "'";
  const kutipKolom = s => '"' + String(s).replace(/"/g, '""') + '"';
  const NAMA_CAST = { text: 'text', angka: 'numeric', tanggal: 'date' };
  function prior(n) {
    switch (n.t) {
      case 'or': return 1;
      case 'xor': return 2;
      case 'and': return 3;
      case 'not': return 4;
      case 'cmp': case 'in': case 'between': case 'like': case 'regex': case 'isnull': return 5;
      case 'concat': return 6;
      case 'arith': return n.op === '+' || n.op === '-' ? 6 : 7;
    }
    return 9;
  }
  const isLogika = n => n.t === 'and' || n.t === 'or' || n.t === 'xor';
  const jorok = d => '    '.repeat(d);
  // rapi = satu kondisi per baris, AND/OR di awal baris, isi kurung menjorok
  function cetakSql(n, label, rapi, dalam) {
    dalam = dalam || 0;
    const c = (x, min) => { const s = cetakSql(x, label, rapi, dalam + 1); return prior(x) < min ? '(' + (rapi && isLogika(x) ? '\n' + jorok(dalam + 1) + s + '\n' + jorok(dalam) : s) + ')' : s; };
    const sambung = kata => (rapi ? '\n' + jorok(dalam) + kata + ' ' : ' ' + kata + ' ');
    const NOT = n.neg ? 'NOT ' : '';
    switch (n.t) {
      case 'num': return String(n.v);
      case 'str': return kutipSql(n.v);
      case 'bool': return n.v ? 'TRUE' : 'FALSE';
      case 'null': return 'NULL';
      case 'col': return kutipKolom(label[n.key] || n.key);
      case 'cast': return c(n.x, 9) + '::' + NAMA_CAST[n.tipe];
      case 'and': return n.a.map(x => c(x, 4)).join(sambung('AND'));
      case 'or': return n.a.map(x => c(x, 2)).join(sambung('OR'));
      case 'xor': return n.a.map(x => c(x, 3)).join(sambung('XOR'));
      case 'not': return 'NOT ' + c(n.x, 5);
      case 'cmp': return c(n.l, 6) + ' ' + n.op + ' ' + c(n.r, 6);
      case 'in': return c(n.x, 6) + ' ' + NOT + 'IN (' + n.list.map(x => c(x, 6)).join(', ') + ')';
      case 'between': return c(n.x, 6) + ' ' + NOT + 'BETWEEN ' + c(n.lo, 6) + ' AND ' + c(n.hi, 6);
      case 'like': return c(n.x, 6) + ' ' + NOT + 'ILIKE ' + c(n.pola, 6);
      case 'regex': return c(n.x, 6) + ' ' + (n.neg ? '!' : '') + '~' + (n.peka ? '' : '*') + ' ' + c(n.pola, 6);
      case 'isnull': return c(n.x, 6) + ' IS ' + NOT + 'NULL';
      case 'concat': return c(n.l, 6) + ' || ' + c(n.r, 7);
      case 'arith': { const p = prior(n); return c(n.l, p) + ' ' + n.op + ' ' + c(n.r, p + 1); }
      case 'fn': return n.nama.toLowerCase() + '(' + n.args.map(x => cetakSql(x, label)).join(', ') + ')';
    }
    return '';
  }
  // NOT di depan predikat dilebur: NOT x IS NULL -> x IS NOT NULL, NOT a = b -> a <> b
  function rapikan(n) {
    if (!n || typeof n !== 'object') return n;
    const m = { ...n };
    if (m.a) m.a = m.a.map(rapikan);
    for (const k of ['x', 'l', 'r', 'lo', 'hi', 'pola']) if (m[k]) m[k] = rapikan(m[k]);
    if (m.list) m.list = m.list.map(rapikan);
    if (m.args) m.args = m.args.map(rapikan);
    if (m.t === 'not') {
      const x = m.x;
      if (x.t === 'not') return x.x;
      if ('neg' in x) return { ...x, neg: !x.neg };
      if (x.t === 'cmp') {
        const balik = { '=': '<>', '<>': '=', '<': '>=', '>=': '<', '>': '<=', '<=': '>' };
        return { ...x, op: balik[x.op] };
      }
    }
    if ((m.t === 'and' || m.t === 'or') && m.a.some(c => c.t === m.t)) m.a = m.a.flatMap(c => (c.t === m.t ? c.a : [c]));
    return m;
  }
  const labelDari = kolomList => Object.fromEntries(kolomList.map(k => [k.key, k.label]));
  function cetak(ast, kolomList, rapi) {
    return cetakSql(rapikan(ast), labelDari(kolomList), rapi);
  }
  // pernyataan lengkap; tanpa SELECT/ORDER BY/LIMIT tetap ditulis sebagai kondisi saja
  function cetakPernyataan(st, kolomList, rapi) {
    const label = labelDari(kolomList);
    const kol = k => kutipKolom(label[k] || k);
    const bagian = [];
    if (st.kolom) {
      bagian.push('SELECT ' + (st.kolom === '*' ? '*' : st.kolom.map(kol).join(', ')));
      bagian.push('FROM ' + TABEL);
    }
    const lengkap = st.kolom || st.adaWhere || st.urut.length || st.limit !== null || st.offset !== null;
    if (st.where) {
      const where = rapikan(st.where);
      const turun = rapi && lengkap && isLogika(where);
      const w = cetakSql(where, label, rapi, turun ? 1 : 0);
      bagian.push(lengkap ? 'WHERE' + (turun ? '\n' + jorok(1) : ' ') + w : w);
    }
    if (st.urut.length) bagian.push('ORDER BY ' + st.urut.map(u => kol(u.key) + (u.arah < 0 ? ' DESC' : '') + (u.nulls ? ' NULLS ' + u.nulls.toUpperCase() : '')).join(', '));
    if (st.limit !== null) bagian.push('LIMIT ' + st.limit);
    if (st.offset !== null) bagian.push('OFFSET ' + st.offset);
    return bagian.join(rapi ? '\n' : ' ');
  }

  // ---------- API ----------
  const urai = (teksQ, kolomList) => pengurai(teksQ, kolomList).pernyataan();
  function compile(teksQ, kolomList) {
    const st = urai(teksQ, kolomList);
    const f = st.where ? kompilasiNode(st.where) : () => true;
    return { st, ast: st.where, nilai: f, uji: r => jadiBool(f(r)) };
  }
  // hanya kondisi (dipakai aturan sorot)
  function compileKondisi(teksQ, kolomList) {
    const c = compile(teksQ, kolomList);
    if (c.st.kolom || c.st.urut.length || c.st.limit !== null || c.st.offset !== null) throw new QueryError('Write a condition only here (no SELECT, ORDER BY, or LIMIT).', 0, teksQ.length);
    if (!c.ast) throw new QueryError('Write a condition, e.g. "Price Flag" = \'LOW\'.', 0, Math.max(1, teksQ.length));
    return c;
  }

  // ---------- filter kolom <-> AST ----------
  const nodeLit = (kol, v) => (kol.tipe === 'angka' && typeof v === 'number' ? { t: 'num', v } : { t: 'str', v: String(v) });
  function kondisiKeAst(kol, c) {
    const x = { t: 'col', key: kol.key };
    const teksOp = kol.tipe !== 'angka' && kol.tipe !== 'tanggal';
    if (teksOp) {
      const v = String(c.v1);
      const like = (pola, neg) => ({ t: 'like', x, pola: { t: 'str', v: pola }, neg });
      switch (c.op) {
        case 'eq': return adaWildcard(v) ? like(wildcardKeLike(v), false) : { t: 'cmp', op: '=', l: x, r: { t: 'str', v } };
        case 'ne': return adaWildcard(v) ? like(wildcardKeLike(v), true) : { t: 'cmp', op: '<>', l: x, r: { t: 'str', v } };
        case 'begins': return like(wildcardKeLike(v).replace(/%?$/, '%'), false);
        case 'nbegins': return like(wildcardKeLike(v).replace(/%?$/, '%'), true);
        case 'ends': return like(wildcardKeLike(v).replace(/^%?/, '%'), false);
        case 'nends': return like(wildcardKeLike(v).replace(/^%?/, '%'), true);
        case 'contains': return like(wildcardKeLike(v).replace(/^%?/, '%').replace(/%?$/, '%'), false);
        case 'ncontains': return like(wildcardKeLike(v).replace(/^%?/, '%').replace(/%?$/, '%'), true);
      }
    }
    const a = nodeLit(kol, c.v1);
    const peta = { eq: '=', ne: '<>', gt: '>', after: '>', ge: '>=', lt: '<', before: '<', le: '<=' };
    if (c.op === 'between') return { t: 'between', x, lo: a, hi: nodeLit(kol, c.v2), neg: false };
    return { t: 'cmp', op: peta[c.op] || '=', l: x, r: a };
  }
  function filterKeAst(kol, f) {
    const x = { t: 'col', key: kol.key };
    if (f.jenis === 'nilai') {
      const v = Array.from(f.set);
      const isi = v.filter(y => !kosong(y)).map(y => nodeLit(kol, y));
      const bagian = [];
      if (isi.length) bagian.push(isi.length === 1 ? { t: 'cmp', op: '=', l: x, r: isi[0] } : { t: 'in', x, list: isi, neg: false });
      if (v.some(kosong)) bagian.push({ t: 'isnull', x, neg: false });
      return bagian.length > 1 ? { t: 'or', a: bagian } : bagian[0];
    }
    const grup = [[]];
    f.kondisi.forEach((c, i) => {
      if (i > 0 && c.join === 'OR') grup.push([]);
      grup[grup.length - 1].push(kondisiKeAst(kol, c));
    });
    const g = grup.map(a => (a.length === 1 ? a[0] : { t: 'and', a }));
    return g.length === 1 ? g[0] : { t: 'or', a: g };
  }
  function gabungAnd(nodes) {
    const a = [];
    for (const n of nodes) { if (!n) continue; if (n.t === 'and') a.push(...n.a); else a.push(n); }
    return a.length ? (a.length === 1 ? a[0] : { t: 'and', a }) : null;
  }
  // AST sederhana -> filter kolom; null bila tidak bisa diwakili menu filter kolom
  function astKeFilter(ast, kolomList, nilaiUnik) {
    if (!ast) return null;
    const KOL = Object.fromEntries(kolomList.map(k => [k.key, k]));
    const konj = ast.t === 'and' ? ast.a : [ast];
    const hasil = {};
    for (const n of konj) {
      const r = predikatKeFilter(n, KOL, nilaiUnik);
      if (!r || hasil[r.key]) return null;
      hasil[r.key] = r.f;
    }
    return hasil;
  }
  function kolomDari(n) { return n.x && n.x.t === 'col' ? n.x.key : n.t === 'cmp' && n.l.t === 'col' && literal(n.r) ? n.l.key : null; }
  function predikatKeFilter(n, KOL, nilaiUnik) {
    // nilai: col = a / col IN (...) / (col IN (...) OR col IS NULL)
    const daftarNilai = m => {
      if (m.t === 'cmp' && m.op === '=' && m.l.t === 'col' && literal(m.r)) return { key: m.l.key, v: [m.r.v] };
      if (m.t === 'in' && !m.neg && m.x.t === 'col' && m.list.every(literal)) return { key: m.x.key, v: m.list.map(l => l.v) };
      if (m.t === 'isnull' && !m.neg && m.x.t === 'col') return { key: m.x.key, v: [''] };
      return null;
    };
    const anak = n.t === 'or' ? n.a : [n];
    const dn = anak.map(daftarNilai);
    // dicoba sebagai centang nilai dulu; kalau ada nilai yang tidak ada di data, jatuh ke kondisi
    if (dn.every(Boolean) && dn.every(d => d.key === dn[0].key)) {
      const key = dn[0].key;
      const unik = nilaiUnik(key);
      const set = new Set();
      let lengkap = true;
      for (const d of dn) for (const v of d.v) {
        if (v === '') { set.add(''); continue; }
        const cocok = unik.filter(u => bandingkan(u, v) === 0);
        if (!cocok.length) lengkap = false;
        cocok.forEach(u => set.add(u));
      }
      if (lengkap) return { key, f: { jenis: 'nilai', set } };
    }
    // kondisi: AND di dalam grup, OR antargrup
    const grup = n.t === 'or' ? n.a : [n];
    const kondisi = [];
    let key = null;
    for (const g of grup) {
      const isi = g.t === 'and' ? g.a : [g];
      for (let i = 0; i < isi.length; i++) {
        const c = predikatKeKondisi(isi[i], KOL);
        if (!c) return null;
        if (key && c.key !== key) return null;
        key = c.key;
        kondisi.push({ ...c.k, join: kondisi.length === 0 ? 'AND' : i === 0 ? 'OR' : 'AND' });
      }
    }
    return key ? { key, f: { jenis: 'kondisi', kondisi } } : null;
  }
  function predikatKeKondisi(n, KOL) {
    const key = kolomDari(n);
    const kol = key && KOL[key];
    if (!kol) return null;
    const teksOp = kol.tipe !== 'angka' && kol.tipe !== 'tanggal';
    if (n.t === 'like' && n.pola.t === 'str' && teksOp) {
      const p = n.pola.v;
      const isi = p.replace(/^%/, '').replace(/%$/, '');
      const polos = !/(^|[^\\])[%_]/.test(isi);
      const w = likeKeWildcard(isi);
      if (polos && p.length > 1 && p.startsWith('%') && p.endsWith('%')) return { key, k: { op: n.neg ? 'ncontains' : 'contains', v1: w } };
      if (polos && p.endsWith('%') && !p.startsWith('%')) return { key, k: { op: n.neg ? 'nbegins' : 'begins', v1: w } };
      if (polos && p.startsWith('%') && !p.endsWith('%')) return { key, k: { op: n.neg ? 'nends' : 'ends', v1: w } };
      return { key, k: { op: n.neg ? 'ne' : 'eq', v1: likeKeWildcard(p) } };
    }
    if (n.t === 'cmp' && literal(n.r)) {
      const v = n.r.v;
      if (teksOp) {
        if (n.op === '=') return { key, k: { op: 'eq', v1: escWildcard(v) } };
        if (n.op === '<>') return { key, k: { op: 'ne', v1: escWildcard(v) } };
        return null;
      }
      if (kol.tipe === 'angka' && typeof v !== 'number') return null;
      if (kol.tipe === 'tanggal' && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return null;
      const op = kol.tipe === 'tanggal' ? { '=': 'eq', '<>': 'ne', '>': 'after', '<': 'before' }[n.op] : { '=': 'eq', '<>': 'ne', '>': 'gt', '>=': 'ge', '<': 'lt', '<=': 'le' }[n.op];
      return op ? { key, k: { op, v1: v } } : null;
    }
    if (n.t === 'between' && !n.neg && !teksOp && literal(n.lo) && literal(n.hi)) return { key, k: { op: 'between', v1: n.lo.v, v2: n.hi.v } };
    return null;
  }

  const DAFTAR_FUNGSI = Object.keys(FUNGSI).map(nama => ({ nama, ket: FUNGSI[nama].ket }))
    .concat([{ nama: 'REGEXP_LIKE', ket: "regex match; flag 'c' = case-sensitive" }, { nama: 'CAST', ket: 'convert type: CAST(x AS text)' }, { nama: 'POSITION', ket: "POSITION('text' IN \"Column\")" }]);

  const api = {
    QueryError, TABEL, compile, compileKondisi, urai, cetak, cetakPernyataan, filterKeAst, astKeFilter, gabungAnd,
    polaWildcard, fungsi: () => DAFTAR_FUNGSI, setMirip: f => { mirip = f; }
  };
  root.SkpkQuery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
