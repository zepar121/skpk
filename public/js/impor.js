/*
 * SKPK v2: import Data History (temuan Audit / LHA dan Penul / LHPU) dan SIRENA Manual (seri yang sudah jadi DNOA / dikirim ke SIRENA
 * di luar SKPK pada masa transisi). Revisi 6 Nov 2026 (arahan pengguna):
 * - Notul (SPTNP) otomatis dari database, tidak diimport. LHA / LHPU sementara diupload manual; nanti otomatis dari SIMAUDI dan SIRENA.
 * - File harus sesuai template: judul kolom, data type, kolom wajib. Tiap seri dicek kebenarannya: Kode Dokumen + Kode Kantor +
 *   Nomor + Tanggal + Seri harus ada di populasi (mencegah data karangan). Satu baris error = satu file ditolak, dengan daftar
 *   baris dan letak salahnya.
 * - Import (Analis 1 / Admin) masuk Approval: Analis 2 / Admin Approve atau Reject satu file utuh. Admin bisa Delete (bypass).
 * - SIRENA Manual menang atas Draft / Approval / Basket (pemilik lama mendapat notifikasi); seri yang sudah SIRENA ditolak.
 * Pembaca XLSX / CSV disalin dari ..\website-skpk\public\js\impor.js (tanpa pustaka luar).
 * Disimpan di localStorage peramban: skpk-v2:impor.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_ASLI;
  const B = root.SkpkBasket;
  const R = root.SkpkRiwayat;
  const M = root.SKPK_DATA;
  const DK = root.SKPK_DOKUMEN;
  const KUNCI = 'skpk-v2:impor';

  // ---------- ZIP dan XLSX (salinan To-Be) ----------
  async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser ini tidak bisa membuka .xlsx. Simpan sebagai .csv lalu coba lagi.');
    const aliran = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(aliran).arrayBuffer());
  }
  function bukaZip(buf) {
    const dv = new DataView(buf);
    const b = new Uint8Array(buf);
    let akhir = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { akhir = i; break; }
    if (akhir < 0) throw new Error('File bukan .xlsx yang valid.');
    const jumlah = dv.getUint16(akhir + 10, true);
    let p = dv.getUint32(akhir + 16, true);
    const dek = new TextDecoder();
    const isi = new Map();
    for (let n = 0; n < jumlah && dv.getUint32(p, true) === 0x02014b50; n++) {
      const metode = dv.getUint16(p + 10, true);
      const besar = dv.getUint32(p + 20, true);
      const pNama = dv.getUint16(p + 28, true);
      const pExtra = dv.getUint16(p + 30, true);
      const pKomen = dv.getUint16(p + 32, true);
      const lokal = dv.getUint32(p + 42, true);
      isi.set(dek.decode(b.subarray(p + 46, p + 46 + pNama)), { metode, besar, lokal });
      p += 46 + pNama + pExtra + pKomen;
    }
    return {
      async teks(nama) {
        const e = isi.get(nama);
        if (!e) return null;
        const mulai = e.lokal + 30 + dv.getUint16(e.lokal + 26, true) + dv.getUint16(e.lokal + 28, true);
        const data = b.subarray(mulai, mulai + e.besar);
        return dek.decode(e.metode === 0 ? data : await inflate(data));
      }
    };
  }
  const xmlDoc = s => new DOMParser().parseFromString(s, 'application/xml');
  const anak = (el, nama) => Array.from(el.getElementsByTagName(nama));
  const teksRich = el => anak(el, 't').filter(t => !t.parentNode || t.parentNode.localName !== 'rPh').map(t => t.textContent).join('');
  const indeksKolom = ref => { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
  async function bacaXlsx(buf) {
    const z = bukaZip(buf);
    let lokasi = 'xl/worksheets/sheet1.xml';
    const wb = await z.teks('xl/workbook.xml');
    const rel = await z.teks('xl/_rels/workbook.xml.rels');
    if (wb && rel) {
      const sh = anak(xmlDoc(wb), 'sheet')[0];
      if (sh) {
        const id = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const r = anak(xmlDoc(rel), 'Relationship').find(x => x.getAttribute('Id') === id);
        if (r) { const t = r.getAttribute('Target').replace(/^\//, ''); lokasi = t.startsWith('xl/') ? t : 'xl/' + t; }
      }
    }
    const ss = await z.teks('xl/sharedStrings.xml');
    const bersama = ss ? anak(xmlDoc(ss), 'si').map(teksRich) : [];
    const sheet = await z.teks(lokasi);
    if (!sheet) throw new Error('Tidak ada sheet yang bisa dibaca.');
    const baris = [];
    for (const row of anak(xmlDoc(sheet), 'row')) {
      const i = (+row.getAttribute('r') || baris.length + 1) - 1;
      const isi = [];
      anak(row, 'c').forEach((c, j) => {
        const ref = c.getAttribute('r');
        const k = ref ? indeksKolom(ref) : j;
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0];
        let nilai = null;
        if (t === 's') nilai = v ? bersama[+v.textContent] ?? '' : '';
        else if (t === 'inlineStr') { const is = c.getElementsByTagName('is')[0]; nilai = is ? teksRich(is) : ''; }
        else if (t === 'str' || t === 'e') nilai = v ? v.textContent : '';
        else if (t === 'b') nilai = v ? v.textContent === '1' : null;
        else if (v) { const n = Number(v.textContent); nilai = Number.isFinite(n) ? n : v.textContent; }
        isi[k] = nilai;
      });
      baris[i] = isi;
    }
    for (let i = 0; i < baris.length; i++) if (!baris[i]) baris[i] = [];
    return baris;
  }
  function bacaCsv(teks) {
    teks = teks.replace(/^﻿/, '');
    const awal = teks.split(/\r?\n/, 1)[0] || '';
    const pisah = [',', ';', '\t'].map(c => [c, awal.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const baris = [];
    let row = [], sel = '', kutip = false;
    for (let i = 0; i < teks.length; i++) {
      const c = teks[i];
      if (kutip) {
        if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c;
      } else if (c === '"') kutip = true;
      else if (c === pisah) { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && teks[i + 1] === '\n') i++;
        row.push(sel); baris.push(row); row = []; sel = '';
      } else sel += c;
    }
    if (sel !== '' || row.length) { row.push(sel); baris.push(row); }
    return baris;
  }
  async function baca(file) {
    const nama = file.name || 'file';
    if (/\.xls$/i.test(nama)) throw new Error('File .xls lama tidak bisa dibaca. Simpan sebagai .xlsx atau .csv.');
    if (/\.(csv|txt|tsv)$/i.test(nama)) return bacaCsv(await file.text());
    if (!/\.xlsx$/i.test(nama)) throw new Error('Gunakan file .xlsx atau .csv.');
    return bacaXlsx(await file.arrayBuffer());
  }

  // ---------- normalisasi ----------
  const kosong = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  const teks = v => (kosong(v) ? '' : String(v).trim());
  const normJudul = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const iso = (y, m, d) => {
    if (y < 100) y += 2000;
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
  };
  const BULAN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 };
  // tanggal: serial Excel, ISO, dd-mm-yyyy / dd/mm/yyyy, 31 Mar 2026
  function tanggal(v) {
    if (kosong(v)) return null;
    if (typeof v === 'number') return v < 1000 || v > 100000 ? null : new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(s);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s);
    if (m) return iso(+m[3], +m[2], +m[1]);
    m = /^(\d{1,2})[\s\-]([A-Za-z]{3})[A-Za-z]*[\s\-](\d{4})$/.exec(s);
    if (m && BULAN[m[2].toLowerCase()]) return iso(+m[3], BULAN[m[2].toLowerCase()], +m[1]);
    return null;
  }
  // angka: 1.234,5 / 1,234.5 / 7,5 / 7.5% ; null bila tidak terbaca
  function angka(v) {
    if (kosong(v)) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).trim().replace(/%$/, '').replace(/\s/g, '');
    if (!/^-?[\d.,]+$/.test(s)) return null;
    const titik = s.lastIndexOf('.'), koma = s.lastIndexOf(',');
    if (titik >= 0 && koma >= 0) s = koma > titik ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (koma >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  // nomor / kode pembanding: tanpa spasi, titik, strip, garis miring; huruf besar; tanpa nol depan
  const banding = v => String(v == null ? '' : v).replace(/[\s.\-/]/g, '').toUpperCase().replace(/^0+(?=\d)/, '');

  // ---------- tipe kolom template ----------
  // ubah(v) -> { v } (nilai bersih) atau { galat } (pesan data type salah)
  const TIPE = {
    teks: { nama: 'Text', ubah: v => ({ v: teks(v) }) },
    dok: { nama: 'Code', format: 'BC 2.0', ubah: v => { const k = DK.normalJenis(teks(v)); return k ? { v: k } : { galat: 'Kode dokumen tidak dikenal' }; } },
    kantor: { nama: 'Code', format: '6 digits', ubah: v => { const s = typeof v === 'number' ? String(Math.round(v)) : teks(v); return /^\d{1,6}$/.test(s) ? { v: s.padStart(6, '0') } : { galat: 'Bukan kode kantor 6 digit' }; } },
    nomor: { nama: 'Code', format: 'digits', ubah: v => { const s = typeof v === 'number' && Number.isInteger(v) ? String(v) : teks(v); return /^\d+$/.test(s) ? { v: s } : { galat: 'Hanya boleh angka' }; } },
    ref: { nama: 'Code', ubah: v => ({ v: typeof v === 'number' ? String(v) : teks(v) }) },
    tanggal: { nama: 'Date', format: 'dd-mm-yyyy', ubah: v => { const d = tanggal(v); return d ? { v: d } : { galat: 'Bukan tanggal (dd-mm-yyyy)' }; } },
    bulat: { nama: 'Integer', format: '1, 2, 3, …', ubah: v => { const n = angka(v); return n !== null && Number.isInteger(n) && n > 0 ? { v: n } : { galat: 'Bukan bilangan bulat > 0' }; } },
    hs: { nama: 'Code', format: '8 digits', ubah: v => { let s = String(typeof v === 'number' ? Math.round(v) : teks(v)).replace(/[\s.\-]/g, ''); if (/^\d{7}$/.test(s)) s = '0' + s; return /^\d{8}$/.test(s) ? { v: s } : { galat: 'Bukan HS 8 digit' }; } },
    persen: { nama: 'Number', format: '0–100', ubah: v => { const n = angka(v); return n !== null && n >= 0 && n <= 100 ? { v: n } : { galat: 'Bukan persentase 0–100' }; } }
  };

  // ---------- template per jenis ----------
  // k = nama field, l = judul kolom (harus sama dengan template), t = tipe, w = wajib, a = judul lama yang tetap dikenali (template sebelum 7 Nov 2026)
  const kol = (k, l, t, w, a) => ({ k, l, t, w: !!w, a: a || [] });
  const KUNCI_SERI = [kol('dok', 'Kode Dokumen', 'dok', 1), kol('kantor', 'Kode Kantor', 'kantor', 1), kol('nomor', 'Nomor Dokumen', 'nomor', 1),
    kol('tanggal', 'Tanggal Dokumen', 'tanggal', 1), kol('seri', 'Seri Barang', 'bulat', 1), kol('hs', 'HS Code', 'hs')];
  const temuan = ref => KUNCI_SERI.concat([
    kol('noSt', 'Nomor ST', 'ref', 1), kol('tglSt', 'Tanggal ST', 'tanggal'), kol('noLha', 'Nomor ' + ref, 'ref', 1), kol('tglLha', 'Tanggal ' + ref, 'tanggal', 1),
    kol('awal', 'Tanggal Awal Periode', 'tanggal', 0, ['Tanggal Awal Periode Audit']), kol('akhir', 'Tanggal Akhir Periode', 'tanggal', 0, ['Tanggal Akhir Periode Audit']),
    kol('hsTetap', 'HS Penetapan', 'hs', 1), kol('bm', 'Tarif BM Penetapan', 'persen', 1), kol('ppn', 'Tarif PPN Penetapan', 'persen'), kol('pph', 'Tarif PPh Penetapan', 'persen'),
    kol('ket', 'Uraian Temuan', 'teks')
  ]);
  const JENIS = {
    audit: { nama: 'Audit', ref: 'LHA', halaman: 'history', kolom: temuan('LHA') },
    penul: { nama: 'Penelitian Ulang', ref: 'LHPU', halaman: 'history', kolom: temuan('LHPU') },
    sirena: { nama: 'DNOA', ref: 'SIRENA', halaman: 'manual', kolom: KUNCI_SERI.concat([
      kol('tema', 'Tema', 'teks', 1, ['Nama Tema']), kol('jenis', 'Jenis Tema', 'teks'),
      kol('hsTetap', 'HS Penetapan', 'hs', 1), kol('bm', 'Tarif BM Penetapan', 'persen', 1), kol('ppn', 'Tarif PPN Penetapan', 'persen'), kol('pph', 'Tarif PPh Penetapan', 'persen'),
      kol('dnoa', 'Nomor DNOA', 'ref', 1), kol('tglDnoa', 'Tanggal DNOA', 'tanggal', 1), kol('sirena', 'Nomor SIRENA', 'ref'), kol('tglSirena', 'Tanggal SIRENA', 'tanggal'),
      kol('alasan', 'Alasan', 'teks')
    ]) }
  };

  // template .xlsx: satu sheet Template, judul kolom saja; data type tertanam di format kolom
  // (kode = Text supaya nol depan tetap, tanggal = dd/mm/yyyy, angka = General). rows opsional (file contoh / dummy)
  function templateXlsx(jenis, rows) {
    const E = root.SkpkEkspor;
    const kols = JENIS[jenis].kolom.map(c => ({ key: c.k, label: c.l, tipe: c.t === 'tanggal' ? 'tanggal' : c.t === 'persen' || c.t === 'bulat' ? 'angka' : 'teks', lebar: Math.max(14, c.l.length + 4) * 7 }));
    return E.xlsx(kols, rows || [], { sheet: 'Template', meta: null, formatKolom: true });
  }

  // ---------- populasi: kunci seri ----------
  const kunciPop = (kantor, nomor, tgl, seri) => banding(kantor) + '|' + banding(nomor) + '|' + String(tgl || '').slice(0, 10) + '|' + (+seri);
  const POP = new Map(D.ROWS.map(r => [kunciPop(r.kantorKode, r.noPib, r.tglDaftar, r.seri), r]));

  // ---------- penyimpanan ----------
  const bacaJson = (k, awal) => { try { return JSON.parse(localStorage.getItem(k)) || awal; } catch { return awal; } };
  let impor = bacaJson(KUNCI, {});
  const tulis = () => { try { localStorage.setItem(KUNCI, JSON.stringify(impor)); return true; } catch { return false; } };
  const daftar = jenisList => Object.values(impor).filter(x => !jenisList || jenisList.includes(x.jenis)).sort((a, b) => b.waktu.localeCompare(a.waktu));

  // temuan Audit / Penul yang sudah ada: jenis | kunci seri | nomor LHA (riwayat mesin dan import yang masih Approval)
  function temuanAda() {
    const ada = new Map();
    for (const b of R.semua()) {
      if (b.jenis === 'notul') continue;
      for (const x of b.baris) {
        if (x.rowId == null) continue;
        const y = M.ROWS[x.rowId];
        ada.set(b.jenis + '|' + y[M.P.aju] + '|' + y[M.P.seri] + '|' + banding(b.noLha), 'Seri sudah ada di Riwayat Penetapan' + (b.impor ? ' (' + b.impor + ')' : ''));
      }
    }
    for (const a of daftar(['audit', 'penul'])) if (a.status === 'review') for (const x of a.baris) ada.set(a.jenis + '|' + x.kunci + '|' + banding(x.noLha), 'Seri sedang menunggu Approval di ' + a.id);
    return ada;
  }
  // seri SIRENA Manual yang masih menunggu Approval di upload lain
  function manualMenunggu() {
    const m = new Map();
    for (const a of daftar(['sirena'])) if (a.status === 'review') for (const x of a.baris) m.set(x.kunci, a.id);
    return m;
  }

  // ---------- periksa satu file ----------
  // hasil { baris: [data bersih], galat: [{ baris (nomor baris Excel), kolom, nilai, pesan }] }; satu galat = file ditolak
  async function periksa(jenis, file) {
    const J = JENIS[jenis];
    let data;
    try { data = await baca(file); } catch (e) { return { baris: [], galat: [{ baris: '', kolom: '', nilai: '', pesan: e.message || 'File tidak bisa dibaca.' }] }; }
    const galat = [];
    const salah = (baris, kolom, nilai, pesan) => galat.push({ baris, kolom, nilai: nilai == null ? '' : String(nilai), pesan });
    // 1. judul kolom: baris pertama (dari 5 teratas) yang paling banyak cocok dengan template
    const kenal = new Map(J.kolom.flatMap(c => [c.l, ...c.a].map(l => [normJudul(l), c])));
    let hj = 0, skor = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const n = (data[i] || []).filter(v => kenal.has(normJudul(v))).length;
      if (n > skor) { skor = n; hj = i; }
    }
    const judul = data[hj] || [];
    const peta = []; // indeks kolom file -> definisi template
    const terpakai = new Set();
    judul.forEach((j, i) => {
      if (kosong(j)) return;
      const c = kenal.get(normJudul(j));
      if (!c) return salah(hj + 1, teks(j), '', 'Kolom tidak ada di template');
      if (terpakai.has(c.k)) return salah(hj + 1, c.l, '', 'Kolom ganda');
      terpakai.add(c.k);
      peta[i] = c;
    });
    for (const c of J.kolom) if (c.w && !terpakai.has(c.k)) salah(hj + 1, c.l, '', 'Kolom wajib tidak ada');
    if (galat.length) return { baris: [], galat };

    const ada = jenis === 'sirena' ? null : temuanAda();
    const tunggu = jenis === 'sirena' ? manualMenunggu() : null;
    const dilihat = new Map();
    const hasil = [];
    for (let i = hj + 1; i < data.length; i++) {
      const row = data[i] || [];
      if (row.every(kosong)) continue;
      const no = i + 1;
      const v = {};
      let ok = true;
      // 2-3. data type dan kolom wajib
      peta.forEach((c, j) => {
        if (!c) return;
        const mentah = row[j];
        if (kosong(mentah)) { if (c.w) { salah(no, c.l, '', 'Isian wajib kosong'); ok = false; } return; }
        const h = TIPE[c.t].ubah(mentah);
        if (h.galat) { salah(no, c.l, mentah, h.galat); ok = false; } else v[c.k] = h.v;
      });
      if (!ok) continue;
      // 4. kebenaran seri: harus ada di populasi jenis dokumen itu
      if (v.dok !== DK.AKTIF) { salah(no, 'Kode Dokumen', DK.label(v.dok), 'Data ' + DK.label(v.dok) + ' belum tersedia'); continue; }
      const r = POP.get(kunciPop(v.kantor, v.nomor, v.tanggal, v.seri));
      if (!r) { salah(no, 'Seri Barang', [v.kantor, v.nomor, D.tgl(v.tanggal), v.seri].join(' / '), 'Seri tidak ditemukan di data ' + DK.label(v.dok) + ' (Kode Kantor / Nomor / Tanggal / Seri)'); continue; }
      // 5. cek silang HS Code dengan data
      if (v.hs && v.hs !== r.hs) { salah(no, 'HS Code', v.hs, 'Berbeda dengan HS diberitahukan ' + D.fmtHs(r.hs)); continue; }
      // 6. duplikat dalam file
      const sidik = r.kunci + '|' + (jenis === 'sirena' ? '' : banding(v.noLha));
      if (dilihat.has(sidik)) { salah(no, 'Seri Barang', v.seri, 'Duplikat baris ' + dilihat.get(sidik)); continue; }
      dilihat.set(sidik, no);
      // 7. duplikat di SKPK
      if (jenis === 'sirena') {
        const s = B.status(r);
        if (s && s.status === 'sirena') { salah(no, 'Seri Barang', v.seri, 'Sudah ada di SKPK dengan status ' + B.label(s)); continue; }
        if (tunggu.has(r.kunci)) { salah(no, 'Seri Barang', v.seri, 'Sedang menunggu Approval di ' + tunggu.get(r.kunci)); continue; }
      } else {
        const d = ada.get(jenis + '|' + r.kunci + '|' + banding(v.noLha));
        if (d) { salah(no, 'Nomor ' + J.ref, v.noLha, 'Series ' + d); continue; }
      }
      if (v.awal && v.akhir && v.awal > v.akhir) { salah(no, 'Tanggal Akhir Periode', D.tgl(v.akhir), 'Lebih awal dari Tanggal Awal Periode'); continue; }
      hasil.push({ n: no, kunci: r.kunci, ...v });
    }
    if (!hasil.length && !galat.length) salah('', '', '', 'File tidak berisi data.');
    return { baris: galat.length ? [] : hasil, galat };
  }

  // ---------- alur: ajukan, setujui, tolak, hapus ----------
  const boleh = {
    impor: () => B.peranKini() !== 'senior',
    tinjau: () => B.peranKini() !== 'junior',
    hapus: () => B.peranKini() === 'admin'
  };
  const dua = n => String(n).padStart(2, '0');
  function nomorBaru(waktu) {
    const d = new Date(waktu);
    let no;
    do no = 'IMP-' + d.getFullYear() + dua(d.getMonth() + 1) + dua(d.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000));
    while (impor[no]);
    return no;
  }
  // satu file = satu pengajuan import (hanya file yang lolos periksa)
  function ajukan(jenis, file, baris) {
    if (!boleh.impor() || !JENIS[jenis] || !baris.length) return null;
    const waktu = new Date().toISOString();
    const oleh = B.penggunaKini().id;
    const id = nomorBaru(waktu);
    impor[id] = { id, jenis, file, oleh, waktu, status: 'review', baris, riwayat: [{ aksi: 'ajukan', oleh, waktu, catatan: '' }] };
    return tulis() ? impor[id] : (delete impor[id], null);
  }
  // Approve: Audit / Penul masuk riwayat mesin (satu batch per nomor LHA / LHPU); SIRENA Manual menimpa entri Basket.
  // Hasil { ok, muatUlang } (mesin flag dihitung saat halaman dimuat, jadi Audit / Penul perlu muat ulang)
  function setujui(id, catatan) {
    const a = impor[id];
    if (!a || a.status !== 'review' || !boleh.tinjau()) return null;
    const waktu = new Date().toISOString();
    const oleh = B.penggunaKini().id;
    if (a.jenis === 'sirena') {
      if (!B.sirenaManual(a.baris, a.id, a.oleh, waktu)) return null;
    } else {
      const grup = new Map();
      for (const x of a.baris) { const g = banding(x.noLha); if (!grup.has(g)) grup.set(g, []); grup.get(g).push(x); }
      for (const xs of grup.values()) {
        const x0 = xs[0];
        const b = R.tambah({
          jenis: a.jenis, dok: DK.AKTIF, impor: a.id, file: a.file, oleh: a.oleh, catatan: a.id,
          noSt: x0.noSt, tglSt: x0.tglSt || '', noLha: x0.noLha, tglLha: x0.tglLha, periodeAwal: x0.awal || '', periodeAkhir: x0.akhir || '',
          baris: xs.map(x => {
            const r = D.PER_KUNCI.get(x.kunci);
            return { kunci: { aju: r.aju, noPib: r.noPib, tglPib: r.tglDaftar, kantor: r.kantorKode, seri: r.seri }, uraian: r.uraian || '', hsAsal: r.hs,
              tarifAsal: typeof r.trfBm === 'number' ? r.trfBm : null, hsTetap: x.hsTetap, tarifTetap: x.bm, ppnTetap: x.ppn ?? null, pphTetap: x.pph ?? null, ket: x.ket || '' };
          })
        });
        if (!b) return null;
      }
    }
    a.status = 'setuju';
    a.riwayat.push({ aksi: 'setujui', oleh, waktu, catatan: catatan || '' });
    tulis();
    return { ok: true, muatUlang: a.jenis !== 'sirena' };
  }
  function tolak(id, catatan) {
    const a = impor[id];
    if (!a || a.status !== 'review' || !boleh.tinjau() || !catatan) return null;
    a.status = 'tolak';
    a.riwayat.push({ aksi: 'tolak', oleh: B.penggunaKini().id, waktu: new Date().toISOString(), catatan });
    tulis();
    return a;
  }
  // Delete (Admin, bypass): file yang menunggu atau sudah Approved; jejaknya tetap (status hapus). Audit / Penul perlu muat ulang
  function hapus(id, catatan) {
    const a = impor[id];
    if (!a || a.status === 'hapus' || !boleh.hapus() || !catatan) return null;
    const tadi = a.status;
    if (tadi === 'setuju') {
      if (a.jenis === 'sirena') B.hapusManual(a.id);
      else for (const b of R.semua().filter(b => b.impor === a.id)) R.hapus(b.id);
    }
    a.status = 'hapus';
    a.riwayat.push({ aksi: 'hapus', oleh: B.penggunaKini().id, waktu: new Date().toISOString(), catatan, dari: tadi });
    tulis();
    return { ok: true, muatUlang: tadi === 'setuju' && a.jenis !== 'sirena' };
  }

  const ambil = id => impor[id] || null;
  const peristiwa = (a, aksi) => a.riwayat.slice().reverse().find(e => e.aksi === aksi) || null;
  // file yang menunggu keputusan (badge ikon di Browse, notifikasi)
  const menunggu = halaman => (boleh.tinjau() ? daftar().filter(a => a.status === 'review' && (!halaman || JENIS[a.jenis].halaman === halaman)) : []);

  // notifikasi untuk B.notifikasi: Import needs approval (Analis 2 / Admin), Import rejected (pengunggah; hilang setelah dibuka)
  function notifikasi(baca) {
    const p = B.penggunaKini();
    const d = [];
    for (const a of menunggu()) d.push({ id: a.id + '#' + a.riwayat.length, jenis: 'impor', impor: a.id, halaman: JENIS[a.jenis].halaman, tema: a.file, ket: JENIS[a.jenis].nama + ' · ' + a.baris.length + ' baris', waktu: a.waktu, catatan: '' });
    for (const a of daftar()) {
      if (a.status !== 'tolak' || a.oleh !== p.id) continue;
      const e = peristiwa(a, 'tolak');
      const nid = a.id + '#' + a.riwayat.length;
      if (!baca.has(nid)) d.push({ id: nid, jenis: 'imporTolak', impor: a.id, halaman: JENIS[a.jenis].halaman, tema: a.file, ket: JENIS[a.jenis].nama, waktu: e.waktu, catatan: e.catatan });
    }
    return d;
  }

  const NAMA_STATUS = { review: 'Approval', setuju: 'Disetujui', tolak: 'Ditolak', hapus: 'Dihapus' };

  root.SkpkImpor = { JENIS, TIPE, templateXlsx, periksa, ajukan, setujui, tolak, hapus, daftar, ambil, peristiwa, menunggu, notifikasi, boleh, NAMA_STATUS, tanggal, angka };
})(window);
