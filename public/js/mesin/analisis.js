/*
 * SKPK prototipe To-Be: hitungan analisis untuk perluasan temuan.
 * - kemiripan uraian barang (TF-IDF + kosinus) untuk "barang serupa" dan fungsi SIMILAR() di query
 * - kelompok uraian yang memakai lebih dari satu HS code ("Beda HS")
 * - pivot sederhana gaya PivotTable
 * - riwayat penetapan: Assessed (tarif terkunci), perluasan temuan audit/penul, dan perluasan notul PFPD per jenis koreksi
 */
(function (root) {
  'use strict';

  const D = root.SKPK_DATA;
  const ROWS = D.ROWS;
  const P = D.P;

  // ---------- normalisasi uraian ----------
  const KATA_UMUM = new Set(['OF', 'AND', 'WITH', 'THE', 'FOR', 'IN', 'TO', 'ON', 'BY', 'DAN', 'DENGAN', 'UNTUK', 'YANG', 'DARI', 'X', 'MM', 'PCS', 'NO', 'TYPE', 'SIZE', 'GRADE']);
  function token(s) {
    if (!s) return [];
    return String(s).toUpperCase().split(/[^A-Z0-9.]+/)
      .map(t => t.replace(/^\.+|\.+$/g, ''))
      .filter(t => t && !KATA_UMUM.has(t) && !(t.length === 1 && !/\d/.test(t)));
  }
  const kunciUraian = s => token(s).join(' ');

  // ---------- indeks TF-IDF atas uraian unik ----------
  const uraianUnik = new Map();
  for (const r of ROWS) {
    const u = r[P.uraian] || '';
    if (!uraianUnik.has(u)) uraianUnik.set(u, []);
    uraianUnik.get(u).push(r.id);
  }
  const df = new Map();
  for (const u of uraianUnik.keys()) for (const t of new Set(token(u))) df.set(t, (df.get(t) || 0) + 1);
  const N = uraianUnik.size;
  const idf = t => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
  const cacheVek = new Map();
  function vektor(s) {
    let v = cacheVek.get(s);
    if (v) return v;
    const tf = new Map();
    for (const t of token(s)) tf.set(t, (tf.get(t) || 0) + 1);
    v = new Map();
    let norma = 0;
    for (const [t, n] of tf) { const w = (1 + Math.log(n)) * idf(t); v.set(t, w); norma += w * w; }
    norma = Math.sqrt(norma) || 1;
    for (const [t, w] of v) v.set(t, w / norma);
    if (cacheVek.size > 20000) cacheVek.clear();
    cacheVek.set(s, v);
    return v;
  }
  function mirip(a, b) {
    const x = vektor(a);
    const y = vektor(b);
    let s = 0;
    const [kecil, besar] = x.size < y.size ? [x, y] : [y, x];
    for (const [t, w] of kecil) { const u = besar.get(t); if (u) s += w * u; }
    return Math.round(Math.min(1, s) * 1000) / 1000;
  }
  // indeks terbalik token -> uraian unik
  const indeksToken = new Map();
  for (const u of uraianUnik.keys()) for (const t of new Set(token(u))) {
    if (!indeksToken.has(t)) indeksToken.set(t, []);
    indeksToken.get(t).push(u);
  }

  // seri lain yang uraiannya mirip, diringkas per (uraian, HS, importir) supaya seri kembar tidak membanjiri daftar;
  // kelompok dengan HS berbeda didahulukan karena itu bahan perluasan temuan
  function serupa(r, batas, ambang) {
    const asal = r[P.uraian] || '';
    const calon = new Set();
    for (const t of new Set(token(asal))) for (const u of indeksToken.get(t) || []) calon.add(u);
    const grup = new Map();
    let total = 0;
    let bedaHs = 0;
    const importir = new Set();
    for (const u of calon) {
      const s = mirip(asal, u);
      if (s < ambang) continue;
      for (const id of uraianUnik.get(u)) {
        if (id === r.id) continue;
        const y = ROWS[id];
        const beda = y[P.hs] !== r[P.hs];
        total++;
        if (beda) bedaHs++;
        importir.add(y[P.npwp9]);
        const k = u + '|' + y[P.hs] + '|' + y[P.npwp9];
        const g = grup.get(k);
        if (!g) grup.set(k, { id, skor: s, bedaHs: beda, n: 1 });
        else { g.n++; if (y[P.tanggal] > ROWS[g.id][P.tanggal]) g.id = id; }
      }
    }
    const daftar = Array.from(grup.values()).sort((a, b) => b.bedaHs - a.bedaHs || b.skor - a.skor || b.n - a.n);
    return { daftar: daftar.slice(0, batas), kelompok: daftar.length, total, bedaHs, importir: importir.size };
  }

  // ---------- Beda HS: uraian sama (setelah normalisasi) tapi HS code lebih dari satu ----------
  function bedaHs(rows) {
    const grup = new Map();
    for (const r of rows) {
      const k = kunciUraian(r[P.uraian]);
      if (!k) continue;
      let g = grup.get(k);
      if (!g) { g = { kunci: k, contoh: r[P.uraian], hs: new Map(), tarif: new Set(), npwp: new Set(), uraian: new Set(), seri: 0, nilai: 0 }; grup.set(k, g); }
      g.hs.set(r[P.hs], (g.hs.get(r[P.hs]) || 0) + 1);
      if (r[P.tarif] !== null && r[P.tarif] !== undefined) g.tarif.add(r[P.tarif]);
      g.npwp.add(r[P.npwp9]);
      g.uraian.add(r[P.uraian]);
      g.seri++;
      g.nilai += r[P.nilai] || 0;
    }
    return Array.from(grup.values()).filter(g => g.hs.size > 1)
      .map(g => ({ ...g, hs: Array.from(g.hs).sort((a, b) => b[1] - a[1]), tarif: Array.from(g.tarif).sort((a, b) => a - b) }))
      .sort((a, b) => b.seri - a.seri);
  }

  // ---------- pivot ----------
  const UKURAN = [
    { key: 'seri', label: 'Items' },
    { key: 'pib', label: D.DOK.satuan },
    { key: 'npwp', label: 'NPWP' },
    { key: 'nilai', label: D.DOK.peran.nilai },
    { key: 'harga', label: 'Median Price/kg' }
  ];
  function median(xs) {
    if (!xs.length) return null;
    const s = xs.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function ukur(rows) {
    const pib = new Set();
    const npwp = new Set();
    const harga = [];
    let nilai = 0;
    for (const r of rows) {
      pib.add(r[P.aju]);
      npwp.add(r[P.npwp9]);
      nilai += r[P.nilai] || 0;
      if (r.price_per_kg > 0) harga.push(r.price_per_kg);
    }
    return { seri: rows.length, pib: pib.size, npwp: npwp.size, nilai, harga: median(harga) };
  }
  function kelompokkan(rows, key) {
    const m = new Map();
    for (const r of rows) {
      const v = r[key] === undefined || r[key] === '' ? null : r[key];
      if (!m.has(v)) m.set(v, []);
      m.get(v).push(r);
    }
    return m;
  }
  function pivot(rows, d1, d2, urut) {
    const banding = (a, b) => {
      const x = a.ukuran[urut.key];
      const y = b.ukuran[urut.key];
      return ((x === null) - (y === null)) || (x - y) * urut.arah;
    };
    const baris = [];
    for (const [v, rs] of kelompokkan(rows, d1)) {
      const b = { nilai: v, ukuran: ukur(rs), anak: null };
      if (d2) b.anak = Array.from(kelompokkan(rs, d2), ([v2, rs2]) => ({ nilai: v2, ukuran: ukur(rs2) })).sort(banding);
      baris.push(b);
    }
    baris.sort(banding);
    return { total: ukur(rows), baris };
  }

  // ---------- kolom flag: HS Flag, Audit Flag, Penul Flag (Price Flag dihitung di data.js) ----------
  // HS Flag atas seluruh populasi, kelompok = uraian setelah normalisasi (sama dengan Beda HS).
  // HS acuan = HS terbanyak di kelompok (seri: tarif lebih tinggi); r.hsRef dipakai panel detail.
  const modus = m => { let k = null; let n = -1; for (const [v, c] of m) if (c > n || (c === n && v > k)) { k = v; n = c; } return k; };
  const grupUraian = new Map();
  for (const r of ROWS) {
    const k = kunciUraian(r[P.uraian]);
    r.hs_flag = null;
    r.hsRef = null;
    if (!k) continue;
    if (!grupUraian.has(k)) grupUraian.set(k, []);
    grupUraian.get(k).push(r);
  }
  for (const rs of grupUraian.values()) {
    const perHs = new Map();
    for (const r of rs) {
      let h = perHs.get(r[P.hs]);
      if (!h) { h = { n: 0, tarif: new Map() }; perHs.set(r[P.hs], h); }
      h.n++;
      if (typeof r[P.tarif] === 'number') h.tarif.set(r[P.tarif], (h.tarif.get(r[P.tarif]) || 0) + 1);
    }
    if (perHs.size < 2) continue;
    for (const h of perHs.values()) h.tarifUmum = modus(h.tarif);
    const [acuan, a] = Array.from(perHs).sort((x, y) => y[1].n - x[1].n || (y[1].tarifUmum ?? -1) - (x[1].tarifUmum ?? -1))[0];
    for (const r of rs) {
      r.hsRef = { hs: acuan, n: a.n, total: rs.length, jumlahHs: perHs.size, tarif: a.tarifUmum };
      if (r[P.hs] === acuan) r.hs_flag = 'MIXED';
      else r.hs_flag = typeof r[P.tarif] === 'number' && a.tarifUmum !== null && r[P.tarif] < a.tarifUmum ? 'LOWER DUTY' : 'MISMATCH';
    }
  }

  // ---------- riwayat penetapan (public/js/riwayat.js): Audit Flag, Penul Flag, Assessed, Expansion Ref ----------
  // perluasan temuan: baris yang uraiannya mirip (>= AMBANG_TEMUAN) dan HS pemberitahuannya sama dengan HS asal salah satu
  // temuan audit/penul. Baris yang tarifnya sudah ditetapkan (temuan audit/penul dan notul salah tarif) bukan calon.
  // temuan = [{ uraian, hs, batch, baris }]; hasil: id -> { batch, baris, skor } dengan skor tertinggi
  const AMBANG_TEMUAN = 0.8;
  const R = root.SkpkRiwayat;
  function flagMirip(temuan, kecuali) {
    const hasil = new Map();
    for (const t of temuan) {
      const asal = t.uraian || '';
      if (!asal || !t.hs) continue;
      const calon = new Set();
      for (const tk of new Set(token(asal))) for (const u of indeksToken.get(tk) || []) calon.add(u);
      for (const u of calon) {
        const s = mirip(asal, u);
        if (s < AMBANG_TEMUAN) continue;
        for (const id of uraianUnik.get(u)) {
          if (kecuali.has(id) || ROWS[id][P.hs] !== t.hs) continue;
          const lama = hasil.get(id);
          if (!lama || s > lama.skor) hasil.set(id, { batch: t.batch, baris: t.baris, skor: s });
        }
      }
    }
    return hasil;
  }
  const fmtHs = s => (/^\d{8}$/.test(s || '') ? s.slice(0, 4) + '.' + s.slice(4, 6) + '.' + s.slice(6) : s || '?');

  // ---------- kluster temuan: dasar saran tema ----------
  // satu LHA/LHPU memuat banyak jenis barang, jadi anchor perluasan adalah satu temuan (uraian barangnya), bukan satu LHA.
  // Temuan dengan uraian mirip (>= AMBANG_KLUSTER) dan penetapan sama digabung lintas LHA/LHPU/SPTNP supaya saran tidak meledak:
  // audit/penul per HS penetapan, notul per jenis koreksi + HS penetapan.
  const AMBANG_KLUSTER = 0.8;
  let KLUSTER = [];
  let klusterTemuan = new Map();
  // nama kluster: 3 kata paling khas (bobot TF-IDF) dari uraian anchor, urut sesuai uraian, ditambah angka murni pertama
  // (biasanya grade, mis. FLAT BAR 304 vs 201; SUS 301 H 0.2 X 110 -> 301, bukan 110). Ukuran (0.25, 330MM, 30UM, 520MMX90MM)
  // dibuang: khas tetapi bukan nama barang. Kode campuran seperti SUS304 tetap kata biasa.
  const UKURAN_KATA = /\d[.,]\d|\d(MM|CM|UM|MTR|M|KGS?|GR?|TON|INCH|IN)\b|\dX\d|\d(MM|CM|UM)X/;
  function namaKluster(uraian) {
    const v = vektor(uraian);
    const urut = token(uraian).filter(t => !UKURAN_KATA.test(t));
    const kata = Array.from(new Set(urut.filter(t => !/^\d+$/.test(t)))).sort((a, b) => (v.get(b) || 0) - (v.get(a) || 0)).slice(0, 3);
    // grade = 3-4 digit tanpa nol depan (201, 304, 316, 430); 0, 9, 026 hanyalah sisa ukuran atau nomor
    const angkaPertama = urut.find(t => /^[1-9]\d{2,3}$/.test(t));
    if (angkaPertama) kata.push(angkaPertama);
    const pilih = new Set(kata);
    const hasil = [];
    for (const t of urut) if (pilih.has(t) && !hasil.includes(t)) hasil.push(t);
    return hasil.join(' ') || String(uraian).slice(0, 30).toUpperCase();
  }
  function bangunKluster() {
    KLUSTER = [];
    klusterTemuan = new Map();
    const perKunci = new Map();
    for (const b of R.semua()) {
      for (const x of b.baris) {
        const y = x.rowId === null || x.rowId === undefined ? null : ROWS[x.rowId];
        const uraian = x.uraian || (y && y[P.uraian]) || '';
        if (!uraian) continue;
        const sumber = b.jenis === 'notul' ? 'notul' : 'temuan';
        for (const jenis of sumber === 'notul' ? x.koreksi || [] : ['tarif']) {
          const kunci = sumber + '|' + jenis + '|' + (x.hsTetap || '');
          if (!perKunci.has(kunci)) perKunci.set(kunci, []);
          const daftar = perKunci.get(kunci);
          let k = daftar.find(c => mirip(c.uraian, uraian) >= AMBANG_KLUSTER);
          if (!k) {
            k = { id: 'k' + KLUSTER.length, sumber, jenis, hsTetap: x.hsTetap || null, hsAsal: x.hsAsal || (y && y[P.hs]) || null, uraian, temuan: [], ref: new Map(), jenisBatch: new Set() };
            daftar.push(k);
            KLUSTER.push(k);
          }
          k.temuan.push({ batch: b, baris: x, uraian });
          k.jenisBatch.add(b.jenis);
          // nomor dokumen penetapan per jenis: LHA (audit), LHPU (penul), SPTNP (notul)
          const nama = R.JENIS[b.jenis].ref;
          if (!k.ref.has(nama)) k.ref.set(nama, new Set());
          k.ref.get(nama).add(R.refBaris(b, sumber === 'notul' ? x : null));
          if (!klusterTemuan.has(x)) klusterTemuan.set(x, {});
          klusterTemuan.get(x)[jenis] = k;
        }
      }
    }
    // label unik = nilai kolom Expansion Ref / Notul Expansion, mis. "STAINLESS STEEL SUS → 7220.20.90"
    const terpakai = new Map();
    for (const k of KLUSTER) {
      k.nama = namaKluster(k.uraian);
      const dasar = (k.sumber === 'notul' ? 'NOTUL ' + R.LABEL_KOREKSI[k.jenis] + ' · ' : '') + k.nama + ' → ' + fmtHs(k.hsTetap);
      const n = (terpakai.get(dasar) || 0) + 1;
      terpakai.set(dasar, n);
      k.label = n > 1 ? dasar + ' (' + n + ')' : dasar;
    }
  }
  const klusterDari = (baris, jenis) => (klusterTemuan.get(baris) || {})[jenis] || null;
  // label kelompok saran = nilai kolom Expansion Ref: nama kluster temuan, mis. "STAINLESS STEEL SUS → 7220.20.90"
  const labelSaran = ref => { const k = klusterDari(ref.baris, 'tarif'); return k ? k.label : R.refBaris(ref.batch) + ' → ' + fmtHs(ref.baris.hsTetap); };
  const FLAG = { audit: { temuan: new Set(), ada: true, jumlah: 0 }, penul: { temuan: new Set(), ada: true, jumlah: 0 } };

  // ---------- perluasan notul PFPD: barang sejenis yang kemungkinan salah dengan cara yang sama ----------
  // ambang kemiripan uraian per jenis koreksi, dan selisih (10%) untuk harga dan berat per satuan.
  // Tarif 0,75: uraian di database notul sering berbeda sedikit (salah ketik, spasi) dari pemberitahuan lain yang sama
  const AMBANG_NOTUL = { tarif: 0.75, nilai: 0.7, jumlah: 0.7, jenis: 0.8, selisih: 0.1 };
  const KD_SAT = D.kunci('Kd Sat Hrg');
  const SATUAN_BERAT = /^(KGM|KG|TNE|GRM|GR|MGM)$/i;
  const PEMASOK = D.kunci('Nm Pemasok');
  const bagi = (a, b) => (typeof a === 'number' && typeof b === 'number' && b > 0 ? a / b : null);
  const daftarKode = v => String(v === null || v === undefined ? '' : v).split(/[,;\s]+/).filter(Boolean);
  // label kelompok saran notul = nilai kolom Notul Expansion: nama kluster, mis. "NOTUL NILAI · STAINLESS STEEL SUS → 7220.20.90"
  const labelNotul = ref => { const k = klusterDari(ref.baris, ref.jenis); return k ? k.label : 'NOTUL ' + R.LABEL_KOREKSI[ref.jenis] + ' ' + R.refBaris(ref.batch, ref.baris); };
  function cariMirip(asal, ambang, cb) {
    const calon = new Set();
    for (const tk of new Set(token(asal))) for (const u of indeksToken.get(tk) || []) calon.add(u);
    for (const u of calon) {
      const s = mirip(asal, u);
      if (s >= ambang) for (const id of uraianUnik.get(u)) cb(ROWS[id], s);
    }
  }
  // satu seri notul dengan jenis koreksi -> syarat calon (selain uraian mirip) dan keterangan indikatornya
  // tarif : HS pemberitahuan sama, tarif BM-nya di bawah tarif penetapan (atau HS-nya diubah); fasilitas dicabut = calon memakai fasilitas itu
  // nilai : HS dan satuan sama, harga satuan di bawah harga penetapan - 10%; bila harga seri tidak berubah, di bawah harga yang ditolak + 10%
  // jumlah: HS dan satuan sama, berat per satuan (satuan berat: harga per satuan) lebih dekat ke pola pemberitahuan yang dikoreksi daripada pola penetapan
  // jenis : uraian mirip dengan uraian pemberitahuan yang salah, HS bebas
  function aturanNotul(jenis, x, hs, kunci) {
    const ind = x.ind || {};
    const satuanSama = r => !ind.satuan || !KD_SAT || r[KD_SAT] === ind.satuan;
    if (jenis === 'tarif') {
      const ubahHs = x.hsTetap && hs && x.hsTetap !== hs;
      const naik = typeof x.tarifTetap === 'number' && (typeof x.tarifAsal !== 'number' || x.tarifTetap > x.tarifAsal);
      const fas = ind.fasCabut || [];
      if (!hs || !(ubahHs || naik || fas.length)) return null;
      return {
        syarat: r => !kunci.has(r.id) && r[P.hs] === hs && (ubahHs || typeof r[P.tarif] !== 'number' || typeof x.tarifTetap !== 'number' || r[P.tarif] < x.tarifTetap) &&
          (!fas.length || daftarKode(r[P.fasilitas]).some(k => fas.includes(k))),
        info: { hsAsal: hs, hsTetap: x.hsTetap, tarifAsal: x.tarifAsal, tarifTetap: x.tarifTetap, fasCabut: fas }
      };
    }
    if (jenis === 'nilai') {
      const adaTetap = ind.hargaTetap && ind.hargaDekl && ind.hargaTetap > ind.hargaDekl * 1.01;
      const batas = adaTetap ? ind.hargaTetap * (1 - AMBANG_NOTUL.selisih) : ind.hargaDekl ? ind.hargaDekl * (1 + AMBANG_NOTUL.selisih) : null;
      if (!batas || !hs) return null;
      return {
        syarat: r => r[P.hs] === hs && satuanSama(r) && r.price_per_unit > 0 && r.price_per_unit < batas,
        info: { batas, hargaDekl: ind.hargaDekl, hargaTetap: adaTetap ? ind.hargaTetap : null, satuan: ind.satuan }
      };
    }
    if (jenis === 'jumlah') {
      // satuan berat (KGM): berat per satuan selalu 1, jadi polanya harga per satuan (jumlah dikoreksi = harga per satuan berubah)
      const berat = SATUAN_BERAT.test(ind.satuan || '');
      const wD = berat ? ind.hargaDekl : ind.beratDekl;
      const wT = berat ? ind.hargaTetap : ind.beratTetap;
      const ukur = berat ? r => (r.price_per_unit > 0 ? r.price_per_unit : null) : r => bagi(r[P.netto], r[P.jumlah]);
      if (!wD || !hs) return null;
      const adaTetap = wT && Math.abs(wT - wD) / wT > AMBANG_NOTUL.selisih;
      return {
        syarat: r => {
          if (r[P.hs] !== hs || !satuanSama(r)) return false;
          const w = ukur(r);
          if (!w) return false;
          return adaTetap ? Math.abs(w - wD) < Math.abs(w - wT) && Math.abs(w - wT) / wT > AMBANG_NOTUL.selisih : Math.abs(w - wD) / wD <= AMBANG_NOTUL.selisih;
        },
        info: { pola: berat ? 'harga' : 'berat', dekl: wD, tetap: adaTetap ? wT : null, satuan: ind.satuan }
      };
    }
    // jenis: uraian pemberitahuan yang salah dipakai sebagai kata kunci
    if (!ind.uraianDekl && !x.uraian) return null;
    return { syarat: () => true, uraian: ind.uraianDekl || x.uraian, info: { uraianDekl: ind.uraianDekl || x.uraian, uraianTetap: ind.uraianTetap, hsTetap: x.hsTetap, pemasok: ind.pemasok } };
  }
  // hasil: id baris populasi -> { jenis -> ref terbaik }; ref = { jenis, batch, baris, skor, sama (importir sama), pemasok, potensi, info }
  function perluasanNotul(kunci) {
    const hasil = new Map();
    for (const b of R.semua()) {
      if (b.jenis !== 'notul') continue;
      for (const x of b.baris) {
        if (!x.koreksi || !x.koreksi.length) continue;
        const asal = x.rowId === null || x.rowId === undefined ? null : ROWS[x.rowId];
        const npwp = x.npwp9 || (asal ? String(asal[P.npwp9] || '') : '');
        const hs = x.hsAsal || (asal && asal[P.hs]) || null;
        for (const jenis of x.koreksi) {
          const a = aturanNotul(jenis, x, hs, kunci);
          const uraian = (a && a.uraian) || x.uraian || (asal && asal[P.uraian]);
          if (!a || !uraian) continue;
          cariMirip(uraian, AMBANG_NOTUL[jenis], (r, s) => {
            if (r.id === x.rowId || (r.notulJenis && r.notulJenis.includes(jenis)) || !a.syarat(r)) return;
            const sama = !!npwp && String(r[P.npwp9] || '') === npwp;
            const ref = {
              jenis, batch: b, baris: x, skor: s, sama, pemasok: !!(a.info.pemasok && PEMASOK && r[PEMASOK] === a.info.pemasok), info: a.info,
              potensi: jenis === 'nilai' && a.info.hargaTetap ? Math.max(0, (a.info.hargaTetap - r.price_per_unit) * (r[P.jumlah] || 0)) : null
            };
            let per = hasil.get(r.id);
            if (!per) { per = {}; hasil.set(r.id, per); }
            const lama = per[jenis];
            if (!lama || ref.sama > lama.sama || (ref.sama === lama.sama && ref.skor > lama.skor)) per[jenis] = ref;
          });
        }
      }
    }
    return hasil;
  }

  // dihitung saat muat dan setiap kali batch riwayat ditambah atau dihapus.
  // Assessed = riwayat yang mengunci tarif (audit, penul, notul salah tarif): dibuang oleh Exclude assessed dan bukan calon perluasan.
  // Notul salah nilai/jumlah/jenis tidak mengunci tarif; seri itu masih boleh ditetapkan tarifnya.
  function hitungRiwayat() {
    bangunKluster();
    const kecuali = new Set();
    const L = R.LABEL_KOREKSI;
    for (const r of ROWS) {
      const d = R.untukBaris(r.id);
      const kunci = d.filter(x => R.terkunci(x.batch, x.baris));
      const notul = d.filter(x => x.batch.jenis === 'notul');
      r.riwayat = d.length ? d : null;
      r.terkunci = kunci.length ? kunci : null;
      r.assessed = kunci.length ? Array.from(new Set(kunci.map(x => (x.batch.jenis === 'notul' ? 'NOTUL TARIF' : x.batch.jenis.toUpperCase())))).join(', ') : null;
      r.assessed_ref = kunci.length ? Array.from(new Set(kunci.map(x => R.refBaris(x.batch, x.baris)))).join(', ') : null;
      r.notulJenis = R.KOREKSI.filter(k => notul.some(x => (x.baris.koreksi || []).includes(k)));
      // NOT LISTED = ada di SPTNP, tetapi seri ini tidak tercantum di kolom Salah Tarif/Nilai/Jumlah/Jenis
      r.notul = notul.length ? r.notulJenis.map(k => L[k]).join(', ') || 'NOT LISTED' : null;
      const h = R.notulImportir(r[P.npwp9]);
      r.importerNotul = h;
      r.importer_notul = h ? R.KOREKSI.filter(k => h[k]).map(k => L[k]).join(', ') || 'NOT LISTED' : null;
      if (kunci.length) kecuali.add(r.id);
    }
    const cocok = {};
    for (const jenis of Object.keys(FLAG)) {
      const temuan = [];
      FLAG[jenis].temuan = new Set();
      for (const b of R.semua()) {
        if (b.jenis !== jenis) continue;
        for (const x of b.baris) {
          const y = x.rowId === null ? null : ROWS[x.rowId];
          if (y) FLAG[jenis].temuan.add(y.id);
          temuan.push({ uraian: x.uraian || (y && y[P.uraian]), hs: x.hsAsal || (y && y[P.hs]), batch: b, baris: x });
        }
      }
      cocok[jenis] = flagMirip(temuan, kecuali);
      FLAG[jenis].jumlah = cocok[jenis].size;
    }
    const notulCocok = perluasanNotul(kecuali);
    for (const r of ROWS) {
      const a = cocok.audit.get(r.id) || null;
      const p = cocok.penul.get(r.id) || null;
      r.audit_flag = a ? 'Yes' : 'No';
      r.penul_flag = p ? 'Yes' : 'No';
      r.auditRef = a;
      r.penulRef = p;
      // satu baris satu kelompok saran: temuan paling mirip (audit menang bila sama)
      r.expRef = a && (!p || a.skor >= p.skor) ? a : p;
      r.expansion_ref = r.expRef ? labelSaran(r.expRef) : null;
      // notul: kelompok saran = jenis terkuat (tarif > nilai > jumlah > jenis); semua jenis yang cocok di Notul Expansion Type
      const per = notulCocok.get(r.id) || null;
      const jenis = per ? R.KOREKSI.filter(k => per[k]) : [];
      r.notulRefs = per;
      r.notulExp = jenis.length ? per[jenis[0]] : null;
      r.notul_expansion = r.notulExp ? labelNotul(r.notulExp) : null;
      r.notul_expansion_type = jenis.length ? jenis.map(k => R.LABEL_KOREKSI[k]).join(', ') : null;
    }
  }
  hitungRiwayat();
  // kelompok saran tema = satu kluster temuan: baris dengan Expansion Ref (audit/penul) atau Notul Expansion yang sama; terbesar dulu.
  // jenisBatch = sumber temuan di kluster (audit, penul, notul); ref = nomor LHA/LHPU/SPTNP-nya
  function kelompokSaran() {
    const m = new Map();
    for (const r of ROWS) {
      if (r.expansion_ref) {
        let g = m.get(r.expansion_ref);
        if (!g) {
          const k = klusterDari(r.expRef.baris, 'tarif');
          g = { label: r.expansion_ref, kolom: 'expansion_ref', kluster: k, sumber: r.expRef.batch.jenis, batch: r.expRef.batch, hsTetap: r.expRef.baris.hsTetap, hsAsal: r.expRef.baris.hsAsal || r[P.hs], ids: [], skor: 0 };
          m.set(r.expansion_ref, g);
        }
        g.ids.push(r.id);
        g.skor = Math.max(g.skor, r.expRef.skor);
      }
      if (r.notul_expansion) {
        const ref = r.notulExp;
        let g = m.get(r.notul_expansion);
        if (!g) {
          g = { label: r.notul_expansion, kolom: 'notul_expansion', kluster: klusterDari(ref.baris, ref.jenis), sumber: 'notul', jenis: ref.jenis, batch: ref.batch, baris: ref.baris, info: ref.info, hsTetap: ref.baris.hsTetap, hsAsal: ref.info.hsAsal || ref.baris.hsAsal, ids: [], skor: 0, sama: 0, pemasok: 0, potensi: 0 };
          m.set(r.notul_expansion, g);
        }
        g.ids.push(r.id);
        g.skor = Math.max(g.skor, ref.skor);
        if (ref.sama) g.sama++;
        if (ref.pemasok) g.pemasok++;
        if (ref.potensi) g.potensi += ref.potensi;
      }
    }
    return Array.from(m.values()).sort((a, b) => b.ids.length - a.ids.length);
  }

  // ---------- perluasan tema: anchor = uraian item tema yang sudah dinamai dan dianalisa ----------
  // calon = baris lain dengan uraian mirip (>= ambang) dengan salah satu item; HS tidak disyaratkan, hanya digolongkan:
  // sama (HS sama dengan salah satu item), pos (4 digit pertama sama), lain. Hasil: id -> { skor, anchor (id item), hs }
  const PERINGKAT_HS = { sama: 0, pos: 1, lain: 2 };
  function anchorTema(ids) {
    const m = new Map();
    for (const id of ids) {
      const u = ROWS[id][P.uraian] || '';
      if (!u) continue;
      if (!m.has(u)) m.set(u, []);
      m.get(u).push(id);
    }
    return m;
  }
  function perluasanTema(ids, ambang) {
    const dalam = new Set(ids);
    const hsItem = new Set(ids.map(id => String(ROWS[id][P.hs] || '')));
    const posItem = new Set(Array.from(hsItem, h => h.slice(0, 4)));
    const hasil = new Map();
    for (const [asal, aIds] of anchorTema(ids)) {
      cariMirip(asal, ambang, (r, s) => {
        if (dalam.has(r.id)) return;
        const h = String(r[P.hs] || '');
        const hs = hsItem.has(h) ? 'sama' : posItem.has(h.slice(0, 4)) ? 'pos' : 'lain';
        const lama = hasil.get(r.id);
        if (!lama || s > lama.skor || (s === lama.skor && PERINGKAT_HS[hs] < PERINGKAT_HS[lama.hs])) hasil.set(r.id, { skor: s, anchor: aIds[0], hs });
      });
    }
    return hasil;
  }
  // kemiripan tertinggi satu uraian (mis. uraian temuan) dengan item tema; anchor = Map uraian -> ids dari anchorTema
  function miripTema(uraian, anchor) {
    let terbaik = { skor: 0, anchor: null };
    if (!uraian) return terbaik;
    for (const [u, aIds] of anchor) {
      const s = mirip(uraian, u);
      if (s > terbaik.skor) terbaik = { skor: s, anchor: aIds[0] };
    }
    return terbaik;
  }
  // ---------- Find similar: barang yang mirip dengan sekumpulan anchor, aturannya menurut resep ----------
  // anchor = { sumber ('audit'|'penul'|'notul'|'tema'|'data'|'teks'), uraian, hsAsal, rowId, npwp9, pemasok, koreksi, hargaTetap, satuan }.
  // Resep otomatis memilih aturan dari jenis anchor: temuan audit/penul dan notul tarif = salah pos (HS pemberitahuan sama),
  // notul nilai = harga terlalu murah, lainnya = uraian mirip saja. Resep lain memaksa satu aturan untuk semua anchor.
  const RESEP = ['otomatis', 'salahpos', 'bedahs', 'murah', 'pelaku'];
  function aturanOtomatis(a) {
    if (a.sumber === 'audit' || a.sumber === 'penul') return 'salahpos';
    if (a.sumber === 'notul') { const k = a.koreksi || []; return k.includes('tarif') ? 'salahpos' : k.includes('nilai') ? 'murah' : 'umum'; }
    return 'umum';
  }
  // opsi: { resep, ambang, hs: 'semua'|'sama'|'pos' (terhadap HS anchor), uji(r): syarat tambahan per baris }
  // hasil: id -> { id, skor, anchor (yang paling mirip), aturan }
  function cariMiripAnchor(anchors, opsi) {
    const ambang = opsi.ambang;
    const lingkup = opsi.hs || 'semua';
    const uji = opsi.uji || (() => true);
    const hasil = new Map();
    const perUraian = new Map();
    for (const a of anchors) {
      if (!a.uraian) continue;
      const aturan = opsi.resep === 'otomatis' ? aturanOtomatis(a) : opsi.resep;
      // harga: uraian boleh sedikit lebih longgar, pembandingnya HS dan satuan yang sama
      const amb = aturan === 'murah' ? Math.max(0.6, ambang - 0.1) : ambang;
      const kc = a.uraian + '|' + amb;
      let calon = perUraian.get(kc);
      if (!calon) { calon = []; cariMirip(a.uraian, amb, (r, s) => calon.push([r, s])); perUraian.set(kc, calon); }
      const hsA = String(a.hsAsal || '');
      const satuanSama = r => !a.satuan || !KD_SAT || r[KD_SAT] === a.satuan;
      let batasHarga = null;
      if (aturan === 'murah') {
        // pembanding: harga penetapan notul, atau median harga satuan barang mirip dengan HS dan satuan yang sama
        const pool = calon.filter(([r]) => r[P.hs] === hsA && satuanSama(r) && r.price_per_unit > 0).map(([r]) => r.price_per_unit).sort((x, y) => x - y);
        const ref = a.hargaTetap || (pool.length ? pool[Math.floor(pool.length / 2)] : null);
        if (!ref) continue;
        batasHarga = ref * (1 - AMBANG_NOTUL.selisih);
      }
      for (const [r, s] of calon) {
        if (r.id === a.rowId) continue;
        const h = String(r[P.hs] || '');
        if (aturan === 'salahpos' && hsA && h !== hsA) continue;
        if (aturan === 'bedahs' && hsA && h === hsA) continue;
        if (aturan === 'murah' && (h !== hsA || !satuanSama(r) || !(r.price_per_unit > 0 && r.price_per_unit < batasHarga))) continue;
        if (aturan === 'pelaku' && !((a.npwp9 && String(r[P.npwp9] || '') === a.npwp9) || (a.pemasok && PEMASOK && r[PEMASOK] === a.pemasok))) continue;
        if (lingkup === 'sama' && hsA && h !== hsA) continue;
        if (lingkup === 'pos' && hsA && h.slice(0, 4) !== hsA.slice(0, 4)) continue;
        if (!uji(r)) continue;
        const lama = hasil.get(r.id);
        if (!lama || s > lama.skor) hasil.set(r.id, { id: r.id, skor: s, anchor: a, aturan });
      }
    }
    return hasil;
  }

  const bawaan = new Set(D.DOK.bawaan);
  for (const [label, lebar, tipe] of [['HS Flag', 120], ['Audit Flag', 110], ['Penul Flag', 110], ['Assessed', 130], ['Assessed Ref', 220, 'teks'], ['Expansion Ref', 300, 'teks'],
    ['Notul', 130], ['Importer Notul', 150], ['Notul Expansion', 320, 'teks'], ['Notul Expansion Type', 160], ['Similar To', 300, 'teks']]) {
    D.KOLOM.push({ key: D.kunci(label), label, tipe: tipe || 'kode', persen: false, bawaan: bawaan.has(label), tautan: false, hitungan: true, lebar });
  }
  // Similar To: diisi halaman Find similar saat hasilnya dibuka di Data (nama kelompok hasil per baris)
  for (const r of ROWS) r.similar_to = null;
  root.SkpkQuery.setMirip(mirip);
  root.SkpkAnalisis = {
    token, kunciUraian, mirip, serupa, bedaHs, pivot, UKURAN, FLAG, AMBANG_TEMUAN, AMBANG_NOTUL, AMBANG_KLUSTER, hitungRiwayat, kelompokSaran, labelSaran, labelNotul,
    kluster: () => KLUSTER, anchorTema, perluasanTema, miripTema, fmtHs, namaKluster, RESEP, aturanOtomatis, cariMiripAnchor
  };
})(window);
