/*
 * SKPK prototipe To-Be: tarif dan hitungan pungutan impor untuk penelitian di menu Analysis.
 * Referensi tarif masih dummy (contoh, belum BTKI): semua HS memakai TARIF_CONTOH, yaitu BM MFN 10%, PPN 11%,
 * PPh 22 10%, dan BM 0% bila kode fasilitas memuat 54 (ACFTA). Bila database HS/BTKI asli sudah ada,
 * cukup ganti refUntuk(); tarifUntuk() dan hitung() tetap.
 * Hanya BC 2.0 (impor). Jenis lain: SkpkTarif.ada = false, penelitian hanya menetapkan HS.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_DATA;
  const ROWS = D.ROWS;
  const P = D.P;
  const ada = D.DOK.kode === 'bc20';

  // kolom BC 2.0 yang dipakai hitungan (nama SQL kolom Excel)
  const K = { cif: 'cif', ndpbm: 'ndpbm', valuta: 'kd_val', ppn: 'trf_ppn', pph: 'trf_pph', ppnbm: 'trf_ppnbm', bmby: 'bmby', ppnby: 'ppnby', pphby: 'pphby' };

  // nama skema per kode fasilitas tarif; kode yang belum dipetakan tampil apa adanya
  const SKEMA = { 54: 'ACFTA' };
  const tanpaFas = f => f === null || f === undefined || f === '' || /^0+$/.test(String(f));
  const kodeFas = f => (tanpaFas(f) ? [] : String(f).split(/\s*,\s*/).map(k => +k));
  const namaFas = f => (tanpaFas(f) ? 'MFN' : kodeFas(f).map(k => SKEMA[k] ? SKEMA[k] + ' (' + k + ')' : 'Facility code ' + k).join(' + '));

  // ---------- referensi tarif dummy ----------
  // contoh untuk semua HS: tarif preferensi per kode fasilitas, kode lain = MFN
  const TARIF_CONTOH = { mfn: 10, ppn: 11, pph: 10, ppnbm: 0, fta: { 54: 0 } };
  const refUntuk = hs => (/^\d{8}$/.test(hs || '') ? TARIF_CONTOH : null);
  const DAFTAR_HS = ada ? Array.from(new Set(ROWS.map(r => r[P.hs]).filter(Boolean))).sort() : [];

  // tarif untuk HS + fasilitas; fasDitolak = preferensi tidak diakui, jadi MFN
  function tarifUntuk(hs, fas, opsi) {
    const o = opsi || {};
    const ref = refUntuk(hs);
    if (!ref) return { ditemukan: false };
    const kodeFta = kodeFas(fas).find(k => k in ref.fta);
    const pakaiFta = kodeFta !== undefined && !o.fasDitolak;
    return {
      ditemukan: true,
      bm: pakaiFta ? ref.fta[kodeFta] : ref.mfn,
      sumberBm: pakaiFta ? namaFas(String(kodeFta)) : 'MFN (BTKI)' + (!tanpaFas(fas) ? (o.fasDitolak ? ', preference not accepted' : ', no preferential rate for ' + namaFas(fas)) : ''),
      ppn: ref.ppn,
      sumberPpn: 'BTKI',
      pph: ref.pph,
      sumberPph: 'BTKI',
      ppnbm: ref.ppnbm
    };
  }

  // pungutan impor dari nilai pabean (IDR) dan tarif (%)
  function hitung(x) {
    const np = x.np || 0;
    const bm = np * (x.bm || 0) / 100;
    const ni = np + bm;
    const ppn = ni * (x.ppn || 0) / 100;
    const ppnbm = ni * (x.ppnbm || 0) / 100;
    const pph = ni * (x.pph || 0) / 100;
    return { np, bm, nilaiImpor: ni, ppn, ppnbm, pph, total: bm + ppn + ppnbm + pph };
  }

  // sisi pemberitahuan; dasar = angka penetapan notul yang sudah berlaku untuk seri ini (menu Analysis):
  // { cif, ndpbm } dari notul nilai, { hs, bm } dari notul tarif, ref = nomor SPTNP. Tanpa dasar = pemberitahuan apa adanya
  function deklarasi(r, dasar) {
    const ds = dasar || {};
    const t = { bm: typeof ds.bm === 'number' ? ds.bm : r[P.tarif] || 0, ppn: r[K.ppn] || 0, pph: r[K.pph] || 0, ppnbm: r[K.ppnbm] || 0 };
    const ndpbm = ds.ndpbm || r[K.ndpbm];
    const nilaiNotul = typeof ds.cif === 'number' && ndpbm;
    const np = nilaiNotul ? ds.cif * ndpbm : (r[P.nilai] || 0);
    return { hs: ds.hs || r[P.hs], fas: r[P.fasilitas], cif: nilaiNotul ? ds.cif : r[K.cif], valuta: r[K.valuta], ndpbm, tarif: t, notul: dasar ? ds.ref || true : null, ...hitung({ np, ...t }) };
  }

  // sisi penetapan: teliti = { hs, cif, fasDitolak, tarifManual: { bm, ppn, pph } }; isian kosong = dasar (notul) atau pemberitahuan
  function penetapan(r, teliti, dasar) {
    const d = deklarasi(r, dasar);
    const ds = dasar || {};
    const tl = teliti || {};
    const hs = tl.hs || d.hs;
    const cif = typeof tl.cif === 'number' ? tl.cif : d.cif;
    const np = typeof tl.cif === 'number' && d.ndpbm ? tl.cif * d.ndpbm : d.np;
    // HS tetap seperti penetapan notul: tarifnya dari notul itu, bukan dari referensi
    if (ds.hs && hs === ds.hs && typeof ds.bm === 'number' && !tl.fasDitolak) {
      const ref = { ditemukan: true, bm: ds.bm, sumberBm: 'Notul' + (ds.ref ? ' ' + ds.ref : ''), ppn: d.tarif.ppn, sumberPpn: 'As declared', pph: d.tarif.pph, sumberPph: 'As declared', ppnbm: d.tarif.ppnbm };
      const t = { bm: ds.bm, ppn: d.tarif.ppn, pph: d.tarif.pph, ppnbm: d.tarif.ppnbm };
      return { hs, fas: d.fas, cif, valuta: d.valuta, ndpbm: d.ndpbm, tarif: t, ref, manual: false, ...hitung({ np, ...t }) };
    }
    const ref = tarifUntuk(hs, d.fas, { fasDitolak: tl.fasDitolak, dekl: r });
    const manual = !ref.ditemukan;
    const m = tl.tarifManual || {};
    const t = manual ? { bm: m.bm ?? d.tarif.bm, ppn: m.ppn ?? d.tarif.ppn, pph: m.pph ?? d.tarif.pph, ppnbm: d.tarif.ppnbm } : { bm: ref.bm ?? 0, ppn: ref.ppn, pph: ref.pph, ppnbm: ref.ppnbm };
    return { hs, fas: d.fas, cif, valuta: d.valuta, ndpbm: d.ndpbm, tarif: t, ref, manual, ...hitung({ np, ...t }) };
  }

  // potensi = penetapan - pemberitahuan per pungutan (negatif = lebih bayar)
  const JENIS = ['bm', 'ppn', 'ppnbm', 'pph', 'total'];
  // dengan dasar notul, potensi = kekurangan tambahan di atas yang sudah ditagih lewat notul
  function potensi(r, teliti, dasar) {
    const d = deklarasi(r, dasar);
    const p = penetapan(r, teliti, dasar);
    const selisih = Object.fromEntries(JENIS.map(k => [k, p[k] - d[k]]));
    return { d, p, selisih };
  }

  const api = { ada, K, TARIF_CONTOH, DAFTAR_HS, namaFas, tanpaFas, tarifUntuk, hitung, deklarasi, penetapan, potensi, JENIS };
  root.SkpkTarif = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
