/*
 * SKPK prototipe To-Be: data populasi jenis dokumen aktif.
 * Isi utama dari public/data/<jenis>.js (hasil scripts/excel-ke-data.py, kolom sama persis dengan Excel).
 * Profil jenis dokumen aktif (kolom bawaan, lebar, peran kolom) dari public/js/dokumen.js.
 * Kolom bertanda tambahan belum ada di Excel; isinya lorem ipsum sampai dibahas lagi.
 * Kolom hitungan (harga per kg, skor dan flag harga) dihitung di sini dari kolom Excel.
 */
(function (root) {
  'use strict';

  const S = root.SKPK_SUMBER;

  // nama kolom untuk query SQL: "Nilai Devisa Idr" -> nilai_devisa_idr
  const kunci = label => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const DOK = root.SKPK_DOKUMEN.PROFIL[S.dok || 'bc20'];
  // teks yang sebenarnya kode: rata kiri, tanpa saran isian panjang
  const KODE = new Set(DOK.kode_teks);
  const LEBAR = Object.assign({ 'Nm Kantor': 220, 'Nm Kanwil': 220 }, DOK.lebar);
  // kolom yang tampil saat pertama dibuka
  const BAWAAN = DOK.bawaan;
  const TAUTAN = new Set(DOK.tautan);
  // peran -> kunci kolom (null bila jenis ini tidak punya kolomnya)
  const P = Object.fromEntries(Object.entries(DOK.peran).map(([k, v]) => [k, v ? kunci(v) : null]));

  // ---------- kolom dari Excel ----------
  const KOLOM = S.kolom.map(k => {
    const tipe = k.tipe === 'teks' && KODE.has(k.label) ? 'kode' : k.tipe;
    const persen = /^(Trf|Tarif) /.test(k.label);
    return {
      key: kunci(k.label),
      label: k.label,
      tipe,
      persen,
      bawaan: BAWAAN.includes(k.label),
      tautan: TAUTAN.has(k.label),
      lebar: LEBAR[k.label] || (tipe === 'angka' ? (persen ? 96 : 140) : tipe === 'tanggal' ? 120 : tipe === 'kode' ? 130 : 180)
    };
  });

  // ---------- baris ----------
  const ROWS = [];
  for (let i = 0; i < S.jumlah; i++) ROWS.push({});
  S.kolom.forEach((k, j) => {
    const key = KOLOM[j].key;
    for (let i = 0; i < S.jumlah; i++) {
      let v;
      if ('c' in k) v = k.c;
      else if (k.v) v = k.v[i];
      else v = k.i[i] < 0 ? null : k.k[k.i[i]];
      ROWS[i][key] = v === undefined ? null : v;
    }
  });

  // ---------- kolom tambahan (lorem ipsum) ----------
  const LOREM = ['LOREM IPSUM', 'DOLOR SIT AMET', 'CONSECTETUR ADIPISCING', 'SED DO EIUSMOD', 'TEMPOR INCIDIDUNT', 'UT LABORE DOLORE', 'MAGNA ALIQUA'];
  const kantorUnik = Array.from(new Set(ROWS.map(r => r[P.kantor]))).sort();
  const NM_KANTOR = Object.fromEntries(kantorUnik.map((k, i) => [k, 'KPU ' + LOREM[i % LOREM.length] + (i >= LOREM.length ? ' ' + (Math.floor(i / LOREM.length) + 1) : '')]));
  const NM_KANWIL = Object.fromEntries(kantorUnik.map((k, i) => [k, 'KANWIL ' + LOREM[(i * 3) % LOREM.length]]));
  const TAMBAHAN = [
    { setelah: P.kantor, label: 'Nm Kantor', isi: r => NM_KANTOR[r[P.kantor]] || null },
    { setelah: 'nm_kantor', label: 'Nm Kanwil', isi: r => NM_KANWIL[r[P.kantor]] || null }
  ];
  for (const t of TAMBAHAN) {
    const kol = { key: kunci(t.label), label: t.label, tipe: 'teks', persen: false, bawaan: false, tautan: false, tambahan: true, lebar: LEBAR[t.label] || 180 };
    KOLOM.splice(KOLOM.findIndex(k => k.key === t.setelah) + 1, 0, kol);
    for (const r of ROWS) r[kol.key] = t.isi(r);
  }

  // ---------- kolom hitungan: harga satuan dan pencilannya ----------
  // price_score = z-score robust log(harga/kg) terhadap median kelompok HS + negara asal (HS saja bila anggota < 5)
  const bagi = (a, b) => (typeof a === 'number' && typeof b === 'number' && b > 0 ? Math.round(a / b * 100) / 100 : null);
  for (const r of ROWS) {
    r.price_per_kg = bagi(r[P.nilai], r[P.netto]);
    r.price_per_unit = bagi(r[P.nilai], r[P.jumlah]);
  }
  const median = xs => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const kelompok = new Map();
  const tambahKe = (k, r) => { if (!kelompok.has(k)) kelompok.set(k, []); kelompok.get(k).push(r); };
  for (const r of ROWS) if (r.price_per_kg > 0) { tambahKe(r[P.hs] + '|' + r[P.negara], r); tambahKe(r[P.hs] + '|*', r); }
  const STAT = new Map();
  for (const [k, rs] of kelompok) {
    const lg = rs.map(r => Math.log(r.price_per_kg));
    const med = median(lg);
    const mad = median(lg.map(x => Math.abs(x - med)));
    STAT.set(k, { n: rs.length, median: Math.exp(med), medLog: med, mad });
  }
  const statHarga = r => {
    const s = STAT.get(r[P.hs] + '|' + r[P.negara]);
    return s && s.n >= 5 ? { ...s, kelompok: 'HS ' + r[P.hs] + (DOK.pelaku === 'exporter' ? ' to ' : ' from ') + r[P.negara] } : STAT.has(r[P.hs] + '|*') ? { ...STAT.get(r[P.hs] + '|*'), kelompok: 'HS ' + r[P.hs] } : null;
  };
  for (const r of ROWS) {
    const s = r.price_per_kg > 0 ? statHarga(r) : null;
    if (!s || s.n < 5) { r.price_score = null; r.price_flag = null; continue; }
    const z = s.mad > 0 ? 0.6745 * (Math.log(r.price_per_kg) - s.medLog) / s.mad : 0;
    r.price_score = Math.round(Math.max(-99, Math.min(99, z)) * 100) / 100;
    r.price_flag = r.price_score < -3.5 ? 'LOW' : r.price_score > 3.5 ? 'HIGH' : null;
  }
  for (const [label, tipe, lebar] of [['Price Per Kg', 'angka', 130], ['Price Per Unit', 'angka', 140], ['Price Score', 'angka', 110], ['Price Flag', 'kode', 110]]) {
    KOLOM.push({ key: kunci(label), label, tipe, persen: false, bawaan: BAWAAN.includes(label), tautan: false, hitungan: true, lebar });
  }

  // urutan awal: tanggal dokumen terbaru, lalu No Aju dan nomor seri
  const [TG, AJ, SR] = [P.tanggal, P.aju, P.seri];
  ROWS.sort((a, b) => (a[TG] < b[TG] ? 1 : a[TG] > b[TG] ? -1 : (a[AJ] < b[AJ] ? -1 : a[AJ] > b[AJ] ? 1 : a[SR] - b[SR])));
  ROWS.forEach((r, i) => { r.id = i; });

  // ---------- dokumen (satu No Aju: satu PIB, PEB, ...) ----------
  // Resume keputusan belum ada di Excel: angka contoh dengan seed tetap
  let benih = 20261014;
  const acak = () => { benih = (benih * 1103515245 + 12345) & 0x7fffffff; return benih / 0x7fffffff; };
  const PIB = [];
  const indeksPib = new Map();
  for (const r of ROWS) {
    let p = indeksPib.get(r[AJ]);
    if (p === undefined) {
      p = PIB.length;
      indeksPib.set(r[AJ], p);
      PIB.push({ noAju: r[AJ], seri: [] });
    }
    r.pibIndex = p;
    PIB[p].seri.push(r.id);
  }
  for (const p of PIB) {
    p.seri.sort((a, b) => ROWS[a][SR] - ROWS[b][SR]);
    const n = p.seri.length;
    const beda = n > 1 && acak() < 0.3 ? 1 + Math.floor(acak() * Math.min(2, n)) : 0;
    p.resume = { ok: n - beda, update: beda, insert: 0, hapus: 0, bedaTarif: beda ? Math.floor(acak() * (beda + 1)) : 0, diselesaikan: 0 };
  }

  const tgl = ROWS.map(r => r[TG]).filter(Boolean).sort();
  const PERIODE = { mulai: tgl[0], akhir: tgl[tgl.length - 1] };

  const api = { SUMBER: { file: S.file, sheet: S.sheet, dibuat: S.dibuat }, DOK, P, kunci, PERIODE, KOLOM, ROWS, PIB, BAWAAN: BAWAAN.map(kunci), statHarga };
  root.SKPK_DATA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
