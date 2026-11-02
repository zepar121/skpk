/*
 * SKPK v2: baris tampilan CEISA 4.0 Smart PCC di atas mesin To-Be (public/js/mesin/).
 * Data utama: public/data/bc20.js (salinan dari website-skpk, sumber "hs 7220.xlsx").
 * Flag RE Inkonsistensi, RE Perluasan, Flag Penetapan Seri, HS Suggestion, dan Data History dihitung mesin
 * (analisis.js, riwayat.js). Kolom yang belum ada mesinnya (RE SKA, Flag P2, Analisis, Re-Assessment, Ket. DNDA)
 * masih dibangkitkan dari isi baris dengan hash tetap, jadi isinya contoh dan sama setiap kali halaman dimuat.
 */
(function (root) {
  'use strict';

  const S = root.SKPK_SUMBER;
  const M = root.SKPK_DATA;
  const R = root.SkpkRiwayat;

  // baris mesin per No Aju + seri (satu baris per seri; Kd Skep Fas sudah digabung per seri di sumber)
  const MESIN = new Map(M.ROWS.map(x => [x[M.P.aju] + '|' + x[M.P.seri], x]));
  // nama dokumen penetapan per jenis riwayat (catatan rapat: SPTNP = on clearance, SPKTNP = penul)
  const PENETAPAN = { notul: 'SPTNP', penul: 'SPKTNP', audit: 'LHA' };
  const fmtHs = h => (h && /^\d{8}$/.test(h) ? h.slice(0, 4) + '.' + h.slice(4, 6) + '.' + h.slice(6) : h);

  // ---------- dekode format kolom terkompres ----------
  const MENTAH = [];
  for (let i = 0; i < S.jumlah; i++) MENTAH.push({});
  for (const k of S.kolom) {
    for (let i = 0; i < S.jumlah; i++) {
      let v;
      if ('c' in k) v = k.c;
      else if (k.v) v = k.v[i];
      else v = k.i[i] < 0 ? null : k.k[k.i[i]];
      MENTAH[i][k.label] = v === undefined ? null : v;
    }
  }

  // ---------- kamus kode ----------
  const KANTOR = {
    '010700': 'KPPBC TMP BELAWAN', '021200': 'KPPBC TMP B DUMAI', '030100': 'KPPBC TMP TELUK BAYUR',
    '040300': 'KPU BEA DAN CUKAI TIPE A TJ. PRIOK', '050100': 'KPPBC TMP TANJUNG EMAS', '050400': 'KPPBC TMP A CILACAP',
    '060100': 'KPPBC TMP PALEMBANG', '070100': 'KPPBC TMP TANJUNG PERAK', '070500': 'KPPBC TMP A PASURUAN',
    '100300': 'KPPBC TMP C PARE-PARE', '110100': 'KPPBC TMP MAKASSAR', '110900': 'KPPBC TMP C MALILI',
    '120200': 'KPPBC TMP B MOROWALI', '120800': 'KPPBC TMP C KENDARI'
  };
  const NEGARA = {
    AT: 'AUSTRIA', AU: 'AUSTRALIA', BE: 'BELGIUM', CH: 'SWITZERLAND', CN: 'CHINA', DE: 'GERMANY', GB: 'UNITED KINGDOM',
    IN: 'INDIA', IT: 'ITALY', JP: 'JAPAN', KR: 'KOREA, REPUBLIC OF', MY: 'MALAYSIA', NL: 'NETHERLANDS', SE: 'SWEDEN',
    SG: 'SINGAPORE', SI: 'SLOVENIA', TH: 'THAILAND', TW: 'TAIWAN', US: 'UNITED STATES', VN: 'VIET NAM'
  };
  const SKEP = {
    '0': '-', '00': '-', '03': 'KAWASAN BERIKAT', '06': 'GUDANG BERIKAT', '07': 'KITE PEMBEBASAN',
    '28': 'MASTER LIST', '40': 'PEMBEBASAN BM', '52': 'PREFERENSI TARIF IMPORTASI ASEAN (ATIGA)',
    '53': 'PREFERENSI TARIF IMPORTASI ASEAN-KOREA (AKFTA)', '54': 'PREFERENSI TARIF IMPORTASI ASEAN-CHINA (ACFTA)',
    '55': 'PREFERENSI TARIF IMPORTASI ASEAN-INDIA (AIFTA)', '56': 'PREFERENSI TARIF IMPORTASI INDONESIA-JEPANG (IJEPA)',
    '57': 'PREFERENSI TARIF IMPORTASI ASEAN-JEPANG (AJCEP)', '60': 'PREFERENSI TARIF IMPORTASI ASEAN-AUSTRALIA-SELANDIA BARU (AANZFTA)',
    '69': 'PREFERENSI TARIF IMPORTASI RCEP', '99': 'FASILITAS LAINNYA'
  };
  const JALUR = { H: 'HIJAU', K: 'KUNING', M: 'MERAH', P: 'PRIORITAS' };
  const VALUTA = { USD: 'US Dollar', CNY: 'Yuan Renminbi', EUR: 'Euro', JPY: 'Yen', GBP: 'Pound Sterling', SGD: 'Singapore Dollar', MYR: 'Ringgit', AUD: 'Australian Dollar', SEK: 'Swedish Krona', IDR: 'Rupiah' };
  const BAYAR = { 1: 'BIASA/TUNAI', 2: 'BERKALA', 3: 'DENGAN JAMINAN', 9: 'LAINNYA', 16: 'PEMBAYARAN BERKALA' };

  // ---------- format ----------
  const angka = n => (n == null || n === '' ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 3 }));
  const rupiah = n => (n == null || n === 0 ? (n === 0 ? 'Rp 0' : '-') : 'Rp ' + Math.round(n).toLocaleString('id-ID'));
  const tgl = s => (s ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : '-');

  // hash tetap per teks (FNV-1a) untuk kolom bangkitan
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

  const HARI_INI = new Date('2026-11-02');
  const umur = s => (s ? Math.max(0, Math.round((HARI_INI - new Date(s)) / 86400000)) : null);

  const TEMA = ['Inkonsistensi HS Code', 'Undervaluasi Nilai Pabean', 'Penyalahgunaan Fasilitas FTA', 'Perluasan Penetapan', 'Profil Importir Berisiko'];

  // ---------- baris tampilan ----------
  const ROWS = MENTAH.map((m, id) => {
    const kunciBaris = (m['No Aju'] || '') + '|' + m['Seri Brg'];
    const h = k => hash(kunciBaris + '|' + k);
    const mesin = MESIN.get(kunciBaris) || {};
    const skepKode = m['Kd Skep Fas'] && !/^0+$/.test(m['Kd Skep Fas']) ? m['Kd Skep Fas'] : null;
    const skepUtama = skepKode ? skepKode.split(',')[0].trim() : null;
    const hs = m['Hs Code'];

    // RE Inkonsistensi: uraian sama memakai HS lain dengan tarif lebih rendah (LOWER DUTY) atau HS lain (MISMATCH)
    const ref = mesin.hsRef;
    const inkonsistensi = mesin.hs_flag === 'LOWER DUTY' || mesin.hs_flag === 'MISMATCH';
    // RE Perluasan per sumber: temuan audit, penelitian ulang, atau notul PFPD atas barang serupa
    const perluasan = [mesin.audit_flag === 'Yes' && 'AUDIT', mesin.penul_flag === 'Yes' && 'PENUL', mesin.notul_expansion && 'NOTUL'].filter(Boolean);
    const exp = mesin.expRef || null;
    // Flag Penetapan Seri: seri ini sendiri sudah punya SPTNP / SPKTNP / LHA
    const penetapan = (mesin.riwayat || []).map(x => ({ jenis: PENETAPAN[x.batch.jenis], ref: R.refBaris(x.batch, x.baris) }));
    const hsSaran = exp ? exp.baris.hsTetap : inkonsistensi ? ref.hs : mesin.notulExp && mesin.notulExp.baris.hsTetap !== hs ? mesin.notulExp.baris.hsTetap : null;
    const trfSaran = exp ? exp.baris.tarifTetap : inkonsistensi ? ref.tarif : hsSaran ? mesin.notulExp.baris.tarifTetap : null;

    const flag = {
      p2: h('p2') < 0.04,
      analisis: h('an') < 0.08,
      perluasan: perluasan.length > 0,
      inkonsistensi,
      reassessment: h('ra') < 0.1,
      ska: !!skepKode && h('ska') < 0.06,
      audit: m['Fl Audit'] === 'Y'
    };
    flag.multi = [flag.p2, flag.analisis, flag.perluasan, flag.inkonsistensi, flag.reassessment].filter(Boolean).length >= 2;
    const jalur = m['Status Jalur'] || '';
    return {
      id,
      m,
      mesin,
      kunci: kunciBaris,
      kodeFas: skepKode,
      kodeFasNama: skepKode ? skepKode.split(',').map(k => k.trim() + ' - ' + (SKEP[k.trim()] || 'FASILITAS ' + k.trim())).join('; ') : null,
      hargaSatuan: mesin.price_per_unit == null ? null : mesin.price_per_unit,
      perluasan,
      ketInkonsistensi: inkonsistensi ? `[Uraian sama di ${ref.total} seri memakai ${ref.jumlahHs} HS; HS acuan ${fmtHs(ref.hs)} (${ref.n} seri, tarif ${ref.tarif == null ? '-' : ref.tarif + '%'}), HS diberitahukan ${fmtHs(hs)} tarif ${m['Trf Bm']}%${mesin.hs_flag === 'LOWER DUTY' ? ', lebih rendah dari acuan' : ''}]` : null,
      penetapan,
      penetapanTeks: penetapan.length ? Array.from(new Set(penetapan.map(p => p.jenis + ' ' + p.ref))).join(', ') : null,
      terkunci: !!mesin.assessed,
      uraian: m['Ur Brg'],
      tipe: m['Type'],
      merk: m['Merek'],
      hs,
      hsSaran,
      trfBm: m['Trf Bm'],
      trfSaran,
      skep: skepKode ? skepUtama + ' - ' + (SKEP[skepUtama] || 'FASILITAS ' + skepUtama) : null,
      skepKode: skepUtama,
      perusahaan: m['Nm Imp'],
      npwp: m['Npwp Imp'],
      kantorKode: m['Kd Kantor'],
      kantor: m['Kd Kantor'] ? m['Kd Kantor'] + ' - ' + (KANTOR[m['Kd Kantor']] || 'KPPBC ' + m['Kd Kantor']) : null,
      kanwil: null,
      noPib: m['No Pib'],
      aju: m['No Aju'],
      tglDaftar: m['Tgl Pib'],
      waktuRekam: m['Tgl Aju'],
      pemasok: m['Nm Pemasok'],
      seri: m['Seri Brg'],
      satuan: m['Kd Sat Hrg'],
      jmlSatuan: m['Jml Sat Hrg'],
      bmBayar: m['Bmby'],
      negara: m['Neg Asal'],
      negaraNama: m['Neg Asal'] ? m['Neg Asal'] + ' - ' + (NEGARA[m['Neg Asal']] || m['Neg Asal']) : null,
      devisa: m['Nilai Devisa Idr'],
      jalurKode: jalur,
      jalur: jalur ? jalur + ' - ' + (JALUR[jalur[0]] || jalur) : null,
      tema: flag.analisis ? TEMA[Math.floor(h('tema') * TEMA.length)] : null,
      umur: umur(m['Tgl Pib']),
      flag,
      ketPerluasan: flag.perluasan ? [mesin.expansion_ref, mesin.notul_expansion].filter(Boolean).map(s => '[' + s + ']').join(' ') +
        (exp ? ` [Kemiripan uraian ${Math.round(exp.skor * 100)}% dengan temuan ${R.labelBatch(exp.batch)}, HS ${fmtHs(exp.baris.hsAsal)} ditetapkan ${fmtHs(exp.baris.hsTetap)}]` : '') : null,
      ketDnda: null,
      ketAudit: flag.audit ? m['Ur Audit'] : null,
      ketPenul: mesin.penulRef ? R.labelBatch(mesin.penulRef.batch) + ' → ' + fmtHs(mesin.penulRef.baris.hsTetap) : null,
      ketNotul: mesin.notul ? 'SPTNP ' + penetapan.filter(p => p.jenis === 'SPTNP').map(p => p.ref).join(', ') + ' (' + mesin.notul + ')' : null,
      ketSka: flag.ska ? 'SKA form ' + (skepUtama === '54' ? 'E' : skepUtama === '52' ? 'D' : 'AK') + ' tidak sesuai kriteria asal barang' : null
    };
  });

  // urutan awal: tanggal daftar terbaru, lalu No Aju dan seri
  ROWS.sort((a, b) => (a.tglDaftar < b.tglDaftar ? 1 : a.tglDaftar > b.tglDaftar ? -1 : a.aju < b.aju ? -1 : a.aju > b.aju ? 1 : a.seri - b.seri));

  const PER_ID = new Map(ROWS.map(r => [r.id, r]));

  // ---------- statistik kartu ----------
  const terbanyak = (rows, f) => {
    const n = new Map();
    for (const r of rows) { const v = f(r); if (v != null && v !== '') n.set(v, (n.get(v) || 0) + 1); }
    let best = null, max = 0;
    for (const [v, c] of n) if (c > max) { best = v; max = c; }
    return best;
  };
  const statistik = rows => ({
    entitas: new Set(rows.map(r => r.npwp)).size,
    pib: new Set(rows.map(r => r.aju)).size,
    seri: rows.length,
    kantor: new Set(rows.map(r => r.kantorKode)).size,
    hs: terbanyak(rows, r => r.hs),
    tarif: terbanyak(rows, r => r.trfBm),
    skep: terbanyak(rows, r => r.skepKode) || 0,
    devisa: rows.reduce((s, r) => s + (r.devisa || 0), 0)
  });

  // ---------- data history penelitian: batch audit, penul, notul dari riwayat mesin ----------
  // periode audit belum ada di batch; dibangkitkan dari tahun PIB seperti versi As-Is
  const PER_KUNCI = new Map(ROWS.map(r => [r.kunci, r]));
  const NAMA_JENIS = { audit: 'Audit Umum', penul: 'Penelitian Ulang', notul: 'Notul (SPTNP)' };
  const HISTORY = [];
  for (const b of R.semua()) {
    for (const x of b.baris) {
      const y = x.rowId == null ? null : M.ROWS[x.rowId];
      const r = y ? PER_KUNCI.get(y[M.P.aju] + '|' + y[M.P.seri]) : null;
      const k = x.kunci || {};
      const tahun = Number((k.tglPib || '2025').slice(0, 4));
      HISTORY.push({
        id: HISTORY.length, no: HISTORY.length + 1, jenis: NAMA_JENIS[b.jenis], npwp: r ? r.npwp : x.npwp9 || null,
        st: b.jenis === 'notul' ? R.refBaris(b, x) : b.noSt || R.refBaris(b, x),
        awal: b.jenis === 'notul' ? null : tahun + '-02-01', akhir: b.jenis === 'notul' ? null : (tahun + 1) + '-10-31',
        dokumen: 'BC 2.0', kantor: r ? r.kantor : k.kantor || null, noDaftar: k.noPib || (r && r.noPib), tglDaftar: k.tglPib || (r && r.tglDaftar), seri: k.seri,
        temuan: `${PENETAPAN[b.jenis]} ${R.refBaris(b, x)}: HS ${fmtHs(x.hsAsal) || '-'} ditetapkan ${fmtHs(x.hsTetap) || '-'}` +
          (x.tarifTetap == null ? '' : `, tarif BM ${x.tarifTetap}%`) + (x.ket ? '. ' + x.ket : ''),
        rowId: r ? r.id : null
      });
    }
  }

  const tanggal = ROWS.map(r => r.tglDaftar).filter(Boolean).sort();
  const PERIODE = { mulai: tanggal[0], akhir: tanggal[tanggal.length - 1] };

  root.SKPK_ASLI = { ROWS, PER_ID, PER_KUNCI, HISTORY, PERIODE, TEMA, VALUTA, BAYAR, statistik, angka, rupiah, tgl, hash, fmtHs };
})(window);
