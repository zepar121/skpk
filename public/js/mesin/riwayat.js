/*
 * SKPK prototipe To-Be: riwayat penetapan per seri barang, dasar perluasan dan cleansing.
 * Tiga sumber: Audit dan Penelitian ulang (satu batch = satu ST/LHA, diunggah dari Excel di menu History)
 * dan Notul (penetapan PFPD dari database; contohnya public/data/notul.js, hasil scripts/excel-ke-data.py).
 * Kolom file notul dan audit/penul: tanpa akhiran = pemberitahuan, akhiran 1 = penetapan (Hs Code / Hs Code1).
 * Batch unggahan disimpan di localStorage per jenis dokumen, lengkap dengan kolom asli filenya (ditampilkan di
 * menu History seperti Browse). Selain itu ada batch contoh dengan benih tetap: audit dari baris Fl Audit = Y,
 * penul dari baris acak, notul acak hanya bila notul.js tidak ada.
 * Baris dicocokkan ke populasi lewat No Aju + Seri, atau Kd Kantor + No PIB + Tgl PIB + Seri; yang tidak ada
 * di populasi tetap disimpan (rowId null) dan uraiannya tetap dipakai untuk perluasan.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_DATA;
  const ROWS = D.ROWS;
  const P = D.P;
  const DOK = D.DOK;
  // batch unggahan disimpan per jenis dokumen; satu file unggahan boleh menulis ke beberapa jenis
  const kunciSimpan = kode => 'skpk-prototipe.riwayat.v1' + (kode === 'bc20' ? '' : '.' + kode);
  const KUNCI = kunciSimpan(DOK.kode);

  // ref = nama nomor dokumen penetapan per jenis
  const JENIS = {
    audit: { label: 'Audit', nama: 'Audit', ref: 'LHA' },
    penul: { label: 'Penul', nama: 'Penelitian ulang', ref: 'LHPU' },
    notul: { label: 'Notul', nama: 'Nota pembetulan (PFPD)', ref: 'SPTNP' }
  };
  const URUT_JENIS = ['audit', 'penul', 'notul'];

  // ---------- pencocokan ke populasi ----------
  const kode = s => String(s === null || s === undefined ? '' : s).replace(/[\s.\-/]/g, '').toUpperCase();
  const nomor = s => kode(s).replace(/^0+(?=\d)/, '');
  const kAju = (aju, seri) => kode(aju) + '|' + (+seri);
  const kPib = (nmr, tgl, seri) => nomor(nmr) + '|' + tgl + '|' + (+seri);
  const idAju = new Map();
  const idPib = new Map();
  // tanpa kode kantor: No PIB + tanggal + seri bisa kembar antarkantor, yang kembar ditandai -1
  const idPibSaja = new Map();
  for (const r of ROWS) {
    if (P.aju) idAju.set(kAju(r[P.aju], r[P.seri]), r.id);
    const k = kPib(r[P.nomor], r[P.tanggal], r[P.seri]);
    idPib.set(kode(r[P.kantor]) + '|' + k, r.id);
    idPibSaja.set(k, idPibSaja.has(k) ? -1 : r.id);
  }
  // kunci = { aju, noPib, tglPib (ISO), kantor, seri }; hasil id baris atau null
  function cariBaris(k) {
    if (!k || k.seri === null || k.seri === undefined || k.seri === '') return null;
    if (k.aju) { const id = idAju.get(kAju(k.aju, k.seri)); if (id !== undefined) return id; }
    if (k.noPib && k.tglPib) {
      const s = kPib(k.noPib, k.tglPib, k.seri);
      if (k.kantor) { const id = idPib.get(kode(k.kantor) + '|' + s); return id === undefined ? null : id; }
      const id = idPibSaja.get(s);
      return id === undefined || id < 0 ? null : id;
    }
    return null;
  }
  const kunciDari = r => ({ aju: r[P.aju] || null, noPib: r[P.nomor], tglPib: r[P.tanggal], kantor: r[P.kantor], seri: r[P.seri] });

  // data per kolom (format public/data/*.js) -> kolom [{ label, tipe }] + baris berupa larik nilai
  function dariKolom(S) {
    const kolom = S.kolom.map(k => ({ label: k.label, tipe: k.tipe }));
    const mentah = [];
    for (let i = 0; i < S.jumlah; i++) {
      mentah.push(S.kolom.map(k => {
        const v = 'c' in k ? k.c : k.v ? k.v[i] : k.i[i] < 0 ? null : k.k[k.i[i]];
        return v === undefined ? null : v;
      }));
    }
    return { kolom, mentah };
  }

  // ---------- notul: jenis koreksi PFPD per seri ----------
  // kolom Salah Tarif/Nilai/Jumlah/Jenis berisi nomor seri yang dikoreksi untuk PIB itu, mis. "7" atau "1,2,5-8,"
  // (nilai yang sama berulang di semua baris PIB). Hanya seri yang tercantum yang mendapat jenis itu.
  const KOREKSI = ['tarif', 'nilai', 'jumlah', 'jenis'];
  const LABEL_KOREKSI = { tarif: 'TARIF', nilai: 'NILAI', jumlah: 'JUMLAH', jenis: 'JENIS' };
  const KOLOM_SALAH = { tarif: 'Salah Tarif', nilai: 'Salah Nilai', jumlah: 'Salah Jumlah', jenis: 'Salah Jenis' };
  function uraiSeri(v) {
    const set = new Set();
    if (v === null || v === undefined || v === '') return set;
    if (typeof v === 'number') { set.add(v); return set; }
    for (const bagian of String(v).split(/[^\d-]+/)) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(bagian);
      if (!m) continue;
      const a = +m[1];
      const b = m[2] ? +m[2] : a;
      for (let i = a; i <= Math.min(b, a + 5000); i++) set.add(i);
    }
    return set;
  }
  const angkaAtau = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const bagi = (a, b) => (a !== null && b !== null && b > 0 ? a / b : null);
  // "-" di database berarti kosong
  const teksIsi = v => (v === null || v === undefined || v === '-' ? '' : String(v).replace(/\s+/g, ' ').trim());
  const daftarKode = v => teksIsi(v).split(/[,;\s]+/).filter(Boolean);
  // baris notul (kolom asli) -> baris riwayat: kunci seri, HS/tarif, jenis koreksi, dan indikator untuk perluasan
  function barisNotul(kolom, mentah) {
    const j = {};
    kolom.forEach((k, i) => { if (!(k.label in j)) j[k.label] = i; });
    const ambil = (x, label) => (j[label] === undefined || x[j[label]] === undefined ? null : x[j[label]]);
    return mentah.map(x => {
      const seri = angkaAtau(ambil(x, 'Seri Brg'));
      const koreksi = KOREKSI.filter(k => seri !== null && uraiSeri(ambil(x, KOLOM_SALAH[k])).has(seri));
      const n = l => angkaAtau(ambil(x, l));
      const fasDekl = daftarKode(ambil(x, 'Kd Skep Fas'));
      const fasTetap = new Set(daftarKode(ambil(x, 'Kd Skep Fas1')));
      return {
        kunci: { aju: ambil(x, 'No Aju'), noPib: ambil(x, 'No Pib'), tglPib: ambil(x, 'Tgl Pib'), kantor: ambil(x, 'Kd Kantor'), seri },
        uraian: teksIsi(ambil(x, 'Ur Brg')) || teksIsi(ambil(x, 'Ur Brg1')), hsAsal: ambil(x, 'Hs Code') || ambil(x, 'Hs Code1'), tarifAsal: n('Trf Bm'),
        hsTetap: ambil(x, 'Hs Code1'), tarifTetap: n('Trf Bm1'), ref: ambil(x, 'No Sptnp'), tglRef: ambil(x, 'Tgl Sptnp'),
        ket: koreksi.length ? 'PFPD: ' + koreksi.map(k => LABEL_KOREKSI[k]).join(', ') : 'Penetapan PFPD',
        koreksi,
        npwp9: teksIsi(ambil(x, 'Npwp9')), pelaku: teksIsi(ambil(x, 'Nm Imp')),
        // angka penetapan notul, dipakai sebagai dasar penelitian berikutnya (menu Analysis)
        cifAsal: n('CIF'), cifTetap: n('Cif1'), ndpbmTetap: n('Ndpbm1') ?? n('Ndpbm'), kdValTetap: teksIsi(ambil(x, 'Kd Val1')) || teksIsi(ambil(x, 'Kd Val')),
        // harga satuan IDR = CIF valuta × NDPBM / jumlah satuan; berat per satuan = netto / jumlah satuan
        ind: {
          hargaDekl: bagi(n('CIF') !== null && n('Ndpbm') !== null ? n('CIF') * n('Ndpbm') : null, n('Jml Sat Hrg')),
          hargaTetap: bagi(n('Cif1') !== null && n('Ndpbm1') !== null ? n('Cif1') * n('Ndpbm1') : null, n('Jml Sat Hrg1')),
          satuan: teksIsi(ambil(x, 'Kd Sat Hrg1')) || teksIsi(ambil(x, 'Kd Sat Hrg')),
          beratDekl: bagi(n('Netto Brg'), n('Jml Sat Hrg')), beratTetap: bagi(n('Netto Brg1'), n('Jml Sat Hrg1')),
          uraianDekl: teksIsi(ambil(x, 'Ur Brg')), uraianTetap: teksIsi(ambil(x, 'Ur Brg1')),
          fasCabut: fasDekl.filter(k => !fasTetap.has(k)), pemasok: teksIsi(ambil(x, 'Nm Pemasok'))
        }
      };
    });
  }
  // seri yang tarifnya tidak boleh ditetapkan lagi: temuan audit/penul, dan notul yang salah tarif
  const terkunci = (b, x) => b.jenis !== 'notul' || (x.koreksi || []).includes('tarif');
  // jenis notul yang pernah dikenakan ke tiap importir (NPWP9), dari seluruh database notul termasuk seri di luar data
  let notulImportir = new Map();
  function bangunNotulImportir() {
    notulImportir = new Map();
    for (const b of contoh.concat(unggahan)) {
      if (b.jenis !== 'notul') continue;
      for (const x of b.baris) {
        const npwp = x.npwp9 || (x.rowId !== null && x.rowId !== undefined ? String(ROWS[x.rowId][P.npwp9] || '') : '');
        if (!npwp || /^0+$/.test(npwp)) continue;
        let h = notulImportir.get(npwp);
        if (!h) { h = { seri: 0, sptnp: new Set(), tarif: 0, nilai: 0, jumlah: 0, jenis: 0 }; notulImportir.set(npwp, h); }
        h.seri++;
        if (x.ref) h.sptnp.add(x.ref);
        for (const k of x.koreksi || []) h[k]++;
      }
    }
  }

  // ---------- batch contoh ----------
  let benih = 20261021;
  const acak = () => { benih = (benih * 1103515245 + 12345) & 0x7fffffff; return benih / 0x7fffffff; };
  const DAFTAR_HS = Array.from(new Set(ROWS.map(r => r[P.hs]).filter(Boolean))).sort();
  const hsLain = hs => { const lain = DAFTAR_HS.filter(h => h !== hs); return lain.length ? lain[Math.floor(acak() * lain.length)] : hs; };
  const tambahHari = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  function barisDari(r, lain) {
    return Object.assign({
      kunci: kunciDari(r), uraian: r[P.uraian] || '', hsAsal: r[P.hs], tarifAsal: typeof r[P.tarif] === 'number' ? r[P.tarif] : null,
      hsTetap: hsLain(r[P.hs]), tarifTetap: 10, ket: ''
    }, lain || {});
  }
  const terpakai = new Set();
  function ambilAcak(n) {
    const hasil = [];
    for (let coba = 0; hasil.length < n && coba < n * 50; coba++) {
      const id = Math.floor(acak() * ROWS.length);
      if (terpakai.has(id)) continue;
      terpakai.add(id);
      hasil.push(ROWS[id]);
    }
    return hasil;
  }
  const akhirData = D.PERIODE.akhir || '2026-01-01';
  const contoh = [];
  // audit: baris Fl Audit = Y dibagi dua ST/LHA menurut tanggal; jenis tanpa kolom audit memakai baris acak
  const barisAudit = (P.audit ? ROWS.filter(r => r[P.audit] === 'Y') : []).slice().sort((a, b) => (a[P.tanggal] < b[P.tanggal] ? -1 : 1));
  for (const r of barisAudit) terpakai.add(r.id);
  const sumberAudit = barisAudit.length ? barisAudit : ambilAcak(16);
  const tengah = Math.ceil(sumberAudit.length / 2);
  [[sumberAudit.slice(0, tengah), 'ST-0412/KPU.01/2025', 'LHA-37/KPU.01/2025', 210], [sumberAudit.slice(tengah), 'ST-0088/KPU.03/2026', 'LHA-09/KPU.03/2026', 120]].forEach(([rs, noSt, noLha, mundur], i) => {
    if (!rs.length) return;
    const tglLha = tambahHari(akhirData, -mundur + 60);
    contoh.push({
      id: 'contoh-audit-' + (i + 1), jenis: 'audit', asal: 'contoh', noSt, tglSt: tambahHari(tglLha, -75), noLha, tglLha, file: '', oleh: 'senior', diunggah: tglLha + 'T09:00:00.000Z',
      catatan: 'Sample audit findings (Fl Audit = Y in the source file)',
      baris: rs.map(r => barisDari(r, { ket: r[D.kunci('Ur Audit')] || 'Klasifikasi tidak sesuai hasil pemeriksaan pembukuan' }))
    });
  });
  const barisPenul = ambilAcak(18);
  contoh.push({
    id: 'contoh-penul-1', jenis: 'penul', asal: 'contoh', noSt: 'ST-118/BC.07/2025', tglSt: tambahHari(akhirData, -150), noLha: 'LHPU-22/BC.07/2025', tglLha: tambahHari(akhirData, -90),
    file: '', oleh: 'senior', diunggah: tambahHari(akhirData, -90) + 'T10:00:00.000Z', catatan: 'Sample re-research (penelitian ulang) findings',
    baris: barisPenul.map(r => barisDari(r, { ket: 'Penelitian ulang tarif dan klasifikasi' }))
  });
  // notul: penetapan PFPD per seri dari database (notul.js, hanya BC 2.0); tanpa file itu, contoh acak satu SPTNP per PIB
  const NOTUL = DOK.kode === 'bc20' ? root.SKPK_NOTUL || null : null;
  if (NOTUL) {
    const { kolom, mentah } = dariKolom(NOTUL);
    contoh.push({
      id: 'notul', jenis: 'notul', asal: 'database', noSt: '', tglSt: '', noLha: '', tglLha: '', file: NOTUL.file, oleh: 'system', diunggah: (NOTUL.dibuat || akhirData) + 'T00:00:00.000Z',
      catatan: 'PFPD assessments (SPTNP) from the customs database', kolom, mentah,
      baris: barisNotul(kolom, mentah)
    });
  } else {
    const acakNotul = ambilAcak(Math.max(12, Math.round(ROWS.length * 0.006)));
    const sptnp = new Map();
    contoh.push({
      id: 'contoh-notul', jenis: 'notul', asal: 'contoh', noSt: '', tglSt: '', noLha: '', tglLha: '', file: '', oleh: 'system', diunggah: akhirData + 'T00:00:00.000Z',
      catatan: 'PFPD assessments (SPTNP); sample rows until the database is connected',
      baris: acakNotul.map(r => {
        if (!sptnp.has(r[P.aju])) sptnp.set(r[P.aju], 'SPTNP-' + String(100000 + Math.floor(acak() * 899999)) + '/' + (r[P.kantor] || '') + '/' + String(r[P.tanggal] || '').slice(0, 4));
        // contoh: satu jenis koreksi acak per seri; indikator perluasan dari pemberitahuan baris itu sendiri
        const koreksi = [KOREKSI[Math.floor(acak() * KOREKSI.length)]];
        const netto = r[P.netto];
        const jumlah = r[P.jumlah];
        return barisDari(r, {
          ref: sptnp.get(r[P.aju]), tglRef: tambahHari(r[P.tanggal], 3 + Math.floor(acak() * 20)), ket: 'PFPD: ' + LABEL_KOREKSI[koreksi[0]], koreksi,
          npwp9: String(r[P.npwp9] || ''), pelaku: r[P.pelaku] || '',
          ind: { hargaDekl: r.price_per_unit || null, hargaTetap: null, satuan: r[D.kunci('Kd Sat Hrg')] || '', beratDekl: typeof netto === 'number' && jumlah > 0 ? netto / jumlah : null, beratTetap: null,
            uraianDekl: r[P.uraian] || '', uraianTetap: '', fasCabut: [], pemasok: r[D.kunci('Nm Pemasok')] || '' }
        });
      })
    });
  }

  // ---------- batch unggahan ----------
  function muat(kunci) {
    try {
      const s = JSON.parse(localStorage.getItem(kunci) || '[]');
      return Array.isArray(s) ? s.filter(b => b && b.id && JENIS[b.jenis] && Array.isArray(b.baris)) : [];
    } catch (e) { return []; }
  }
  // batch lama tanpa dok: jenis dari kuncinya
  const unggahan = muat(KUNCI).map(b => (b.dok ? b : Object.assign(b, { dok: DOK.kode })));
  function simpan() {
    const bersih = unggahan.map(b => Object.assign({}, b, { baris: b.baris.map(x => { const y = Object.assign({}, x); delete y.rowId; return y; }) }));
    try { localStorage.setItem(KUNCI, JSON.stringify(bersih)); } catch (e) { return false; }
    return true;
  }

  // ---------- indeks baris -> riwayat ----------
  let indeks = new Map();
  function bangun() {
    indeks = new Map();
    for (const b of semua()) {
      for (const x of b.baris) {
        x.rowId = cariBaris(x.kunci);
        if (x.rowId === null) continue;
        if (!indeks.has(x.rowId)) indeks.set(x.rowId, []);
        indeks.get(x.rowId).push({ batch: b, baris: x });
      }
    }
    for (const d of indeks.values()) d.sort((a, b) => URUT_JENIS.indexOf(a.batch.jenis) - URUT_JENIS.indexOf(b.batch.jenis));
    bangunNotulImportir();
  }
  // batch terbaru di atas
  const tanggalBatch = b => b.tglLha || b.diunggah || '';
  function semua() { return contoh.concat(unggahan).sort((a, b) => tanggalBatch(b).localeCompare(tanggalBatch(a))); }
  const cari = id => contoh.find(b => b.id === id) || unggahan.find(b => b.id === id) || null;
  // nomor dokumen penetapan satu baris: LHA batch, atau SPTNP per baris (notul)
  const refBaris = (b, x) => (x && x.ref) || b.noLha || b.noSt || b.file || JENIS[b.jenis].label;
  const labelBatch = b => JENIS[b.jenis].label + ' ' + (b.jenis === 'notul' && !b.noLha ? 'PFPD' : (b.noLha || b.noSt || b.file || b.id));

  const pendengar = [];
  const beriTahu = () => pendengar.forEach(fn => { try { fn(); } catch (e) { /* abaikan */ } });
  let urutId = 0;
  function tambah(b) {
    const kini = new Date().toISOString();
    const baru = Object.assign({ id: 'u' + Date.now().toString(36) + (urutId++).toString(36), dok: DOK.kode, asal: 'upload', diunggah: kini, noSt: '', tglSt: '', noLha: '', tglLha: '', file: '', catatan: '' }, b);
    // jenis dokumen lain: langsung ke penyimpanannya, dihitung saat jenis itu dibuka
    if (baru.dok !== DOK.kode) {
      const k = kunciSimpan(baru.dok);
      const lain = muat(k);
      lain.push(baru);
      try { localStorage.setItem(k, JSON.stringify(lain)); } catch (e) { return null; }
      return baru;
    }
    unggahan.push(baru);
    if (!simpan()) { unggahan.pop(); return null; }
    bangun();
    beriTahu();
    return baru;
  }
  function hapus(id) {
    const i = unggahan.findIndex(b => b.id === id);
    if (i < 0) return false;
    unggahan.splice(i, 1);
    simpan();
    bangun();
    beriTahu();
    return true;
  }

  // ---------- tabel menu History: satu jenis = satu tabel ala Browse dengan kolom asli file ----------
  // batch tanpa kolom asli (contoh, unggahan versi lama) memakai kolom field-nya dengan nama gaya notul
  // nama kolom pemberitahuan mengikuti jenis dokumen (BC 2.0 = nama kolom notul); penetapan = nama yang sama + 1
  const LP = k => DOK.peran[k] || k;
  const KOLOM_FIELD = [
    ['No Lha', 'teks', b => b.noLha], ['Tgl Lha', 'tanggal', b => b.tglLha || null], ['No St', 'teks', b => b.noSt], ['Tgl St', 'tanggal', b => b.tglSt || null],
    ['No Sptnp', 'teks', (b, x) => x.ref], ['Tgl Sptnp', 'tanggal', (b, x) => x.tglRef],
    [LP('aju'), 'teks', (b, x) => x.kunci.aju], [LP('nomor'), 'teks', (b, x) => x.kunci.noPib], [LP('tanggal'), 'tanggal', (b, x) => x.kunci.tglPib], [LP('kantor'), 'teks', (b, x) => x.kunci.kantor],
    [LP('seri'), 'angka', (b, x) => x.kunci.seri], [LP('uraian'), 'teks', (b, x) => x.uraian], [LP('hs'), 'teks', (b, x) => x.hsAsal], [LP('tarif'), 'angka', (b, x) => x.tarifAsal],
    [LP('hs') + '1', 'teks', (b, x) => x.hsTetap], [LP('tarif') + '1', 'angka', (b, x) => x.tarifTetap], ['Keterangan', 'teks', (b, x) => x.ket]
  ];
  // kolom yang tampil saat pertama dibuka (bila ada), dengan urutan ini: LHA/SPTNP, data pemberitahuan, data penetapan
  const BAWAAN_GRID = ['Correction', 'No Lha', 'Tgl Lha', 'No Sptnp', 'Tgl Sptnp', LP('nomor'), LP('tanggal'), LP('kantor'), LP('seri'), LP('pelaku'), LP('uraian'), LP('hs'), LP('tarif'),
    LP('hs') + '1', LP('tarif') + '1', 'Status', 'Keterangan', 'Tariff Locked', 'In Data', 'File'];
  const KODE = new Set(DOK.kode_teks);
  // teks yang sebenarnya kode (rata kiri, tanpa saran panjang); label penetapan = label pemberitahuan + "1"
  const dasarLabel = l => l.replace(/1$/, '');
  const polaKode = /^(No|Nomor|Kd|Kode|Id|Npwp|Hs|Seq|Status|Neg|Jns|Jenis|Digit|Sumber|Fl)\b/i;
  function kolomGrid(label, tipe) {
    const dasar = dasarLabel(label);
    const t = tipe === 'teks' && (KODE.has(dasar) || polaKode.test(dasar)) ? 'kode' : tipe;
    const persen = /^(Trf|Tarif) /.test(label);
    const lebar = DOK.lebar[dasar] || (/^Ur /.test(dasar) ? 280 : /^(Nm|Nama) /.test(dasar) ? 220 : t === 'angka' ? (persen ? 96 : 130) : t === 'tanggal' ? 120 : t === 'kode' ? 130 : 180);
    return { key: D.kunci(label), label, tipe: t, persen, bawaan: BAWAAN_GRID.includes(label), urutBawaan: BAWAAN_GRID.indexOf(label), tautan: false, hs: dasar === DOK.peran.hs, lebar };
  }
  // kolom pemberitahuan yang nilainya berbeda dengan pasangan penetapannya (label + "1"); selisih pembulatan diabaikan
  function kolomBerubah(kolom, x) {
    const j = new Map(kolom.map((k, i) => [k.label, i]));
    const beda = [];
    for (const [label, i] of j) {
      if (/1$/.test(label) || !j.has(label + '1')) continue;
      const a = x[i];
      const b = x[j.get(label + '1')];
      if (typeof a === 'number' && typeof b === 'number') { if (Math.abs(a - b) > Math.max(0.05, Math.abs(b) * 1e-6)) beda.push(label); }
      else if (teksIsi(a) !== teksIsi(b)) beda.push(label);
    }
    return beda;
  }
  function sumberGrid(jenis) {
    const kolom = [];
    const peta = new Map();
    const pakaiKolom = (label, tipe) => {
      const key = D.kunci(label);
      if (!key) return null;
      let k = peta.get(key);
      if (!k) { k = kolomGrid(label, tipe); peta.set(key, k); kolom.push(k); }
      // tipe berbeda antarfile: dianggap teks supaya semua nilai tetap bisa disaring
      else if (k.tipe !== kolomGrid(label, tipe).tipe) k.tipe = 'teks';
      return key;
    };
    const rows = [];
    const daftar = semua().filter(b => b.jenis === jenis);
    for (const b of daftar) {
      const keys = b.kolom ? b.kolom.map(k => pakaiKolom(k.label, k.tipe)) : null;
      const field = b.kolom ? null : KOLOM_FIELD.filter(([label]) => jenis === 'notul' ? !/ (Lha|St)$/.test(label) : !/Sptnp$/.test(label)).map(([label, tipe, f]) => [pakaiKolom(label, tipe), f]);
      b.baris.forEach((x, i) => {
        const r = { id: rows.length, rowId: x.rowId, batch: b, baris: x };
        if (keys) { const m = b.mentah[i] || []; keys.forEach((key, j) => { if (key && r[key] === undefined) r[key] = m[j] === undefined ? null : m[j]; }); }
        else for (const [key, f] of field) { const v = f(b, x); r[key] = v === undefined || v === '' ? null : v; }
        r.in_data = x.rowId === null ? 'No' : 'Yes';
        if (jenis === 'notul') {
          r.correction = (x.koreksi || []).map(k => LABEL_KOREKSI[k]).join(', ') || null;
          r.tariff_locked = terkunci(b, x) ? 'Yes' : 'No';
          r.changed = keys ? kolomBerubah(b.kolom, b.mentah[i] || []).join(', ') || null : null;
        } else {
          r.file = b.asal === 'contoh' ? 'Sample (' + (b.noLha || b.noSt || b.id) + ')' : b.file || null;
          r.uploaded = (b.diunggah || '').slice(0, 10) || null;
        }
        rows.push(r);
      });
    }
    const hitungan = (jenis === 'notul' ? [['Correction', 'kode', 150], ['Tariff Locked', 'kode', 110], ['Changed', 'teks', 260]] : [])
      .concat([['In Data', 'kode', 90]], jenis === 'notul' ? [] : [['File', 'teks', 200], ['Uploaded', 'tanggal', 120]]);
    for (const [label, tipe, lebar] of hitungan) kolom.push({ key: D.kunci(label), label, tipe, persen: false, bawaan: BAWAAN_GRID.includes(label), urutBawaan: BAWAAN_GRID.indexOf(label), tautan: false, hitungan: true, lebar });
    for (const r of rows) for (const k of kolom) if (r[k.key] === undefined) r[k.key] = null;
    return { rows, kolom };
  }

  bangun();
  root.SkpkRiwayat = {
    JENIS, URUT_JENIS, DAFTAR_HS,
    semua, cari, tambah, hapus, cariBaris, kunciDari, refBaris, labelBatch, sumberGrid, dasarLabel,
    KOREKSI, LABEL_KOREKSI, terkunci,
    notulImportir: npwp => notulImportir.get(String(npwp || '')) || null,
    adaNotul: !!NOTUL,
    untukBaris: id => indeks.get(id) || [],
    bisaHapus: b => b.asal === 'upload',
    onUbah: fn => pendengar.push(fn)
  };
})(typeof window !== 'undefined' ? window : globalThis);
