/*
 * SKPK v2: router hash + lima halaman dengan tampilan CEISA 4.0 Smart PCC (As-Is).
 *   #/smart-pcc/browse-pib                              Browse Data PIB (Menu 1: cari, flag RE, turunkan ke basket)
 *   #/smart-pcc/browse-pib/transaksional/<id>           Data Transaksional (Aksi biru di Browse)
 *   #/smart-pcc/penelitian-skpk                         Profil Komoditas (Menu 2: basket, HS penetapan, potensi, SIRENA)
 *   #/smart-pcc/penelitian-skpk/detail-skpk/<id>        Detail Profil Komoditas (Aksi biru di Profil)
 *   #/smart-pcc/penelitian-skpk/data-history            Data History Penelitian SKPK
 * Isian yang disimpan (basket, Hasil Penelitian) hanya di localStorage peramban.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_ASLI;
  const B = root.SkpkBasket;
  const { angka, rupiah, tgl } = D;

  // ---------- ikon (garis, currentColor) ----------
  const svg = (d, isi) => `<svg viewBox="0 0 24 24" fill="${isi ? 'currentColor' : 'none'}" stroke="${isi ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IKON = {
    cari: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    grafik: svg('<path d="M4 20V4M4 20h16M9 16v-5M13 16V8M17 16v-3"/>'),
    daftar: svg('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
    pena: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
    dok: svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>'),
    gedung: svg('<path d="M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8"/>'),
    unggahAwan: svg('<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8"/><path d="M12 12v8M9 15l3-3 3 3"/>'),
    kalender: svg('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>'),
    segar: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
    unduh: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    unggah: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
    riwayat: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3"/>'),
    simpan: svg('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'),
    tambah: svg('<path d="M12 5v14M5 12h14"/>'),
    kurang: svg('<path d="M5 12h14"/>'),
    kembali: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    petir: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    cekLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    xLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
    infoLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
    menuPcc: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h3M14 18l4-4 2 2-4 4h-2z"/>'),
    ai: svg('<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#7c83f2" stroke="none"/>'),
    monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    bendera: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    info: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h10"/>'),
    pemeriksa: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="11" cy="11" r="3"/><path d="M13 13l3 3"/>'),
    keranjang: svg('<path d="M3 4h2l2 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>'),
    dolar: svg('<circle cx="12" cy="12" r="9"/><path d="M15 9a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2a3 3 0 0 1-3-1.5M12 6v1.5M12 16.5V18"/>'),
    larangan: svg('<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>')
  };
  root.IKON = IKON;

  // ikon statis di kerangka (index.astro)
  const NAMA_IKON = { cari: 'cari', 'menu-pcc': 'menuPcc', ai: 'ai' };
  document.querySelectorAll('[data-ikon]').forEach(el => { el.innerHTML = IKON[NAMA_IKON[el.dataset.ikon]] || ''; });

  const esc = root.esc;
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');

  // ---------- penyimpanan lokal (aman bila diblokir) ----------
  const simpanan = {
    baca(k, awal) { try { const v = localStorage.getItem('skpk-asli:' + k); return v ? JSON.parse(v) : awal; } catch { return awal; } },
    tulis(k, v) { try { localStorage.setItem('skpk-asli:' + k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };

  // ---------- toast & modal ----------
  function toast(tipe, judul, pesan) {
    const el = document.createElement('div');
    el.className = 'toast ' + tipe;
    const ik = tipe === 'ok' ? IKON.cekLingkaran : tipe === 'galat' ? IKON.xLingkaran : IKON.infoLingkaran;
    el.innerHTML = `<span class="ik">${ik}</span><div><b>${esc(judul)}</b><p>${esc(pesan)}</p></div><button class="tutup" aria-label="Tutup">×</button>`;
    $('#toast').appendChild(el);
    const buang = () => el.remove();
    el.querySelector('.tutup').onclick = buang;
    setTimeout(buang, 4000);
  }

  function modal(judul, isiHtml, tombol) {
    const lap = document.createElement('div');
    lap.className = 'modal-latar';
    lap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(judul)}">
      <div class="modal-kepala">${esc(judul)}<button class="tutup" aria-label="Tutup">×</button></div>
      <div class="modal-isi">${isiHtml}</div>
      <div class="modal-kaki">${(tombol || [{ teks: 'Tutup', kelas: 'btn-garis' }]).map((t, i) => `<button class="btn ${t.kelas}" data-i="${i}">${t.teks}</button>`).join('')}</div>
    </div>`;
    const tutup = () => { lap.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') tutup(); };
    document.addEventListener('keydown', esc_);
    lap.addEventListener('click', e => {
      if (e.target === lap || e.target.closest('.tutup')) return tutup();
      const b = e.target.closest('[data-i]');
      if (b) { const t = (tombol || [])[b.dataset.i]; if (t && t.aksi) t.aksi(); tutup(); }
    });
    $('#lapisan').appendChild(lap);
  }

  function pilihFile(terima, saatDipilih) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = terima;
    inp.onchange = () => { if (inp.files[0]) saatDipilih(inp.files[0]); };
    inp.click();
  }

  function unduhCsv(nama, kolom, rows) {
    const sel = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const isi = [kolom.map(k => sel(k.label)).join(','), ...rows.map(r => kolom.map(k => sel(k.nilai ? k.nilai(r) : r[k.key])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8' }));
    a.download = nama;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- kerangka: token, sidebar ----------
  let sisa = 11 * 3600 + 54 * 60 + 1;
  setInterval(() => {
    sisa = Math.max(0, sisa - 1);
    const p = n => String(n).padStart(2, '0');
    $('#token').textContent = `${p(Math.floor(sisa / 3600))}:${p(Math.floor(sisa / 60) % 60)}:${p(sisa % 60)}`;
  }, 1000);

  $('#btnCiut').onclick = () => $('#app').classList.add('ciut');
  $('#btnLebar').onclick = () => $('#app').classList.remove('ciut');
  $('#sbPcc').onclick = () => $('.sb-menu').classList.toggle('buka');
  $('#sbSkpk').onclick = () => $('.sb-anak').classList.toggle('tutup');
  const saringMenu = () => {
    const q = $('#cariMenu').value.trim().toLowerCase();
    document.querySelectorAll('.sb-menu').forEach(m => { m.hidden = q && !m.dataset.cari.includes(q); });
  };
  $('#cariMenu').addEventListener('input', saringMenu);
  $('#hapusCari').onclick = () => { $('#cariMenu').value = ''; saringMenu(); $('#cariMenu').focus(); };

  // ---------- bagian bersama ----------
  const STAT_LABEL = [
    ['Jumlah Entitas / NPWP', 'entitas', 'merah'], ['Jumlah PIB', 'pib', 'kuning'], ['Jumlah Seri Barang', 'seri', 'hijau'], ['Jumlah Kantor', 'kantor', 'biru'],
    ['HS Code Terbanyak', 'hs', 'merah'], ['Tarif BM Terbanyak', 'tarif', 'kuning'], ['Kode Skep Terbanyak', 'skep', 'hijau'], ['Total Nilai Devisa', 'devisa', 'biru']
  ];
  function htmlStat(st) {
    const nilai = (k, v) => (v == null ? '-' : k === 'devisa' ? 'Rp. ' + Math.round(v).toLocaleString('id-ID') + (Math.round(v) === v ? '' : ',' + String(Math.round((v % 1) * 100)).padStart(2, '0')) : typeof v === 'number' && k !== 'tarif' ? v.toLocaleString('id-ID') : v);
    const kartu = ([lbl, k, w]) => `<div class="stat w-${w}${st ? '' : ' muat'}"><div class="lbl">${lbl}</div><div class="nil">${st ? esc(nilai(k, st[k])) : ''}</div><span class="chip"></span></div>`;
    return `${st ? '' : '<div class="memuat"><span class="bar"></span><span>⟳ Loading infografis...</span></div>'}
      <div class="stat-grid">${STAT_LABEL.slice(0, 4).map(kartu).join('')}</div>
      <div class="stat-grid">${STAT_LABEL.slice(4).map(kartu).join('')}</div>`;
  }
  // tampilkan kerangka statistik sebentar seperti CEISA memuat infografis, lalu isi
  function isiStat(el, rows) {
    el.innerHTML = htmlStat(null);
    setTimeout(() => { if (el.isConnected) el.innerHTML = htmlStat(D.statistik(rows)); }, 450);
  }

  const flagHtml = v => `<span class="flag ${v ? 'y' : 'n'}">${v ? 'Y' : 'N'}</span>`;
  const t = v => esc(v == null || v === '' ? '-' : v);

  // ---------- kolom ----------
  const K = {
    uraian: { key: 'uraian', label: 'Uraian Barang', saring: 'teks', lebar: 190 },
    tipe: { key: 'tipe', label: 'Tipe', saring: 'teks', lebar: 140 },
    merk: { key: 'merk', label: 'Merk', saring: 'teks', lebar: 130 },
    hs: { key: 'hs', label: 'HS Code', saring: 'teks', lebar: 120 },
    hsSaran: { key: 'hsSaran', label: 'HS Suggestion', saring: 'teks', lebar: 120 },
    trfBm: { key: 'trfBm', label: 'Tarif BM Diberitahukan', saring: 'teks', lebar: 140 },
    trfSaran: { key: 'trfSaran', label: 'Tarif Suggestion', saring: 'teks', lebar: 130, isi: r => (r.trfSaran == null ? '-' : r.trfSaran + '%') },
    skep: { key: 'skep', label: 'Kode Skep Fasilitas', saring: 'pilih', lebar: 190 },
    perusahaan: { key: 'perusahaan', label: 'Nama Perusahaan', saring: 'teks', lebar: 170 },
    npwp: { key: 'npwp', label: 'NPWP', saring: 'teks', lebar: 150 },
    kantor: { key: 'kantor', label: 'Kode Kantor', saring: 'pilih', lebar: 190 },
    kanwil: { key: 'kanwil', label: 'Nama Kanwil', saring: 'pilih', lebar: 150, opsi: [] },
    noPib: { key: 'noPib', label: 'Nomor PIB', saring: 'teks', lebar: 110 },
    dokumen: { key: 'dokumen', label: 'Kode Dokumen', saring: 'pilih', lebar: 140, nilai: () => 'BC 2.0', isi: () => 'BC 2.0', opsi: ['BC 2.0'] },
    aju: { key: 'aju', label: 'Nomor Aju', saring: 'teks', lebar: 170 },
    tglDaftar: { key: 'tglDaftar', label: 'Tanggal Daftar', saring: 'tanggal', lebar: 140, isi: r => tgl(r.tglDaftar) },
    waktuRekam: { key: 'waktuRekam', label: 'Waktu Rekam', saring: 'tanggal', lebar: 140, isi: r => tgl(r.waktuRekam) },
    pemasok: { key: 'pemasok', label: 'Nama Pemasok', saring: 'teks', lebar: 180 },
    seri: { key: 'seri', label: 'Seri Barang', saring: 'teks', lebar: 120 },
    satuan: { key: 'satuan', label: 'Kode Satuan', saring: 'teks', lebar: 120 },
    jenisSatuan: { key: 'satuan', label: 'Jenis Satuan', saring: 'teks', lebar: 120 },
    jmlSatuan: { key: 'jmlSatuan', label: 'Jumlah Satuan', saring: 'teks', lebar: 130, isi: r => angka(r.jmlSatuan) },
    jmlSatuanHarga: { key: 'jmlSatuan', label: 'Jumlah Satuan Harga', saring: 'teks', lebar: 150, isi: r => angka(r.jmlSatuan) },
    bmBayar: { key: 'bmBayar', label: 'Bea Masuk Dibayar', saring: 'teks', lebar: 150, isi: r => rupiah(r.bmBayar) },
    bmBayar2: { key: 'bmBayar', label: 'Bea Masuk Bayar', saring: 'teks', lebar: 150, isi: r => rupiah(r.bmBayar) },
    negara: { key: 'negara', label: 'Negara Asal', saring: 'pilih', lebar: 150 },
    negaraNama: { key: 'negaraNama', label: 'Negara Asal', saring: 'pilih', lebar: 170 },
    devisa: { key: 'devisa', label: 'Nilai Devisa IDR', saring: 'teks', lebar: 150, isi: r => rupiah(r.devisa) },
    jalur: { key: 'jalur', label: 'Status Jalur', saring: 'teks', lebar: 130 },
    jalurPilih: { key: 'jalur', label: 'Status Jalur', saring: 'pilih', lebar: 150 }
  };
  const flagKolom = (key, label, lebar = 170, ket) => ({ key: 'f_' + key, label, saring: 'pilih', lebar, opsi: ['Y', 'N'], nilai: r => (r.flag[key] ? 'Y' : 'N'),
    isi: r => (ket && r[ket] ? `<span title="${esc(r[ket])}">${flagHtml(r.flag[key])}</span>` : flagHtml(r.flag[key])) });
  const ketKolom = (key, label, lebar = 150) => ({ key, label, saring: 'teks', lebar, isi: r => `<span title="${esc(r[key] || '')}">${t(r[key] && r[key].length > 60 ? r[key].slice(0, 60) + '…' : r[key])}</span>` });
  // flag berisi teks (sumber perluasan, jenis penetapan, status basket); merah = perlu perhatian, hijau = milik sendiri
  const flagTeks = (teks, ket, warna = 'y') => (teks ? `<span class="flag ${warna}" title="${esc(ket || '')}">${esc(teks)}</span>` : flagHtml(false));

  // kolom tambahan Browse PIB (catatan rapat no. 3, 4; slide 1): tujuh kolom pertama dibekukan, jadi dibuat ringkas
  const KB = {
    kantor: { key: 'kantorKode', label: 'Kantor', saring: 'pilih', lebar: 80, isi: r => `<span title="${esc(r.kantor || '')}">${t(r.kantorKode)}</span>` },
    noPib: { key: 'noPib', label: 'No PIB', saring: 'teks', lebar: 80 },
    tgl: { key: 'tglDaftar', label: 'Tgl Daftar', saring: 'tanggal', lebar: 96, isi: r => tgl(r.tglDaftar) },
    seri: { key: 'seri', label: 'Seri', saring: 'teks', lebar: 60 },
    fas: { key: 'kodeFas', label: 'Kode Fas', saring: 'pilih', lebar: 80, isi: r => `<span title="${esc(r.kodeFasNama || '')}">${t(r.kodeFas)}</span>` },
    uraian: { ...K.uraian, lebar: 160 },
    harga: { key: 'hargaSatuan', label: 'Harga Satuan', saring: 'teks', lebar: 130, nilai: r => (r.hargaSatuan == null ? null : Math.round(r.hargaSatuan)),
      isi: r => (r.hargaSatuan == null ? '-' : rupiah(r.hargaSatuan) + ' / ' + esc(r.satuan || '')) },
    reInk: flagKolom('inkonsistensi', 'Flag RE Inkonsistensi', 150, 'ketInkonsistensi'),
    rePerluasan: { key: 'f_perluasan', label: 'Flag RE Perluasan', saring: 'pilih', lebar: 150, nilai: r => (r.perluasan.length ? r.perluasan.join(', ') : 'N'),
      isi: r => flagTeks(r.perluasan.join(', '), r.ketPerluasan) },
    reSka: flagKolom('ska', 'Flag RE SKA', 130, 'ketSka'),
    penetapan: { key: 'f_penetapan', label: 'Flag Penetapan Seri', saring: 'pilih', lebar: 160, nilai: r => (r.penetapan.length ? jenisPenetapan(r) : 'N'),
      isi: r => flagTeks(jenisPenetapan(r), r.penetapanTeks) },
    basket: { key: 'basket', label: 'Status Basket', saring: 'teks', lebar: 230, nilai: r => B.label(B.status(r)),
      isi: r => { const s = B.status(r); return s ? flagTeks(B.label(s), 'Tema: ' + s.tema, s.milikSaya ? 'n' : 'y') : '-'; } }
  };
  const jenisPenetapan = r => Array.from(new Set(r.penetapan.map(p => p.jenis))).join(', ');
  const BEKU_BROWSE = 7;

  // kolom basket di Profil Komoditas
  const isian = r => B.status(r) || {};
  const KP = {
    hsTetap: { key: 'hsTetap', label: 'HS Penetapan', saring: 'teks', lebar: 120, nilai: r => isian(r).hs || null, isi: r => t(isian(r).hs) },
    trfTetap: { key: 'trfTetap', label: 'Tarif BM Penetapan', saring: 'teks', lebar: 140, nilai: r => isian(r).bm, isi: r => (isian(r).bm == null ? '-' : isian(r).bm + '%') },
    potensi: { key: 'potensi', label: 'Potensi', saring: 'teks', lebar: 150, nilai: r => { const p = B.potensi(r); return p ? Math.round(p.selisih.total) : null; },
      isi: r => { const p = B.potensi(r); return p ? `<span title="${esc(`BM ${rupiah(p.selisih.bm)}, PPN ${rupiah(p.selisih.ppn)}, PPh ${rupiah(p.selisih.pph)}`)}">${rupiah(p.selisih.total)}</span>` : '-'; } },
    tema: { key: 'temaBasket', label: 'Tema Analisis', saring: 'pilih', lebar: 190, opsi: D.TEMA, nilai: r => isian(r).tema, isi: r => t(isian(r).tema) },
    catatan: { key: 'catatanBasket', label: 'Catatan', saring: 'teks', lebar: 170, nilai: r => isian(r).catatan || null,
      isi: r => { const c = isian(r).catatan; return `<span title="${esc(c || '')}">${t(c && c.length > 60 ? c.slice(0, 60) + '…' : c)}</span>`; } },
    status: { key: 'statusBasket', label: 'Status', saring: 'teks', lebar: 200, nilai: r => (isian(r).status === 'sirena' ? B.label(isian(r)) : 'Basket'),
      isi: r => { const s = isian(r); return s.status === 'sirena' ? flagTeks(B.label(s), 'Dikirim ' + tgl(s.sirena.waktu)) : flagTeks('Basket', '', 'n'); } }
  };

  const KOLOM_BROWSE = [KB.kantor, KB.noPib, KB.tgl, KB.seri, KB.fas, KB.uraian, KB.harga, K.jalur, K.tipe, K.merk, K.hs, K.trfBm, K.perusahaan, K.npwp,
    K.kanwil, K.aju, K.pemasok, K.satuan, K.jmlSatuan, K.bmBayar, K.negara, K.devisa, KB.reInk, KB.rePerluasan, KB.reSka, KB.penetapan, KB.basket];
  // Flag RE (Inkonsistensi, Perluasan, SKA) dipindah ke Browse PIB (slide 1c)
  const KOLOM_PROFIL = [K.uraian, K.tipe, K.merk, K.hs, K.hsSaran, K.trfBm, K.trfSaran, KP.hsTetap, KP.trfTetap, KP.potensi, K.skep, K.perusahaan, K.npwp, K.kanwil, K.kantor, K.noPib,
    K.dokumen, K.aju, K.tglDaftar, K.waktuRekam, K.pemasok, K.seri, K.jmlSatuanHarga, K.jenisSatuan, K.bmBayar2, K.negaraNama, K.devisa, K.jalurPilih,
    KP.tema, KP.catatan, KP.status,
    { key: 'umur', label: 'Umur Dokumen', saring: 'teks', lebar: 130, isi: r => (r.umur == null ? '-' : r.umur + ' hari') },
    flagKolom('p2', 'Flag P2', 140), flagKolom('analisis', 'Flag Analisis', 140), flagKolom('reassessment', 'Flag Re Assessment Nilai Pabean', 200),
    ketKolom('ketDnda', 'Ket. DNDA', 130), flagKolom('multi', 'Flag Multiparameter'), ketKolom('ketAudit', 'Ket. Periode Audit'),
    ketKolom('ketPenul', 'Ket. Penul'), ketKolom('ketNotul', 'Ket. Notul', 130)];

  // ================= Browse Data PIB =================
  const OPERATOR = ['CONTAINS', 'DOES NOT CONTAIN', 'BEGINS WITH', 'END WITH'];
  const browse = { baris: [{ kolom: '', op: '', nilai: '' }], regex: false, aktif: null };

  function cocokFilter(r, f, regex) {
    const k = KOLOM_BROWSE.find(x => x.key === f.kolom);
    const v = k ? (k.nilai ? k.nilai(r) : r[k.key]) : null;
    const s = v == null ? '' : String(k.key === 'tglDaftar' ? tgl(v) : v).toLowerCase();
    const q = f.nilai.toLowerCase();
    if (regex) {
      let re;
      try { re = new RegExp(f.op === 'BEGINS WITH' ? '^(?:' + f.nilai + ')' : f.op === 'END WITH' ? '(?:' + f.nilai + ')$' : f.nilai, 'i'); } catch { return false; }
      return f.op === 'DOES NOT CONTAIN' ? !re.test(s) : re.test(s);
    }
    if (f.op === 'CONTAINS') return s.includes(q);
    if (f.op === 'DOES NOT CONTAIN') return !s.includes(q);
    if (f.op === 'BEGINS WITH') return s.startsWith(q);
    return s.endsWith(q);
  }
  // checkbox flag RE di atas tabel (slide 1f): Show All = semua baris; dilepas = hanya baris ber-flag RE yang dicentang
  const RE = [['semua', 'Show All'], ['inkonsistensi', 'RE Inkonsistensi'], ['perluasan', 'Re Perluasan'], ['ska', 'Re SKA']];
  const pilihRe = { semua: true, inkonsistensi: true, perluasan: true, ska: true };
  const lolosRe = r => pilihRe.semua || RE.slice(1).some(([k]) => pilihRe[k] && r.flag[k]);

  function dataBrowse() {
    const f = browse.aktif;
    const rows = pilihRe.semua ? D.ROWS : D.ROWS.filter(lolosRe);
    if (!f) return rows;
    return rows.filter(r => f.baris.reduce((hasil, b, i) => {
      const c = cocokFilter(r, b, f.regex);
      return i === 0 ? c : b.sambung === 'OR' ? hasil || c : hasil && c;
    }, true));
  }

  // export Excel dari kolom tampil (catatan rapat no. 11)
  function unduhXlsx(nama, kolom, rows, judul) {
    const E = root.SkpkEkspor;
    const kols = kolom.map((k, i) => {
      const contoh = rows.map(r => (k.nilai ? k.nilai(r) : r[k.key])).find(v => v != null);
      return { key: 'c' + i, label: k.label, tipe: /^tgl|tanggal|waktu/i.test(k.key) ? 'tanggal' : typeof contoh === 'number' && !/seri/i.test(k.key) ? 'angka' : 'teks', lebar: k.lebar };
    });
    const isi = rows.map(r => Object.fromEntries(kolom.map((k, i) => [kols[i].key, k.nilai ? k.nilai(r) : r[k.key]])));
    E.unduh(E.xlsx(kols, isi, { sheet: judul, namaMeta: 'Keterangan', meta: [['Sumber', 'SKPK v2 - ' + judul], ['Jumlah baris', rows.length], ['Waktu export', new Date().toLocaleString('id-ID')]] }), nama, E.TIPE.xlsx);
  }

  function halBrowse() {
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak">${IKON.grafik}</span><h2>Browse Data PIB</h2></div>
          <div class="kartu-isi">
            <div id="statBrowse"></div>
            <div class="periode"><span class="ik">${IKON.kalender}</span>Periode Pengambilan Data: <b>${tgl('2024-11-02')} s/d ${tgl('2026-10-03')} (2 Tahun Terakhir s/d H-30)</b></div>
            <div class="af-kepala"><span class="label-kecil">ADVANCE FILTER</span>
              <label class="toggle"><input type="checkbox" id="afRegex" ${browse.regex ? 'checked' : ''}><span class="jalur"></span>Regex</label></div>
            <div id="afBaris"></div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-biru" id="afCari"><span class="ik">${IKON.cari}</span>Cari</button>
              <button class="btn btn-garis" id="afReset"><span class="ik">${IKON.segar}</span>Reset</button>
              <button class="btn btn-biru" id="afExport"><span class="ik">${IKON.unduh}</span>Export</button>
            </div>
          </div>
        </section>
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak">${IKON.daftar}</span><h2>Data PIB</h2>
            <div class="saring-re" id="saringRe">${RE.map(([k, l]) => `<label><input type="checkbox" data-re="${k}" ${pilihRe[k] ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
          <div class="kartu-isi" id="tblBrowse"></div>
        </section>
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak">${IKON.pena}</span><h2>Input Analisis</h2></div>
          <div class="kartu-isi">
            <textarea class="inp" id="anTeks" rows="4" style="width:100%" aria-label="Catatan analisis untuk seri yang dicentang" title="Catatan untuk seri yang dicentang (opsional)"></textarea>
            <select class="sel kosong" id="anTema" style="width:100%;margin-top:10px" aria-label="Tema analisis"><option value="">Tema Analisis</option>${D.TEMA.map(x => `<option>${esc(x)}</option>`).join('')}</select>
            <div class="baris-tombol" style="margin-top:14px"><button class="btn btn-biru" id="anSimpan" disabled title="Turunkan seri yang dicentang ke basket Profil Komoditas"><span class="ik">${IKON.simpan}</span>Simpan</button></div>
          </div>
        </section>
      </div>`;

    isiStat($('#statBrowse'), dataBrowse());

    // --- advance filter ---
    const wadahAf = $('#afBaris');
    const opsiKolom = pilih => `<option value="">${''}</option>` + KOLOM_BROWSE.map(k => `<option value="${k.key}" ${k.key === pilih ? 'selected' : ''}>${esc(k.label)}</option>`).join('');
    const opsiOp = pilih => `<option value=""></option>` + OPERATOR.map(o => `<option ${o === pilih ? 'selected' : ''}>${o}</option>`).join('');
    function gambarAf() {
      wadahAf.innerHTML = browse.baris.map((b, i) => `
        <div class="af-baris${i ? ' lanjut' : ''}" data-i="${i}">
          ${i ? `<select class="sel" data-f="sambung"><option ${b.sambung === 'AND' ? 'selected' : ''}>AND</option><option ${b.sambung === 'OR' ? 'selected' : ''}>OR</option></select>` : ''}
          <select class="sel${b.kolom ? '' : ' kosong'}" data-f="kolom" aria-label="Kolom">${opsiKolom(b.kolom)}</select>
          <select class="sel${b.op ? '' : ' kosong'}" data-f="op" aria-label="Operator">${opsiOp(b.op)}</select>
          <input class="inp" data-f="nilai" value="${esc(b.nilai)}" aria-label="Nilai">
          ${i ? `<button class="btn btn-merah btn-ikon" data-hapus title="Hapus baris"><span class="ik">${IKON.kurang}</span></button>` : `<button class="btn btn-biru btn-ikon" data-tambah title="Tambah baris"><span class="ik">${IKON.tambah}</span></button>`}
        </div>`).join('');
      cekCari();
    }
    const lengkap = b => b.kolom && b.op && b.nilai.trim();
    const cekCari = () => { $('#afCari').disabled = !browse.baris.every(lengkap); };
    wadahAf.addEventListener('input', e => {
      const f = e.target.dataset.f;
      if (!f) return;
      browse.baris[e.target.closest('[data-i]').dataset.i][f] = e.target.value;
      if (e.target.tagName === 'SELECT') e.target.classList.toggle('kosong', !e.target.value);
      cekCari();
    });
    wadahAf.addEventListener('click', e => {
      if (e.target.closest('[data-tambah]')) { browse.baris.push({ sambung: 'OR', kolom: '', op: '', nilai: '' }); gambarAf(); }
      const h = e.target.closest('[data-hapus]');
      if (h) { browse.baris.splice(Number(h.closest('[data-i]').dataset.i), 1); gambarAf(); }
    });
    wadahAf.addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#afCari').disabled) $('#afCari').click(); });
    $('#afRegex').onchange = e => { browse.regex = e.target.checked; };
    gambarAf();

    // --- input analisis = turunkan seri tercentang ke basket (catatan rapat no. 1; slide 2) ---
    // tabel belum ada saat render pertama memanggil cekAn
    let tabel = null;
    const cekAn = () => { $('#anSimpan').disabled = !(tabel && tabel.terpilih().length && $('#anTema').value); };

    tabel = root.buatTabel($('#tblBrowse'), {
      kolom: KOLOM_BROWSE,
      data: dataBrowse,
      centang: true,
      beku: BEKU_BROWSE,
      setelahRender: () => cekAn(),
      gayaInfo: 'from',
      aksi: () => `<button class="btn-aksi biru" data-aksi="trx" title="Data transaksional">${IKON.dok}</button><button class="btn-aksi kuning" data-aksi="perusahaan" title="Profil perusahaan">${IKON.gedung}</button>`,
      klikAksi(nama, r) {
        if (nama === 'trx') location.hash = '#/smart-pcc/browse-pib/transaksional/' + r.id;
        else modalPerusahaan(r);
      }
    });

    $('#afCari').onclick = () => {
      if (browse.regex) {
        const salah = browse.baris.find(b => { try { new RegExp(b.nilai); return false; } catch { return true; } });
        if (salah) return toast('galat', 'Regex Tidak Valid', `Pola "${salah.nilai}" tidak bisa dibaca.`);
      }
      browse.aktif = { baris: browse.baris.map(b => ({ ...b })), regex: browse.regex };
      tabel.render();
      isiStat($('#statBrowse'), dataBrowse());
    };
    $('#afReset').onclick = () => {
      browse.baris = [{ kolom: '', op: '', nilai: '' }];
      browse.regex = false;
      browse.aktif = null;
      $('#afRegex').checked = false;
      gambarAf();
      tabel.reset();
      isiStat($('#statBrowse'), dataBrowse());
    };

    $('#afExport').onclick = () => {
      const rows = tabel.terfilter();
      unduhXlsx('browse-data-pib.xlsx', KOLOM_BROWSE, rows, 'Browse Data PIB');
      toast('ok', 'Export Berhasil', `${rows.length.toLocaleString('id-ID')} baris diekspor ke Excel.`);
    };

    $('#saringRe').onchange = e => {
      const k = e.target.dataset.re;
      if (!k) return;
      pilihRe[k] = e.target.checked;
      tabel.render();
      isiStat($('#statBrowse'), dataBrowse());
    };

    $('#anTema').onchange = e => { e.target.classList.toggle('kosong', !e.target.value); cekAn(); };
    $('#anSimpan').onclick = () => {
      const rows = tabel.terpilih().map(id => D.PER_ID.get(id));
      const tema = $('#anTema').value;
      const h = B.tambah(rows, tema, $('#anTeks').value.trim());
      const lewat = [h.penetapan && `${h.penetapan} sudah ditetapkan (SPTNP/SPKTNP/LHA)`, h.terkunci && `${h.terkunci} ada di basket unit lain`,
        h.sudah && `${h.sudah} sudah ada di basket Anda`].filter(Boolean).join(', ');
      if (h.masuk) toast('ok', 'Berhasil', `${h.masuk} seri masuk basket Profil Komoditas, tema ${tema}.` + (lewat ? ` Dilewati: ${lewat}.` : ''));
      else toast('galat', 'Tidak Ada Seri Masuk', `Dilewati: ${lewat}.`);
      $('#anTeks').value = '';
      $('#anTema').value = '';
      $('#anTema').classList.add('kosong');
      tabel.kosongkanPilihan();
    };
  }

  function modalPerusahaan(r) {
    const rows = D.ROWS.filter(x => x.npwp === r.npwp);
    const st = D.statistik(rows);
    const merah = rows.filter(x => (x.jalurKode || '').startsWith('M')).length;
    const baris = [['Nama Perusahaan', r.perusahaan], ['NPWP', r.npwp], ['Jumlah PIB', st.pib.toLocaleString('id-ID')], ['Jumlah Seri Barang', st.seri.toLocaleString('id-ID')],
      ['HS Code Terbanyak', st.hs], ['Kantor', r.kantor], ['Seri Jalur Merah', merah.toLocaleString('id-ID')], ['Total Nilai Devisa', rupiah(st.devisa)]];
    modal('Profil Perusahaan', `<div class="daftar-id">${baris.map(([a, b]) => `<span>${a}</span><b>${t(b)}</b>`).join('')}</div>`);
  }

  // ================= Data Transaksional =================
  const PER_AJU = new Map();
  for (const r of D.ROWS) { if (!PER_AJU.has(r.aju)) PER_AJU.set(r.aju, []); PER_AJU.get(r.aju).push(r); }

  function halTransaksional(id) {
    const r = D.PER_ID.get(id);
    if (!r) return tidakAda('#/smart-pcc/browse-pib');
    const m = r.m;
    const barang = PER_AJU.get(r.aju).slice().sort((a, b) => a.seri - b.seri);
    const st = { tab: 'header', sub: 'data', pihak: 'importir' };
    const ro = (v, kelas = '') => `<div class="isi-ro ${kelas}">${t(v)}</div>`;
    const dua = (a, b) => `<div class="dua">${ro(a)}${ro(b)}</div>`;
    const cif = barang.reduce((s, x) => s + (x.m['CIF'] || 0), 0);
    // HS dan tarif ditetapkan: isian basket bila ada, selain itu HS Suggestion mesin, selain itu pemberitahuan
    const tetap = x => { const s = B.status(x); return s && s.hs ? { hs: s.hs, bm: s.bm } : { hs: x.hsSaran || x.hs, bm: x.hsSaran ? x.trfSaran : x.trfBm }; };

    const PIHAK = {
      importir: [['No.ID', m['Npwp Imp']], ['Nama', m['Nm Imp']], ['Alamat', '-']],
      penjual: [['Nama', m['Nm Pemasok']], ['Negara', m['Neg Pemasok']], ['Alamat', '-']],
      pemusatan: [['No.ID', '-'], ['Nama', '-'], ['Alamat', '-']],
      pemilik: [['No.ID', m['Npwp Ind']], ['Nama', m['Nm Ind']], ['Alamat', '-']],
      pengirim: [['Nama', m['Nm Pengirim']], ['Negara', m['Neg Pengirim']], ['Alamat', '-']]
    };

    function isiHeader() {
      const jalur = r.jalurKode || '';
      return `<div class="trx-grid">
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="panel"><div class="panel-kepala"><span class="ik">${IKON.daftar}</span>Header Dokumen Pabean</div>
            <div class="panel-isi isian">
              <span>Nomor / Tanggal Daftar</span><div class="dua garis">${ro(r.noPib)}<span>/</span>${ro(tgl(r.tglDaftar))}</div>
              <span>Nomor Pengajuan</span>${ro(r.aju)}
              <span>Kantor Pelayanan BC</span><div class="dua" style="grid-template-columns:90px 1fr">${ro(r.kantorKode)}${ro((r.kantor || '').split(' - ')[1])}</div>
              <span>Jenis Dokumen</span>${ro('BC 2.0', 'tengah')}
              <span>Cara Pembayaran</span>${ro(D.BAYAR[m['Jns Bayar']] || 'BIASA/TUNAI', 'tengah')}
              <span>Jenis Impor</span>${ro('UNTUK DIPAKAI', 'tengah')}
              <span>Jalur</span><div><span class="jalur-badge ${jalur.startsWith('M') ? 'm' : ''}">${t(r.jalur)}</span></div>
            </div></div>
          <div class="panel"><div class="panel-kepala"><span class="ik">${IKON.dok}</span>Dokumen Pelengkap Pabean</div>
            <div class="panel-isi isian">
              <span>Invoice</span>${dua('-', '-')}
              <span>L/C</span>${dua('-', '-')}
              <span>BL/AWB</span>${dua('-', '-')}
              <span>BC 1.1</span>${dua(m['No Bc11'], tgl(m['Tgl Bc11']))}
              <span>Pos</span>${dua(m['No Pos Bc11'], m['No Sub Pos Bc11'])}
              <span>Skep. Fasilitas</span>${dua(r.skepKode || '-', r.skep ? r.skep.split(' - ')[1] : '-')}
            </div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="panel"><div class="panel-kepala"><span class="ik">${IKON.gedung}</span>Identitas Perusahaan</div>
            <div class="panel-isi">
              <div class="tab-pil" id="tabPihak">${Object.keys(PIHAK).map(k => `<button data-pihak="${k}" class="${k === st.pihak ? 'aktif' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
              <div class="daftar-id">${PIHAK[st.pihak].map(([a, b]) => `<span>${a}</span><span>${t(b)}</span>`).join('')}</div>
            </div></div>
          <div class="panel"><div class="panel-kepala"><span class="ik">${IKON.dolar}</span>Nilai Barang</div>
            <div class="panel-isi isian empat">
              <span>Valuta</span><div class="dua" style="grid-template-columns:52px 1fr">${ro(m['Kd Val'])}${ro(D.VALUTA[m['Kd Val']] || m['Kd Val'])}</div>
              <span>NDPBM</span>${ro(angka(m['Ndpbm']))}
              <span>Kode Incoterm</span>${ro(m['Kode Incoterm'])}
              <span>Nilai Incoterm</span>${ro(angka(cif))}
              <span>Freight</span>${ro(angka(m['Freight']))}
              <span>Asuransi</span>${ro(angka(m['Asuransi']))}
              <span>Biaya Tambahan</span>${ro('0')}
              <span>Biaya Pengurang</span>${ro('0')}
              <span>Nilai VD</span>${ro('0')}
              <span></span><span></span>
              <span>Nilai Pabean</span>${ro(rupiah(cif * (m['Ndpbm'] || 1)))}
            </div></div>
        </div>
      </div>`;
    }

    function gambar() {
      const tabAtas = `<div class="tab-atas">
          <button data-tab="header" class="${st.tab === 'header' ? 'aktif' : ''}">Header</button>
          <button data-tab="audit" class="${st.tab === 'audit' ? 'aktif' : ''}">Analisis Audit</button>
          <button class="btn btn-biru" id="trxKembali" style="text-transform:none">Kembali</button>
        </div>`;
      let isi;
      if (st.tab === 'audit') {
        isi = `<div style="padding:18px 0">${r.ketAudit ? `<div class="isi-ro">${t(r.ketAudit)}</div>` : '<div class="analisis-kosong">Tidak ada data analisis audit</div>'}</div>`;
      } else {
        const sub = `<div class="tab-kotak">
            <button data-sub="data" class="${st.sub === 'data' ? 'aktif' : ''}"><span class="ik">${IKON.dok}</span>Data Header</button>
            <button data-sub="barang" class="${st.sub === 'barang' ? 'aktif' : ''}"><span class="ik">${IKON.keranjang}</span>Barang</button>
            <button data-sub="resume" class="${st.sub === 'resume' ? 'aktif' : ''}"><span class="ik">${IKON.cekLingkaran}</span>Resume Keputusan</button>
          </div>`;
        isi = sub + (st.sub === 'data' ? isiHeader() : '<div id="trxTabel"></div>');
      }
      view.innerHTML = `<div class="wadah">${tabAtas}${isi}</div>`;
      if (st.tab === 'header' && st.sub === 'barang') {
        root.buatTabel($('#trxTabel'), {
          kolom: [K.seri, K.hs, K.uraian, K.merk, K.tipe, K.jmlSatuan, K.satuan, K.negara, K.trfBm, K.bmBayar, K.devisa].map(k => ({ ...k, saring: false })),
          data: () => barang, gayaInfo: 'from'
        });
      } else if (st.tab === 'header' && st.sub === 'resume') {
        root.buatTabel($('#trxTabel'), {
          kolom: [
            { key: 'seri', label: 'Seri Barang', lebar: 90 }, { key: 'hs', label: 'HS Diberitahukan', lebar: 120 }, { key: 'hsTetap', label: 'HS Ditetapkan', lebar: 120, isi: x => t(tetap(x).hs) },
            { key: 'trfBm', label: 'Tarif BM Diberitahukan', lebar: 140 }, { key: 'trfTetap', label: 'Tarif BM Ditetapkan', lebar: 130, isi: x => t(tetap(x).bm) },
            { key: 'kep', label: 'Keputusan', lebar: 120, isi: x => (x.hs === tetap(x).hs ? '<span class="flag n">SESUAI</span>' : '<span class="flag y">PERUBAHAN</span>') }
          ],
          data: () => barang, gayaInfo: 'from'
        });
      }
    }

    view.onclick = e => {
      const b = e.target.closest('[data-tab],[data-sub],[data-pihak],#trxKembali');
      if (!b) return;
      if (b.id === 'trxKembali') return history.length > 1 ? history.back() : (location.hash = '#/smart-pcc/browse-pib');
      if (b.dataset.tab) st.tab = b.dataset.tab;
      if (b.dataset.sub) st.sub = b.dataset.sub;
      if (b.dataset.pihak) st.pihak = b.dataset.pihak;
      gambar();
    };
    gambar();
  }

  // ================= Profil Komoditas =================
  function halProfil() {
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu hm">
          <div class="hm-kepala"><span><span class="ik">${IKON.monitor}</span>Service Health Monitor</span>
            <button class="hm-refresh" id="hmRefresh"><span class="ik">${IKON.segar}</span>Refresh</button></div>
          <div class="hm-grid" id="hmGrid"></div>
        </section>
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak">${IKON.grafik}</span><h2>Profil Komoditas</h2>
            <a class="btn btn-biru" href="#/smart-pcc/penelitian-skpk/data-history"><span class="ik">${IKON.riwayat}</span>Data History</a></div>
          <div class="kartu-isi">
            <div id="statProfil"></div>
            <div class="baris-tombol" style="margin-top:18px">
              <select class="sel kosong" id="pkTema" style="width:240px;margin-right:auto" aria-label="Filter tema"><option value="">Semua Tema</option>${D.TEMA.map(x => `<option>${esc(x)}</option>`).join('')}</select>
              <button class="btn btn-garis biru" id="pkReset"><span class="ik">${IKON.segar}</span>Reset Filter</button>
              <button class="btn btn-garis biru" id="pkHs" title="Isi HS penetapan dan tarif BM untuk seri yang dicentang"><span class="ik">${IKON.pena}</span>Isi HS Penetapan</button>
              <button class="btn btn-kuning" id="pkImport"><span class="ik">${IKON.unggah}</span>Import</button>
              <button class="btn btn-biru" id="pkExport"><span class="ik">${IKON.unduh}</span>Export</button>
            </div>
          </div>
        </section>
        <section class="kartu"><div class="kartu-isi" id="tblProfil"></div>
          <div class="baris-tombol" style="padding:0 18px 18px"><button class="btn btn-biru" id="pkProses" style="padding:0 22px" title="Kirim seri yang dicentang ke SIRENA (siap DNOA)"><span class="ik">${IKON.petir}</span>Proses</button></div>
        </section>
      </div>`;

    const SERVIS = ['RE-Inkonsistensi Data', 'RE-Perluasan Penetapan', 'RE-SKA'];
    const gambarHm = cek => { $('#hmGrid').innerHTML = SERVIS.map(s => `<div class="hm-pil${cek ? ' cek' : ''}"><span class="ik${cek ? ' putar' : ''}">${cek ? IKON.segar : IKON.cekLingkaran}</span>${s}</div>`).join(''); };
    gambarHm(false);
    $('#hmRefresh').onclick = () => { gambarHm(true); setTimeout(() => { if ($('#hmGrid')) gambarHm(false); }, 900); };

    // isi tabel = basket milik sendiri, termasuk yang sudah dikirim ke SIRENA; filter Tema di atas tabel (slide 2.2a)
    let tema = '';
    const dataProfil = () => B.baris().filter(r => !tema || isian(r).tema === tema);
    isiStat($('#statProfil'), dataProfil());

    const tabel = root.buatTabel($('#tblProfil'), {
      kolom: KOLOM_PROFIL,
      data: dataProfil,
      centang: true,
      gayaInfo: 'dari',
      aksi: () => `<button class="btn-aksi biru" data-aksi="detail" title="Detail profil komoditas">${IKON.dok}</button><button class="btn-aksi kuning" data-aksi="unggah" title="Upload dokumen penelitian">${IKON.unggahAwan}</button>`,
      klikAksi(nama, r) {
        if (nama === 'detail') location.hash = '#/smart-pcc/penelitian-skpk/detail-skpk/' + r.id;
        else pilihFile('.pdf,.jpg,.png,.xlsx,.docx', f => toast('ok', 'Berhasil', `Dokumen "${f.name}" diunggah untuk PIB ${r.noPib} seri ${r.seri}.`));
      }
    });

    const segarkan = () => { tabel.render(); isiStat($('#statProfil'), dataProfil()); };
    const terpilih = () => tabel.terpilih().map(id => D.PER_ID.get(id));

    $('#pkTema').onchange = e => { tema = e.target.value; e.target.classList.toggle('kosong', !tema); segarkan(); };
    $('#pkReset').onclick = () => { tema = ''; $('#pkTema').value = ''; $('#pkTema').classList.add('kosong'); tabel.reset(); isiStat($('#statProfil'), dataProfil()); };
    $('#pkImport').onclick = () => pilihFile('.xlsx,.xls,.csv', f => toast('ok', 'Import Berhasil', `File "${f.name}" berhasil diunggah.`));
    $('#pkExport').onclick = () => {
      const rows = tabel.terfilter();
      unduhCsv('profil-komoditas.csv', KOLOM_PROFIL, rows);
      toast('ok', 'Export Berhasil', `${rows.length.toLocaleString('id-ID')} baris diekspor ke CSV.`);
    };

    // HS penetapan + tarif BM akhir untuk banyak seri sekaligus (catatan rapat no. 5, 6)
    $('#pkHs').onclick = () => {
      const rows = terpilih().filter(r => isian(r).status === 'basket');
      if (!rows.length) return toast('galat', 'Gagal Mengisi HS Penetapan', 'Centang minimal satu seri yang belum dikirim ke SIRENA.');
      const saran = Array.from(new Set(rows.map(r => isian(r).hs || r.hsSaran).filter(Boolean)));
      const adaFas = rows.some(r => r.kodeFas);
      modal('Isi HS Penetapan', `
        <div class="isian">
          <span>Seri dipilih</span><div class="ro">${rows.length.toLocaleString('id-ID')} seri</div>
          <span>HS Penetapan</span><input class="inp" id="hpHs" maxlength="10" inputmode="numeric" placeholder="8 digit" value="${esc(saran.length === 1 ? saran[0] : '')}">
          <span>Tarif BM Akhir (%)</span><input class="inp" id="hpBm" inputmode="decimal" placeholder="Kosong = tarif referensi (MFN / FTA) per seri" title="Isi bila tarif akhir bukan MFN">
          ${adaFas ? '<span></span><label class="toggle"><input type="checkbox" id="hpFas"><span class="jalur"></span>Tarif preferensi (FTA) ditolak</label>' : ''}
          <span>Alasan</span><textarea class="inp" id="hpAlasan" rows="3" aria-label="Alasan penetapan"></textarea>
        </div>`, [
        { teks: 'Batal', kelas: 'btn-garis' },
        { teks: 'Simpan', kelas: 'btn-biru', aksi: () => {
          const bm = $('#hpBm').value.trim().replace(',', '.');
          const hs = $('#hpHs').value.replace(/\D/g, '');
          const n = B.isiPenetapan(rows, { hs, bm: bm === '' ? null : Number(bm), fasDitolak: !!($('#hpFas') && $('#hpFas').checked), alasan: $('#hpAlasan').value.trim() });
          const total = rows.reduce((s, r) => s + ((B.potensi(r) || {}).selisih || { total: 0 }).total, 0);
          segarkan();
          toast('ok', 'Berhasil', `${n} seri ditetapkan HS ${D.fmtHs(hs)}. Total potensi ${rupiah(total)}.`);
        } }
      ]);
      // Simpan aktif bila HS 8 digit, tarif kosong atau 0-100, dan alasan terisi
      const simpan = $('#lapisan .modal-kaki [data-i="1"]');
      const cek = () => {
        const bm = $('#hpBm').value.trim().replace(',', '.');
        simpan.disabled = !(/^\d{8}$/.test($('#hpHs').value.replace(/\D/g, '')) && (bm === '' || (+bm >= 0 && +bm <= 100)) && $('#hpAlasan').value.trim());
      };
      $('#lapisan .modal').addEventListener('input', cek);
      cek();
      $('#hpHs').focus();
    };

    // Proses = kirim ke SIRENA (siap DNOA); seri tetap tampil di basket dengan nomor kiriman
    $('#pkProses').onclick = () => {
      const rows = terpilih();
      if (!rows.length) return toast('galat', 'Gagal Memproses Data', 'Pilih minimal satu data terlebih dahulu.');
      const siap = rows.filter(r => isian(r).status === 'basket' && isian(r).hs);
      if (!siap.length) return toast('galat', 'Gagal Memproses Data', 'Seri yang dipilih belum berisi HS penetapan atau sudah dikirim ke SIRENA.');
      const lewat = rows.length - siap.length;
      modal('Konfirmasi', `<p style="margin:0">Kirim <b>${siap.length}</b> seri ke SIRENA (siap DNOA)?${lewat ? ` ${lewat} seri lain dilewati karena belum berisi HS penetapan atau sudah dikirim.` : ''}</p>`, [
        { teks: 'Batal', kelas: 'btn-garis' },
        { teks: 'Proses', kelas: 'btn-biru', aksi: () => {
          const h = B.kirimSirena(siap);
          tabel.kosongkanPilihan();
          segarkan();
          toast('ok', 'Berhasil', `${h.jumlah} seri dikirim ke SIRENA dengan nomor ${h.nomor}.`);
        } }
      ]);
    };
  }

  // ================= Detail Profil Komoditas =================
  function halDetail(id) {
    const r = D.PER_ID.get(id);
    if (!r) return tidakAda('#/smart-pcc/penelitian-skpk');
    const hasil = simpanan.baca('hasil', {});
    const ro = v => `<div class="ro">${t(v)}</div>`;
    const s = B.status(r);
    const p = B.potensi(r);
    const FLAG = [
      ['Atensi Audit PFPD', r.flag.audit, r.ketAudit],
      ['RE Perluasan Penetapan', r.flag.perluasan, r.flag.perluasan ? r.perluasan.join(', ') + ' ' + r.ketPerluasan : null],
      ['RE Inkonsistensi Data', r.flag.inkonsistensi, r.ketInkonsistensi],
      ['RE SKA', r.flag.ska, r.ketSka],
      ['Penetapan Seri', r.penetapan.length > 0, r.penetapanTeks],
      ['re-Assessment Nilai Pabean', r.flag.reassessment, r.flag.reassessment ? `[Nilai Devisa ${rupiah(r.devisa)} di luar rentang nilai pembanding HS ${r.hs}]` : null],
      ['Flag Multiparameter', r.flag.multi, null],
      ['Basket', !!s, s ? `${B.label(s)}, tema ${s.tema}` + (s.hs ? `, HS penetapan ${D.fmtHs(s.hs)} tarif BM ${s.bm}%` : '') + (p ? `, potensi ${rupiah(p.selisih.total)}` : '') : null]
    ];
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak">${IKON.dok}</span><h2>Detail Profil Komoditas</h2>
            <a class="btn btn-garis" href="#/smart-pcc/penelitian-skpk"><span class="ik">${IKON.kembali}</span>Kembali</a></div>
          <div class="kartu-isi">
            <h3 class="sub-judul"><span class="ik">${IKON.info}</span>Informasi Dokumen</h3>
            <div class="form-grid">
              <label>Nomor Aju</label>${ro(r.aju)}<label>Kode Kantor</label>${ro(r.kantorKode)}
              <label>Nama Perusahaan</label>${ro(r.perusahaan)}<label>Tanggal Daftar</label>${ro(tgl(r.tglDaftar))}
              <label>NPWP</label>${ro(r.npwp)}
            </div>
            <hr class="pemisah">
            <h3 class="sub-judul"><span class="ik">${IKON.pemeriksa}</span>Analisis Audit</h3>
            ${r.ketAudit ? `<div class="analisis-kosong" style="font-style:normal;color:#374151">${t(r.ketAudit)}</div>` : '<div class="analisis-kosong">Tidak ada data analisis audit</div>'}
            <hr class="pemisah">
            <h3 class="sub-judul"><span class="ik">${IKON.bendera}</span>Flag</h3>
            <table class="tbl-flag"><thead><tr><th></th><th>Flag</th><th>Keterangan</th></tr></thead>
              <tbody>${FLAG.map(([a, f, k]) => `<tr><td>${a}</td><td>${f ? flagHtml(true) : ''}</td><td>${esc(k || '')}</td></tr>`).join('')}</tbody></table>
            <div class="hasil">
              <div class="hasil-kepala"><h3 class="sub-judul" style="margin:0"><span class="ik" style="color:var(--kuning)">${IKON.pena}</span>Hasil Penelitian</h3><span class="wajib">Wajib Diisi</span></div>
              <textarea class="inp" id="hpTeks" aria-label="Hasil penelitian">${esc(hasil[r.id] || '')}</textarea>
              <div class="baris-tombol" style="margin-top:12px"><button class="btn btn-biru" id="hpSimpan" disabled><span class="ik">${IKON.simpan}</span>Simpan Hasil Penelitian</button></div>
            </div>
          </div>
        </section>
      </div>`;
    const cek = () => { $('#hpSimpan').disabled = !$('#hpTeks').value.trim(); };
    $('#hpTeks').oninput = cek;
    cek();
    $('#hpSimpan').onclick = () => {
      const semua = simpanan.baca('hasil', {});
      semua[r.id] = $('#hpTeks').value.trim();
      simpanan.tulis('hasil', semua);
      toast('ok', 'Berhasil', 'Hasil penelitian berhasil disimpan.');
    };
  }

  // ================= Data History Penelitian SKPK =================
  function halHistory() {
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu">
          <div class="kartu-kepala"><span class="ikon-kotak kuning">${IKON.riwayat}</span><h2>Data History Penelitian SKPK</h2>
            <a class="btn btn-garis" href="#/smart-pcc/penelitian-skpk"><span class="ik">${IKON.kembali}</span>Kembali</a></div>
          <div class="kartu-isi"><div class="baris-tombol">
            <button class="btn btn-garis" id="dhReset"><span class="ik">${IKON.segar}</span>Reset Filter</button>
            <button class="btn btn-kuning" id="dhImport"><span class="ik">${IKON.unggah}</span>Import</button>
          </div></div>
        </section>
        <section class="kartu"><div class="kartu-isi" id="tblHistory"></div></section>
      </div>`;
    const tabel = root.buatTabel($('#tblHistory'), {
      nomor: true,
      kolom: [
        { key: 'jenis', label: 'Kode Audit/Penul', saring: 'pilih', lebar: 150 },
        { key: 'npwp', label: 'NPWP', saring: 'teks', lebar: 160 },
        { key: 'st', label: 'Nomor ST Audit', saring: 'teks', lebar: 160 },
        { key: 'awal', label: 'Tanggal Awal Periode Audit', saring: 'tanggal', lebar: 160, isi: x => tgl(x.awal) },
        { key: 'akhir', label: 'Tanggal Akhir Periode Audit', saring: 'tanggal', lebar: 160, isi: x => tgl(x.akhir) },
        { key: 'dokumen', label: 'Kode Dokumen', saring: 'teks', lebar: 130 },
        { key: 'kantor', label: 'Kode Kantor', saring: 'pilih', lebar: 190 },
        { key: 'noDaftar', label: 'Nomor Daftar', saring: 'teks', lebar: 130 },
        { key: 'tglDaftar', label: 'Tanggal Daftar', saring: 'tanggal', lebar: 140, isi: x => tgl(x.tglDaftar) },
        { key: 'seri', label: 'Seri Barang', saring: 'teks', lebar: 110 },
        { key: 'temuan', label: 'Uraian Temuan', saring: 'teks', lebar: 260, isi: x => `<span title="${esc(x.temuan || '')}">${t(x.temuan && x.temuan.length > 80 ? x.temuan.slice(0, 80) + '…' : x.temuan)}</span>` }
      ],
      data: () => D.HISTORY,
      gayaInfo: 'dari'
    });
    $('#dhReset').onclick = () => tabel.reset();
    $('#dhImport').onclick = () => pilihFile('.xlsx,.xls,.csv', f => toast('ok', 'Import Berhasil', `File "${f.name}" berhasil diunggah.`));
  }

  function tidakAda(balik) {
    view.innerHTML = `<div class="wadah"><div class="analisis-kosong">Data tidak ditemukan. <a href="${balik}" style="color:var(--biru)">Kembali</a></div></div>`;
  }

  // ---------- router ----------
  const RUTE = [
    [/^\/smart-pcc\/browse-pib$/, 'browse-pib', 'BROWSE DATA PIB', halBrowse],
    [/^\/smart-pcc\/browse-pib\/transaksional\/(\d+)$/, 'browse-pib', 'DATA TRANSAKSIONAL', m => halTransaksional(Number(m[1]))],
    [/^\/smart-pcc\/penelitian-skpk$/, 'penelitian-skpk', 'PROFIL KOMODITAS', halProfil],
    [/^\/smart-pcc\/penelitian-skpk\/detail-skpk\/(\d+)$/, 'penelitian-skpk', 'PROFIL KOMODITAS', m => halDetail(Number(m[1]))],
    [/^\/smart-pcc\/penelitian-skpk\/data-history$/, 'penelitian-skpk', 'PROFIL KOMODITAS', halHistory]
  ];
  function jalankan() {
    const jalan = location.hash.replace(/^#/, '') || '/';
    const rute = RUTE.find(([re]) => re.test(jalan));
    if (!rute) { location.replace('#/smart-pcc/browse-pib'); return; }
    const [re, menu, judul, fn] = rute;
    $('#judulHal').textContent = judul;
    document.querySelectorAll('.sb-daun a').forEach(a => a.classList.toggle('aktif', a.dataset.menu === menu));
    view.onclick = null;
    fn(jalan.match(re));
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', jalankan);
  jalankan();
})(window);
