/*
 * SKPK v2: analisa (Browse), Basket (Menu 2) dan Approval. Analisa (HS penetapan + tarif akhir BM, PPN, PPh, pungutan lain,
 * potensi) dikerjakan di Browse sebelum seri masuk basket (permintaan 5 Nov 2026: basket hanya berisi seri yang layak diajukan,
 * supaya basket tidak penuh seri berpotensi kecil). Save to theme hanya menerima seri yang sudah dianalisa; di basket tinggal dikirim.
 * Alur (pemisahan Analis 1, arahan atasan 5 Nov 2026): Analis 1 menganalisa di Browse -> seri masuk DRAFT miliknya sendiri
 * (orang lain tidak bisa mengubahnya) -> Analis 1 mereview draftnya lalu Kirim ke Basket (satu tema = satu pengajuan SUB-...).
 * Revisi 6 Nov 2026: kiriman Analis 1 masuk tahap Approval (di Browse, Analis 2 / Admin): Approve (-> Basket), Return (seri kembali
 * ke draft pengusulnya dengan catatan), Reject (seri bebas lagi di Browse, jejak di pengajuan), per seri / terpilih / satu pengajuan.
 * Basket hanya berisi seri yang sudah di-Approve: final, tanpa fitur kembalikan; tinggal Send to SIRENA (SRN-... per tema).
 * Warna baris (Browse dan Basket): putih = belum diklaim, kuning = Draft / Approval, hijau = Basket / SIRENA,
 * merah = expired, abu = sudah ditetapkan (SPTNP / SPKTNP / LHA) dan belum diklaim.
 * Seri yang sudah ditetapkan tetap boleh dianalisa (penetapan ulang); Browse memberi label sebelum menyimpannya.
 * Pengguna (pengganti login, dipilih di avatar kepala kartu): Analis 1 A, Analis 1 B, Analis 2, Admin. Kunci peran tetap junior / senior / admin.
 * Seri yang sudah ada di basket unit lain terkunci (tidak bisa diambil dua kali) dan tetap terlihat setelah masuk SIRENA.
 * Disimpan di localStorage peramban (skpk-v2:analisa, skpk-v2:basket, skpk-v2:pengajuan, skpk-v2:peran, skpk-v2:notif-baca).
 * Basket unit lain adalah contoh yang dibangkitkan tetap, tidak disimpan.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_ASLI;
  const T = root.SkpkTarif;
  const KUNCI = 'skpk-v2:basket';
  const KUNCI_AJU = 'skpk-v2:pengajuan';
  const KUNCI_PERAN = 'skpk-v2:peran';
  const KUNCI_BACA = 'skpk-v2:notif-baca';
  const KUNCI_CONTOH = 'skpk-v2:contoh-pengajuan';
  const KUNCI_ANALISA = 'skpk-v2:analisa';

  const bacaJson = (k, awal) => { try { return JSON.parse(localStorage.getItem(k)) || awal; } catch { return awal; } };
  const tulisJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  let milik = bacaJson(KUNCI, {});
  let aju = bacaJson(KUNCI_AJU, {});
  // analisa per seri (kunci baris) yang dibuat di Browse, juga untuk seri yang belum / tidak masuk basket
  let analisaSimpan = bacaJson(KUNCI_ANALISA, {});
  const tulis = () => tulisJson(KUNCI, milik);
  const tulisAju = () => tulisJson(KUNCI_AJU, aju);
  const tulisAnalisa = () => tulisJson(KUNCI_ANALISA, analisaSimpan);
  // jejak seri yang ditimpa import SIRENA Manual, untuk notifikasi pemilik lamanya: [{ id, oleh, n, tema: [], waktu, impor }]
  const KUNCI_TIMPA = 'skpk-v2:ditimpa';
  let ditimpa = bacaJson(KUNCI_TIMPA, []);

  // ---------- peran (pengganti login) ----------
  // kunci tetap junior / senior (tersimpan di peramban dan riwayat pengajuan), nama tampil Analis 1 / Analis 2
  const PERAN = {
    junior: { nama: 'Analis 1', inisial: 'A1', warna: '#1d6fc9' },
    senior: { nama: 'Analis 2', inisial: 'A2', warna: '#23a26d' },
    admin: { nama: 'Admin', inisial: 'AD', warna: '#7c3aed' },
    sirena: { nama: 'SIRENA', inisial: 'SR', warna: '#64748b' } // umpan balik sistem, bukan peran yang bisa dipilih
  };
  // pengguna simulasi (pengganti login). Peran Analis 1 dipegang banyak orang, jadi draft dipisah per orang (oleh = id pengguna)
  const PENGGUNA = [
    { id: 'a1a', peran: 'junior', nama: 'Analis 1 A' },
    { id: 'a1b', peran: 'junior', nama: 'Analis 1 B' },
    { id: 'a2', peran: 'senior', nama: 'Analis 2' },
    { id: 'admin', peran: 'admin', nama: 'Admin' }
  ];
  const PER_PENGGUNA = new Map(PENGGUNA.map(p => [p.id, p]));
  // nilai oleh / peran lama (sebelum pengguna dipisah) dipetakan ke pengguna pertama peran itu
  const LAMA = { junior: 'a1a', senior: 'a2', admin: 'admin' };
  const idPengguna = v => (PER_PENGGUNA.has(v) ? v : LAMA[v] || null);
  let pengguna = PER_PENGGUNA.get((() => { try { return idPengguna(localStorage.getItem(KUNCI_PERAN)); } catch { return null; } })() || 'a1a');
  const penggunaKini = () => pengguna;
  const peranKini = () => pengguna.peran;
  function gantiPengguna(id) {
    const p = PER_PENGGUNA.get(id);
    if (!p) return;
    pengguna = p;
    try { localStorage.setItem(KUNCI_PERAN, id); } catch { /* abaikan */ }
  }
  // nama / peran dari isian oleh (id pengguna, atau kunci peran lama)
  const namaOleh = v => { const p = PER_PENGGUNA.get(idPengguna(v)); return p ? p.nama : PERAN[v] ? PERAN[v].nama : v || ''; };
  const peranOleh = v => { const p = PER_PENGGUNA.get(idPengguna(v)); return p ? p.peran : v; };
  // Analis 1 menganalisa dan mengirim draftnya ke Basket; Analis 2 memegang Basket (Approve, Return, Reject, SIRENA); Admin semuanya
  const boleh = {
    analisa: () => peranKini() !== 'senior',
    ajukan: () => peranKini() !== 'senior',
    tinjau: () => peranKini() !== 'junior',
    basket: () => peranKini() !== 'junior'
  };
  const inisial = k => (PERAN[peranOleh(k)] || PERAN.junior).inisial;
  // entri milik pengguna aktif (Admin dianggap pemilik semua entri unit)
  const saya = s => !!s && (peranKini() === 'admin' || idPengguna(s.oleh) === pengguna.id);

  // ---------- contoh basket unit lain ----------
  // ±20 seri ber-flag RE yang belum ditetapkan, dipilih dengan hash tetap; sebagian sudah dikirim ke SIRENA
  const UNIT_LAIN = ['Kanwil DJBC Jawa Timur I', 'KPU BC Tipe A Tanjung Priok'];
  const CONTOH_TEMA = [['Stainless Flat 7220 HS Review', 'Priok Stainless Q3 Review'], ['Stainless Penul Expansion', 'Priok Audit Expansion 2026']];
  const CONTOH = new Map();
  D.ROWS.filter(r => (r.flag.inkonsistensi || r.flag.perluasan) && !r.terkunci && D.hash(r.kunci + '|basket') < 0.03).slice(0, 20).forEach((r, i) => {
    const h = D.hash(r.kunci + '|unit');
    const kirim = i % 3 === 0;
    CONTOH.set(r.kunci, {
      kunci: r.kunci, contoh: true, pemilik: UNIT_LAIN[h < 0.5 ? 0 : 1], waktu: '2026-10-' + String(10 + (i % 18)).padStart(2, '0'),
      tema: CONTOH_TEMA[r.flag.inkonsistensi ? 0 : 1][h < 0.5 ? 0 : 1], jenis: r.flag.inkonsistensi ? D.TEMA[0] : D.TEMA[3], catatan: '',
      hs: kirim ? r.hsSaran : null, bm: kirim ? r.trfSaran : null, fasDitolak: false, alasan: kirim ? 'Follows reference finding' : '',
      status: kirim ? 'sirena' : 'basket', sirena: kirim ? { nomor: 'SRN-202610' + String(10 + i).padStart(2, '0') + '-' + (1000 + Math.floor(h * 8999)), waktu: '2026-10-' + String(10 + i).padStart(2, '0') } : null
    });
  });

  // entri satu baris: unit sendiri (draft / di Basket / SIRENA; unit = true) didahulukan, lalu contoh unit lain; null bila belum diklaim.
  // milikSaya = draft / pengajuan pengguna aktif (Admin: semua entri unit)
  function status(r) {
    const s = milik[r.kunci];
    if (s) return { ...s, kunci: r.kunci, pemilik: namaOleh(s.oleh), unit: true, milikSaya: saya(s) };
    const c = CONTOH.get(r.kunci);
    return c ? { ...c, unit: false, milikSaya: false } : null;
  }
  // pemegang seri (kolom Status Basket di Browse): Draft / Approval = analis pengusul, Basket = unit (unit sendiri tanpa nama)
  const label = s => (!s ? null : s.status === 'sirena' ? 'SIRENA ' + s.sirena.nomor : s.status === 'draft' ? 'Draft - ' + s.pemilik
    : s.status === 'ajukan' ? 'Approval - ' + s.pemilik : s.unit ? 'Basket Nominasi' : 'Basket Nominasi - ' + s.pemilik);
  // seri yang sudah ditetapkan (notul / penul / audit: SPTNP / SPKTNP / LHA); masih boleh ditetapkan ulang (mis. 0% -> 5% -> 10%)
  const ditetapkan = r => !!(r.terkunci || (r.penetapan && r.penetapan.length));
  // sumber penetapan seri: notul (SPTNP) | penul (SPKTNP) | audit (LHA), dari riwayat dan kunci tarif mesin
  function sumberTetap(r) {
    const m = r.mesin || {};
    return Array.from(new Set([...(m.riwayat || []), ...(m.terkunci || [])].map(x => x.batch && x.batch.jenis).filter(Boolean)));
  }
  // batas penelitian ulang: 2 tahun sejak tanggal dokumen, dihitung dari hari halaman dibuka
  const HARI_INI = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const HARI_PERINGATAN = 30;
  function batasTanggal(r) {
    if (!r.tglDaftar) return null;
    const d = new Date(r.tglDaftar.slice(0, 10) + 'T00:00:00');
    d.setFullYear(d.getFullYear() + 2);
    return d;
  }
  // sisa hari sampai lewat 2 tahun (0 = hari terakhir, negatif = expired); null bila tanpa tanggal
  const sisaHari = r => { const b = batasTanggal(r); return b ? Math.round((b - HARI_INI) / 86400000) : null; };
  const kadaluarsa = r => { const n = sisaHari(r); return n != null && n < 0; };
  // umur di Basket: hari sejak seri di-Approve (masuk Basket); null bila belum / sudah keluar dari Basket
  const HARI_BASKET = 30;
  function umurBasket(r) {
    const s = milik[r.kunci];
    if (!s || s.status !== 'setuju' || !s.setuju) return null;
    const d = new Date(s.setuju.waktu);
    d.setHours(0, 0, 0, 0);
    return Math.round((HARI_INI - d) / 86400000);
  }
  // warna baris: merah (expired, belum di SIRENA) | hijau (Basket / SIRENA) | kuning (Draft / Approval) | abu (sudah ditetapkan) | null (putih)
  function warna(r) {
    const s = status(r);
    if (s && s.status === 'sirena') return 'hijau';
    if (kadaluarsa(r)) return 'merah';
    if (s) return s.status === 'setuju' || s.status === 'basket' ? 'hijau' : 'kuning';
    return ditetapkan(r) ? 'abu' : null;
  }
  const baris = () => Object.keys(milik).map(k => D.PER_KUNCI.get(k)).filter(Boolean);

  // ---------- analisa (Browse) ----------
  // analisa seri: isian entri (bila sudah ada HS), lalu analisa tersimpan dari Browse, lalu isian basket unit lain
  function analisa(r) {
    const s = status(r);
    if (s && s.hs) return s;
    return analisaSimpan[r.kunci] || null;
  }
  // yang boleh dilihat pengguna aktif: Analis 1 tidak melihat analisa draft analis lain
  function analisaTampil(r) {
    const s = status(r);
    if (s && s.unit && s.status === 'draft' && !s.milikSaya && peranKini() === 'junior') return null;
    return analisa(r);
  }
  // analisa hanya bisa diubah pada seri yang belum diklaim atau draft milik sendiri; seri expired tidak diteliti ulang. Analis 2 tidak menganalisa
  function bisaAnalisa(r) {
    if (!boleh.analisa() || kadaluarsa(r)) return false;
    const s = status(r);
    return !s || (s.milikSaya && s.status === 'draft');
  }
  const BIDANG_ANALISA = ['hs', 'bm', 'ppn', 'pph', 'lain', 'alasan', 'waktuHs'];
  const salinAnalisa = a => Object.fromEntries(BIDANG_ANALISA.map(k => [k, k === 'lain' ? (a.lain || []).map(x => ({ ...x })) : a[k] ?? null]));

  // masukkan baris dari Browse ke DRAFT pengguna aktif; seri yang sudah diklaim (draft / basket siapa pun, unit lain) dilewati.
  // Seri masuk dengan analisanya; sejak 7 Nov 2026 analisa boleh belum lengkap (Simpan cukup Tema + Jenis Tema). Seri yang sudah ditetapkan ikut masuk
  // (penetapan ulang) kecuali opsi.lewatiDitetapkan.
  function tambah(rows, tema, jenis, catatan, opsi = {}) {
    const hasil = { masuk: 0, sudah: 0, penetapan: 0, terkunci: 0, ulang: 0, expired: 0, tanpaAnalisa: 0 };
    const waktu = new Date().toISOString();
    for (const r of rows) {
      const s = status(r);
      const a = analisaSimpan[r.kunci];
      // lewat 2 tahun sejak tanggal dokumen: tidak bisa diteliti ulang, selalu ditolak
      if (kadaluarsa(r)) hasil.expired++;
      else if (s && s.milikSaya) hasil.sudah++;
      else if (s) hasil.terkunci++;
      else if (!a) hasil.tanpaAnalisa++;
      else if (ditetapkan(r) && opsi.lewatiDitetapkan) hasil.penetapan++;
      else {
        milik[r.kunci] = { tema, jenis, catatan, waktu, oleh: pengguna.id, ...salinAnalisa(a), fasDitolak: false, status: 'draft', sirena: null };
        hasil.masuk++;
        if (ditetapkan(r)) hasil.ulang++;
      }
    }
    if (hasil.masuk) tulis();
    return hasil;
  }

  // ---------- tarif otomatis penetapan ----------
  // BTKI belum ada, jadi acuannya data PIB sendiri: tarif terbanyak untuk HS penetapan + Kd Skep Fas yang sama dengan seri itu.
  // BM dan PPh mengikuti HS + fasilitas (mis. 52 = PPh 0), PPN mengikuti fasilitas. Tanpa contoh di data:
  // BM terbanyak HS itu tanpa fasilitas (kode preferensi 52-69 = 0%), lalu 10%; PPN 11%; PPh 2,5%.
  const normFas = f => (f ? String(f).split(/\s*,\s*/).filter(k => k && !/^0+$/.test(k)).sort().join(', ') : '');
  const PREFERENSI = /^(5[2-9]|60|69)$/;
  const hitungan = new Map(); // 'jenis|hs|fas' -> Map(tarif -> jumlah seri)
  const catat = (kunci, v) => {
    if (v == null || v === '') return;
    let m = hitungan.get(kunci);
    if (!m) hitungan.set(kunci, (m = new Map()));
    m.set(v, (m.get(v) || 0) + 1);
  };
  for (const r of D.ROWS) {
    const hs = r.m['Hs Code'], f = normFas(r.m['Kd Skep Fas']);
    for (const [j, v] of [['bm', r.m['Trf Bm']], ['ppn', r.m['Trf Ppn']], ['pph', r.m['Trf Pph']]]) {
      catat(`${j}|${hs}|${f}`, v);
      catat(`${j}||${f}`, v);
      catat(`${j}|${hs}|*`, v);
    }
  }
  const terbanyak = k => {
    const m = hitungan.get(k);
    if (!m) return null;
    let hasil = null, n = 0;
    for (const [v, c] of m) if (c > n) { hasil = v; n = c; }
    return hasil;
  };
  // { bm, ppn, pph } untuk seri r bila HS penetapannya hs; null bila HS belum 8 digit
  function tarifOtomatis(r, hs) {
    if (!/^\d{8}$/.test(hs || '')) return null;
    const f = normFas(r.kodeFas);
    const pref = f.split(', ').some(k => PREFERENSI.test(k));
    return {
      bm: terbanyak(`bm|${hs}|${f}`) ?? (pref ? 0 : terbanyak(`bm|${hs}|`) ?? 10),
      ppn: terbanyak(`ppn||${f}`) ?? 11,
      pph: terbanyak(`pph|${hs}|${f}`) ?? terbanyak(`pph||${f}`) ?? terbanyak(`pph|${hs}|*`) ?? 2.5
    };
  }

  // nama dan jenis tema yang pernah dibuat (pilihan isian tema; tetap bisa diketik baru). Jenis awal dari daftar tema bawaan
  const unik = a => Array.from(new Set(a.filter(Boolean))).sort((x, y) => x.localeCompare(y));
  const semuaIsian = () => Object.values(milik).concat(Array.from(CONTOH.values()));
  // basket = true: tema seri yang sudah dikirim ke Basket (saringan tema Basket); tanpa = semua tema (isian tema di Penetapan HS)
  // SIRENA Manual (import masa transisi) hanya tampil di Browse, tidak di Basket
  const daftarTema = (basket = false) => unik((basket ? Object.values(milik).filter(s => (s.status === 'setuju' || s.status === 'sirena') && !s.manual) : semuaIsian()).map(s => s.tema));
  const daftarJenis = () => unik(D.TEMA.concat(semuaIsian().map(s => s.jenis)));

  // lepas draft milik sendiri: seri keluar dari draft dan analisanya dibuang (seri bebas lagi). Hasil { hapus: { kunci: { s, a } }, sisa }
  // untuk Urungkan; sisa = seri yang bukan draft milik sendiri (sudah di Basket, milik analis lain)
  function lepas(kunci) {
    const hapus = {};
    let sisa = 0;
    for (const k of kunci) {
      const s = milik[k];
      if (!s) continue;
      if (s.status !== 'draft' || !saya(s)) { sisa++; continue; }
      hapus[k] = { s, a: analisaSimpan[k] || null };
      delete milik[k];
      delete analisaSimpan[k];
    }
    if (Object.keys(hapus).length) { tulis(); tulisAnalisa(); }
    return { hapus, sisa };
  }
  // hapus tema dari draft sendiri (ikon sampah di isian tema); seri tema itu yang sudah di Basket / milik analis lain tetap
  const hapusTema = nama => lepas(Object.keys(milik).filter(k => milik[k].tema === nama));
  // keluarkan seri tertentu dari draft sendiri (bisa satu baris dari sebuah tema)
  const keluarkan = rows => lepas(rows.map(r => r.kunci));
  // tema yang punya draft milik sendiri (ikon hapus hanya untuk tema ini)
  const temaBisaHapus = () => new Set(Object.values(milik).filter(s => s.status === 'draft' && saya(s)).map(s => s.tema));
  function pulihkanTema(hapus) {
    for (const [k, x] of Object.entries(hapus || {})) {
      if (milik[k]) continue;
      milik[k] = x.s;
      if (x.a) analisaSimpan[k] = x.a;
    }
    tulis();
    tulisAnalisa();
  }

  // analisa (HS penetapan + tarif akhir) untuk banyak baris sekaligus dari Browse; seri yang sudah di Basket / draft analis lain /
  // milik unit lain / expired dilewati. Seri di draft sendiri (mis. dikembalikan Analis 2) ikut diperbarui isiannya.
  // isi = { hs, bm, ppn, pph, lain: [{ jenis, tarif }], alasan }; tarif null = otomatis per seri (tarifOtomatis)
  function isiAnalisa(rows, isi) {
    let n = 0, keBasket = 0;
    const waktu = new Date().toISOString();
    for (const r of rows) {
      if (!bisaAnalisa(r)) continue;
      const auto = tarifOtomatis(r, isi.hs) || {};
      const a = {
        hs: isi.hs, bm: isi.bm ?? auto.bm ?? null, ppn: isi.ppn ?? auto.ppn ?? null, pph: isi.pph ?? auto.pph ?? null,
        lain: (isi.lain || []).map(x => ({ ...x })), alasan: isi.alasan, waktuHs: waktu, oleh: pengguna.id
      };
      analisaSimpan[r.kunci] = a;
      const s = milik[r.kunci];
      if (s && s.status === 'draft') { Object.assign(s, salinAnalisa(a), { fasDitolak: false }); keBasket++; }
      n++;
    }
    if (n) tulisAnalisa();
    if (keBasket) tulis();
    return n;
  }

  // potensi = penetapan - pemberitahuan. PPN / PPh kosong (isian lama, contoh unit lain) = tarif pemberitahuan.
  // Pungutan lain: PPnBM menggantikan tarif PPnBM, sisanya (BMAD, BMTP, ...) ditambahkan ke BM karena dasarnya sama (nilai pabean)
  function potensi(r, s) {
    s = s || analisa(r);
    if (!s || !s.hs || s.bm == null) return null;
    const d = T.deklarasi(r.mesin);
    const lain = s.lain || [];
    const ppnbm = lain.find(x => x.jenis === 'PPnBM');
    const bmLain = lain.filter(x => x.jenis !== 'PPnBM').reduce((a, x) => a + x.tarif, 0);
    const p = T.hitung({ np: d.np, bm: s.bm + bmLain, ppn: s.ppn ?? d.tarif.ppn, ppnbm: ppnbm ? ppnbm.tarif : d.tarif.ppnbm, pph: s.pph ?? d.tarif.pph });
    const selisih = Object.fromEntries(T.JENIS.map(k => [k, p[k] - d[k]]));
    return { d, p, selisih };
  }

  // ---------- alur approval ----------
  // Revisi 6 Nov 2026 (rapat): kiriman Analis 1 masuk tahap Approval (transit, di Browse milik Analis 2), bukan langsung Basket.
  // Basket hanya berisi seri yang sudah di-Approve: final, terkunci untuk semua orang, tanpa fitur kembalikan (juga untuk Admin).
  // Status entri: draft (Analis 1) -> ajukan (Approval) -> setuju (Basket) -> sirena. Keputusan Analis 2 per seri
  // (satu, beberapa terpilih, atau semua seri satu pengajuan sekaligus); status pengajuan diturunkan dari serinya.
  const TAHAP = [['draft', 'Draft'], ['review', 'Approval'], ['setuju', 'Basket Nominasi'], ['sirena', 'SIRENA']];
  const NAMA_TAHAP = Object.fromEntries(TAHAP);
  // status pengajuan -> posisi di bilah progres; kembali / tolak berhenti di Approval
  const POSISI = { review: 1, kembali: 1, tolak: 1, setuju: 2, sirena: 3 };
  const NAMA_STATUS = { review: 'Approval', setuju: 'Basket Nominasi', kembali: 'Dikembalikan', tolak: 'Ditolak', sirena: 'SIRENA' };
  const NAMA_AKSI = { ajukan: 'Dikirim ke Approval', setujui: 'Disetujui', kembalikan: 'Dikembalikan', tolak: 'Ditolak', kirim: 'Dikirim ke SIRENA' };

  // tahap satu entri: draft | review (Approval) | setuju (Basket) | sirena (seri yang ditolak keluar, jadi tidak punya entri lagi)
  function tahapSeri(s) {
    if (!s) return null;
    if (s.status === 'sirena') return 'sirena';
    if (s.status === 'setuju' || s.status === 'basket') return 'setuju'; // basket = contoh unit lain
    return s.status === 'ajukan' ? 'review' : 'draft';
  }
  // seri yang ditampilkan untuk satu pengajuan: yang masih di alur, atau (bila tidak ada lagi) yang dikembalikan / ditolak
  const seriAju = a => (a.seri.length ? a.seri : (a.dikembalikan || []).concat(a.ditolak || [], a.ditimpa || []));

  const dua = n => String(n).padStart(2, '0');
  function nomorBaru(awalan, waktu) {
    const d = new Date(waktu);
    let no;
    do no = awalan + '-' + d.getFullYear() + dua(d.getMonth() + 1) + dua(d.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000));
    while (aju[no] || Object.values(milik).some(s => s.sirena && s.sirena.nomor === no));
    return no;
  }
  // isi penetapan yang dibekukan saat diajukan (seri bisa diubah lagi bila dikembalikan)
  const salinIsi = (kunci, s) => ({ kunci, hs: s.hs, bm: s.bm, ppn: s.ppn ?? null, pph: s.pph ?? null, lain: (s.lain || []).map(x => ({ ...x })), alasan: s.alasan || '' });

  // status pengajuan dari serinya: masih ada yang menunggu = review; sisanya di Basket = setuju; semua terkirim = sirena;
  // tidak ada seri tersisa = kembali / tolak (mengikuti keputusan terakhir)
  function perbaruiStatus(a) {
    const st = a.seri.map(x => milik[x.kunci]).filter(s => s && s.pengajuan === a.id).map(s => s.status);
    if (st.includes('ajukan')) a.status = 'review';
    else if (st.includes('setuju')) a.status = 'setuju';
    else if (st.includes('sirena')) a.status = 'sirena';
    else {
      // seri terakhir ditimpa SIRENA Manual = pengajuan berakhir di SIRENA
      const e = a.riwayat.slice().reverse().find(x => x.aksi === 'kembalikan' || x.aksi === 'tolak' || x.aksi === 'manual');
      a.status = e && e.aksi === 'kembalikan' ? 'kembali' : e && e.aksi === 'manual' ? 'sirena' : 'tolak';
    }
  }

  // analisa siap dikirim: HS penetapan 8 digit, alasan, tema dan jenis tema terisi (dokumen tidak wajib)
  const analisaLengkap = s => !!(s && /^\d{8}$/.test(s.hs || '') && String(s.alasan || '').trim() && s.tema && s.jenis);
  // Kirim ke Approval: draft milik sendiri yang analisanya lengkap; satu tema (per pengusul) = satu pengajuan, satu nomor.
  // Hasil = daftar pengajuan yang dibuat (kosong bila tidak ada yang bisa dikirim)
  function ajukan(rows, catatan) {
    if (!boleh.ajukan()) return [];
    const siap = rows.filter(r => { const s = milik[r.kunci]; return s && s.status === 'draft' && analisaLengkap(s) && saya(s); });
    const grup = new Map();
    for (const r of siap) {
      const s = milik[r.kunci], g = s.tema + '\u0000' + s.oleh;
      if (!grup.has(g)) grup.set(g, []);
      grup.get(g).push(r);
    }
    const waktu = new Date().toISOString();
    const hasil = [];
    for (const rs of grup.values()) {
      const s0 = milik[rs[0].kunci];
      const id = nomorBaru('SUB', waktu);
      aju[id] = { id, tema: s0.tema, oleh: s0.oleh, waktu, status: 'review', seri: rs.map(r => salinIsi(r.kunci, milik[r.kunci])),
        riwayat: [{ aksi: 'ajukan', oleh: pengguna.id, waktu, catatan: catatan || '' }], sirena: null };
      for (const r of rs) Object.assign(milik[r.kunci], { status: 'ajukan', pengajuan: id, kembali: null, setuju: null });
      hasil.push(aju[id]);
    }
    if (hasil.length) { tulis(); tulisAju(); }
    return hasil;
  }

  // kelompokkan kunci per pengajuan, hanya entri yang memenuhi syarat(s, a); hasil { per: Map(id -> [kunci]), sisa }
  function perPengajuan(kunci, syarat) {
    const per = new Map();
    let sisa = 0;
    for (const k of kunci) {
      const s = milik[k], a = s && aju[s.pengajuan];
      if (!a || !syarat(s, a)) { sisa++; continue; }
      if (!per.has(a.id)) per.set(a.id, []);
      per.get(a.id).push(k);
    }
    return { per, sisa };
  }
  const menunggu = s => s.status === 'ajukan';

  // Approve (Analis 2): seri yang menunggu di Approval masuk Basket (final). Hasil { n, sisa }
  function setujuiSeri(kunci, catatan) {
    if (!boleh.tinjau()) return null;
    const { per, sisa } = perPengajuan(kunci, menunggu);
    const waktu = new Date().toISOString();
    let n = 0;
    for (const [id, ks] of per) {
      const a = aju[id];
      a.riwayat.push({ aksi: 'setujui', oleh: pengguna.id, waktu, catatan: catatan || '', seri: ks });
      for (const k of ks) { Object.assign(milik[k], { status: 'setuju', setuju: { oleh: pengguna.id, waktu } }); n++; }
      perbaruiStatus(a);
    }
    if (n) { tulis(); tulisAju(); }
    return { n, sisa };
  }

  // Return (Analis 2): seri kembali ke draft pengusulnya dengan catatan, keluar dari pengajuan (salinan di a.dikembalikan)
  function kembalikanSeri(kunci, catatan) {
    if (!boleh.tinjau()) return null;
    const { per, sisa } = perPengajuan(kunci, menunggu);
    const waktu = new Date().toISOString();
    let n = 0;
    for (const [id, ks] of per) {
      const a = aju[id], set = new Set(ks);
      a.dikembalikan = (a.dikembalikan || []).concat(a.seri.filter(x => set.has(x.kunci)));
      a.seri = a.seri.filter(x => !set.has(x.kunci));
      a.riwayat.push({ aksi: 'kembalikan', oleh: pengguna.id, waktu, catatan: catatan || '', seri: ks });
      for (const k of ks) { Object.assign(milik[k], { status: 'draft', pengajuan: null, kembali: { id, catatan: catatan || '', waktu } }); n++; }
      perbaruiStatus(a);
    }
    if (n) { tulis(); tulisAju(); }
    return { n, sisa };
  }

  // Reject (Analis 2): seri yang menunggu di Approval dikeluarkan, analisanya dibuang, jadi seri bebas lagi di Browse.
  // Jejak tetap di pengajuan: riwayat { aksi: 'tolak', seri, catatan } dan salinan isi di a.ditolak. Hasil { n, sisa }
  function tolakSeri(kunci, catatan) {
    if (!boleh.tinjau()) return null;
    const { per, sisa } = perPengajuan(kunci, menunggu);
    const waktu = new Date().toISOString();
    let n = 0;
    for (const [id, ks] of per) {
      const a = aju[id], set = new Set(ks);
      a.ditolak = (a.ditolak || []).concat(a.seri.filter(x => set.has(x.kunci)));
      a.seri = a.seri.filter(x => !set.has(x.kunci));
      a.riwayat.push({ aksi: 'tolak', oleh: pengguna.id, waktu, catatan: catatan || '', seri: ks });
      for (const k of ks) { delete milik[k]; delete analisaSimpan[k]; n++; }
      perbaruiStatus(a);
    }
    if (n) { tulis(); tulisAju(); tulisAnalisa(); }
    return { n, sisa };
  }

  // Send to SIRENA (Basket): seri di Basket dikirim; satu tema = satu nomor SRN. Hasil [{ tema, nomor, n }]
  function kirimSirena(kunci) {
    if (!boleh.tinjau()) return [];
    const { per } = perPengajuan(kunci, s => s.status === 'setuju');
    const waktu = new Date().toISOString();
    const perTema = new Map();
    for (const [id, ks] of per) {
      const t = aju[id].tema;
      if (!perTema.has(t)) perTema.set(t, { nomor: nomorBaru('SRN', waktu), n: 0 });
      const g = perTema.get(t);
      const a = aju[id];
      a.sirena = { nomor: g.nomor, waktu };
      a.riwayat.push({ aksi: 'kirim', oleh: pengguna.id, waktu, catatan: '', seri: ks, nomor: g.nomor });
      for (const k of ks) { Object.assign(milik[k], { status: 'sirena', sirena: { nomor: g.nomor, waktu } }); g.n++; }
      perbaruiStatus(a);
    }
    if (perTema.size) { tulis(); tulisAju(); }
    return Array.from(perTema, ([tema, g]) => ({ tema, ...g }));
  }

  // ---------- SIRENA Manual (import masa transisi, revisi 6 Nov 2026) ----------
  // Seri yang sudah jadi DNOA / dikirim ke SIRENA di luar SKPK. Statusnya paling tinggi: menimpa Draft, Approval, dan Basket
  // (seri keluar dari pengajuannya, salinan di a.ditimpa, analisanya dibuang; pemilik lama mendapat notifikasi). Seri yang sudah
  // SIRENA dilewati (sudah ditolak saat file diperiksa). Dipanggil SkpkImpor.setujui setelah Analis 2 / Admin meng-Approve file.
  // baris = [{ kunci, tema, jenis, hsTetap, bm, ppn, pph, dnoa, tglDnoa, sirena, tglSirena, alasan }]
  function sirenaManual(baris, imporId, oleh, waktu) {
    if (!boleh.tinjau()) return false;
    const perAju = new Map(), timpa = new Map();
    for (const x of baris) {
      if (!D.PER_KUNCI.has(x.kunci)) continue;
      const s = milik[x.kunci];
      if (s && s.status === 'sirena') continue;
      if (s) {
        if (s.pengajuan && aju[s.pengajuan]) { if (!perAju.has(s.pengajuan)) perAju.set(s.pengajuan, []); perAju.get(s.pengajuan).push(x.kunci); }
        const g = timpa.get(s.oleh) || { oleh: s.oleh, n: 0, tema: new Set() };
        g.n++;
        g.tema.add(s.tema);
        timpa.set(s.oleh, g);
      }
      delete analisaSimpan[x.kunci];
      milik[x.kunci] = {
        tema: x.tema, jenis: x.jenis || '', catatan: '', waktu, oleh, hs: x.hsTetap, bm: x.bm, ppn: x.ppn ?? null, pph: x.pph ?? null, lain: [], fasDitolak: false,
        alasan: x.alasan || '', waktuHs: waktu, status: 'sirena', pengajuan: null, sirena: { nomor: x.sirena || x.dnoa, waktu: x.tglSirena || x.tglDnoa },
        manual: { impor: imporId, dnoa: x.dnoa, tglDnoa: x.tglDnoa, sirena: x.sirena || '', tglSirena: x.tglSirena || '', ditimpa: s ? { status: s.status, oleh: s.oleh, tema: s.tema } : null }
      };
    }
    const penyetuju = pengguna.id;
    for (const [id, ks] of perAju) {
      const a = aju[id], set = new Set(ks);
      a.ditimpa = (a.ditimpa || []).concat(a.seri.filter(x => set.has(x.kunci)));
      a.seri = a.seri.filter(x => !set.has(x.kunci));
      a.riwayat.push({ aksi: 'manual', oleh: penyetuju, waktu, catatan: imporId, seri: ks });
      perbaruiStatus(a);
    }
    for (const g of timpa.values()) ditimpa.push({ id: 'timpa|' + imporId + '|' + g.oleh, oleh: g.oleh, n: g.n, tema: Array.from(g.tema), waktu, impor: imporId });
    tulis();
    tulisAju();
    tulisAnalisa();
    tulisJson(KUNCI_TIMPA, ditimpa);
    return true;
  }
  // Delete oleh Admin (bypass): seri SIRENA Manual satu file dibebaskan lagi; yang dulu ditimpa tidak dipulihkan
  function hapusManual(imporId) {
    let n = 0;
    for (const [k, s] of Object.entries(milik)) if (s.manual && s.manual.impor === imporId) { delete milik[k]; n++; }
    if (n) tulis();
    return n;
  }

  // jejak seri dari pengajuan pengguna aktif (Admin: semua) yang ditolak Analis 2, untuk Daftar Analisa (hanya baca):
  // kunci -> { tema, catatan, oleh, waktu, aju, isi } (isi = analisa yang dulu diajukan). Reject terakhir per seri yang dipakai
  function ditolakSaya() {
    const hasil = new Map();
    for (const a of Object.values(aju)) {
      if (!saya(a)) continue;
      const isi = new Map((a.ditolak || []).map(x => [x.kunci, x]));
      for (const e of a.riwayat) {
        if (e.aksi !== 'tolak') continue;
        // data lama: Reject tanpa daftar seri = seluruh pengajuan
        const ks = e.seri || (a.status === 'tolak' ? Array.from(isi.keys()) : []);
        for (const k of ks) {
          const x = hasil.get(k);
          if (!x || x.waktu < e.waktu) hasil.set(k, { tema: a.tema, catatan: e.catatan, oleh: e.oleh, waktu: e.waktu, aju: a.id, isi: isi.get(k) || null });
        }
      }
    }
    return hasil;
  }

  // keputusan atas seluruh seri satu pengajuan: setujui | kembalikan | tolak (seri yang menunggu), kirim (seri di Basket)
  function putuskan(id, aksi, catatan) {
    const a = aju[id];
    if (!a || !boleh.tinjau()) return null;
    const ks = a.seri.map(x => x.kunci).filter(k => milik[k] && milik[k].pengajuan === id);
    const h = aksi === 'setujui' ? setujuiSeri(ks, catatan) : aksi === 'kembalikan' ? kembalikanSeri(ks, catatan) : aksi === 'tolak' ? tolakSeri(ks, catatan)
      : aksi === 'kirim' ? { n: kirimSirena(ks).reduce((n, g) => n + g.n, 0) } : null;
    return h && h.n ? a : null;
  }

  // urungkan Send to Approval terakhir milik sendiri (Undo di toast), hanya selama Analis 2 belum bertindak.
  // Approve / Send to SIRENA tidak bisa diurungkan: Basket final (memakai popup konfirmasi)
  function urungkan(id) {
    const a = aju[id];
    const e = a && a.riwayat[a.riwayat.length - 1];
    if (!e || idPengguna(e.oleh) !== pengguna.id || e.aksi !== 'ajukan' || a.status !== 'review') return false;
    a.seri.forEach(x => { const s = milik[x.kunci]; if (s && s.pengajuan === id) Object.assign(s, { status: 'draft', pengajuan: null }); });
    delete aju[id];
    tulis();
    tulisAju();
    return true;
  }

  // ---------- pengajuan: ringkasan untuk tampilan ----------
  const daftarAju = () => Object.values(aju).sort((x, y) => waktuAkhir(y).localeCompare(waktuAkhir(x)));
  const waktuAkhir = a => (a.riwayat.length ? a.riwayat[a.riwayat.length - 1].waktu : a.waktu);
  const ambilAju = id => aju[id] || null;
  const peristiwa = (a, aksi, kunci) => {
    for (let i = a.riwayat.length - 1; i >= 0; i--) {
      const e = a.riwayat[i];
      if (e.aksi === aksi && (!kunci || !e.seri || e.seri.includes(kunci))) return e;
    }
    return null;
  };
  // potensi total dari isi yang diajukan
  function potensiAju(a) {
    let total = 0, ada = false;
    for (const x of seriAju(a)) {
      const r = D.PER_KUNCI.get(x.kunci);
      const p = r && potensi(r, x);
      if (p) { total += p.selisih.total; ada = true; }
    }
    return ada ? total : null;
  }
  // langkah bilah progres: { k, label, keadaan: lewat | kini | balik | gagal | nanti, oleh, waktu, ket }.
  // Satu pengajuan (kunci kosong) atau satu seri di dalamnya (kunci = seri itu; posisi dari status seri)
  function langkah(a, pos, status, kunci) {
    const isi = seriAju(a).map(x => milik[x.kunci]).filter(Boolean);
    const awal = isi.map(s => s.waktu).filter(Boolean).sort()[0] || a.waktu;
    const hs = isi.map(s => s.waktuHs).filter(w => w && w <= a.waktu).sort().pop() || awal;
    const kj = peristiwa(a, 'ajukan'), ks = peristiwa(a, 'setujui', kunci), kk = peristiwa(a, 'kirim', kunci);
    const kp = status === 'kembali' ? peristiwa(a, 'kembalikan', kunci) : status === 'tolak' ? peristiwa(a, 'tolak', kunci) : null;
    const info = {
      draft: { oleh: a.oleh, waktu: hs },
      review: kp ? { oleh: kp.oleh, waktu: kp.waktu } : { oleh: kj && kj.oleh, waktu: kj && kj.waktu },
      setuju: ks ? { oleh: ks.oleh, waktu: ks.waktu } : {},
      sirena: kk ? { oleh: kk.oleh, waktu: kk.waktu, ket: kk.nomor || (a.sirena && a.sirena.nomor) } : {}
    };
    return TAHAP.map(([k, label], i) => {
      let keadaan = i < pos ? 'lewat' : i === pos ? 'kini' : 'nanti';
      if (i === pos && status === 'kembali') { keadaan = 'balik'; label = 'Dikembalikan'; }
      if (i === pos && status === 'tolak') { keadaan = 'gagal'; label = 'Ditolak'; }
      if (i === pos && status === 'sirena') keadaan = 'lewat'; // tahap terakhir
      return { k, label, keadaan, ...(keadaan === 'nanti' ? {} : info[k]) };
    });
  }
  const langkahAju = a => langkah(a, POSISI[a.status], a.status);

  // langkah satu seri: posisinya dari status seri sendiri (keputusan per seri); belum pernah dikirim = Draft
  function langkahSeri(s) {
    const a = aju[s.pengajuan] || (s.kembali && aju[s.kembali.id]);
    if (a) {
      const st = s.status === 'draft' ? 'kembali' : { ajukan: 'review', setuju: 'setuju', sirena: 'sirena' }[s.status] || 'review';
      return langkah(a, POSISI[st], st, s.kunci);
    }
    return TAHAP.map(([k, label], i) => ({ k, label, keadaan: i === 0 ? 'kini' : 'nanti', ...(i === 0 ? { oleh: s.oleh, waktu: s.waktuHs || s.waktu } : {}) }));
  }
  // status satu seri dalam pengajuan (tabel seri halaman Approval)
  function statusSeriAju(a, kunci) {
    const s = milik[kunci];
    if (s && s.pengajuan === a.id) return { ajukan: 'review', setuju: 'setuju', sirena: 'sirena' }[s.status] || 'review';
    if ((a.ditimpa || []).some(x => x.kunci === kunci)) return 'sirena';
    return (a.ditolak || []).some(x => x.kunci === kunci) && !(a.dikembalikan || []).some(x => x.kunci === kunci) ? 'tolak' : 'kembali';
  }

  // tugas peran aktif: pengajuan yang masih punya seri menunggu Approve
  const tugas = () => (boleh.tinjau() ? daftarAju().filter(a => a.status === 'review') : []);

  // ---------- notifikasi ----------
  // hanya hal yang perlu ditindaklanjuti peran aktif (bukan log peristiwa); hilang sendiri setelah ditangani:
  //   Analis 2 / Admin: pengajuan menunggu Approve (review); seri yang sudah >= HARI_BASKET hari di Basket (per tema)
  //   Analis 1 / Admin: pengajuan miliknya yang dikembalikan dan belum dikirim ulang
  //   penanggung jawab seri (pemilik draft; Analis 2 untuk seri di Approval / Basket): tinggal <= HARI_PERINGATAN hari dari batas
  //   2 tahun (atau sudah lewat), per tema
  // "baru" = belum dibuka pengguna ini (penanda saja; angka lonceng = jumlah semua yang masih perlu ditindaklanjuti)
  let dibaca = bacaJson(KUNCI_BACA, {});
  // pengajuan yang dikembalikan dan masih punya seri di draft (belum dikirim ulang / dilepas)
  const masihKembali = a => Object.values(milik).some(s => s.status === 'draft' && s.kembali && s.kembali.id === a.id);
  function notifikasi() {
    const baca = new Set(dibaca[pengguna.id] || []);
    const urus = { junior: peranKini() !== 'senior', senior: peranKini() !== 'junior' };
    const d = [];
    for (const a of Object.values(aju)) {
      const e = a.riwayat[a.riwayat.length - 1];
      const dasar = { id: a.id + '#' + a.riwayat.length, aju: a, tema: a.tema, waktu: e ? e.waktu : a.waktu, catatan: e ? e.catatan : '' };
      if (urus.senior && a.status === 'review') d.push({ ...dasar, jenis: 'approve' });
      if (urus.junior && saya(a) && masihKembali(a) && peristiwa(a, 'kembalikan')) d.push({ ...dasar, jenis: 'kembali', catatan: peristiwa(a, 'kembalikan').catatan });
    }
    const grup = new Map(), lama = new Map();
    for (const [kunci, s] of Object.entries(milik)) {
      if (s.status === 'sirena') continue;
      const r = D.PER_KUNCI.get(kunci);
      if (!r) continue;
      if (urus.senior && s.status === 'setuju') {
        const u = umurBasket(r);
        if (u != null && u >= HARI_BASKET) {
          const g = lama.get(s.tema) || { tema: s.tema, n: 0, umur: 0 };
          g.n++;
          g.umur = Math.max(g.umur, u);
          lama.set(s.tema, g);
        }
      }
      if (!(s.status === 'draft' ? urus.junior && saya(s) : urus.senior)) continue;
      const n = sisaHari(r);
      if (n == null || n > HARI_PERINGATAN) continue;
      const g = grup.get(s.tema) || { tema: s.tema, n: 0, sisa: Infinity, approval: false };
      g.n++;
      g.sisa = Math.min(g.sisa, n);
      if (s.status === 'ajukan') g.approval = true; // Analis 2: buka Approval (Browse) bila ada seri tema itu yang belum di Basket
      grup.set(s.tema, g);
    }
    for (const g of grup.values()) d.push({ id: 'exp|' + g.tema + '|' + g.n + '|' + (g.sisa < 0 ? 'x' : 'w'), jenis: g.sisa < 0 ? 'expired' : 'expiring', ...g });
    // seri pengguna ini yang ditimpa SIRENA Manual (hilang setelah dibuka); import: Needs approval / Rejected (impor.js)
    for (const x of ditimpa) if (idPengguna(x.oleh) === pengguna.id && !baca.has(x.id)) d.push({ ...x, jenis: 'ditimpa', tema: x.tema.join(', '), catatan: x.impor });
    if (root.SkpkImpor) d.push(...root.SkpkImpor.notifikasi(baca));
    // id ikut jumlah seri dan kelipatan 30 hari umur, jadi muncul lagi sebagai "baru" setiap 30 hari berikutnya
    for (const g of lama.values()) d.push({ id: 'lama|' + g.tema + '|' + g.n + '|' + Math.floor(g.umur / HARI_BASKET), jenis: 'lama', ...g });
    for (const x of d) x.baru = !baca.has(x.id);
    // yang mendesak (expired / hampir expired) di atas, lalu yang lama di Basket, lalu yang paling lama menunggu
    const urut = x => (x.jenis === 'expired' || x.jenis === 'expiring' ? 0 : x.jenis === 'lama' ? 1 : 2);
    return d.sort((x, y) => urut(x) - urut(y) || (urut(x) === 0 ? x.sisa - y.sisa : urut(x) === 1 ? y.umur - x.umur : x.waktu.localeCompare(y.waktu)));
  }
  function tandaiBaca(ids) {
    const baca = new Set(dibaca[pengguna.id] || []);
    (ids || notifikasi().map(n => n.id)).forEach(id => baca.add(id));
    dibaca[pengguna.id] = Array.from(baca);
    tulisJson(KUNCI_BACA, dibaca);
  }

  // ---------- data lama: seri yang dikirim ke SIRENA sebelum ada alur approval; tahap DNOA yang sudah dihapus;
  // oleh = kunci peran (sebelum pengguna dipisah); status basket (sekarang draft) dan tolak (sekarang seri dibebaskan) ----------
  (function migrasi() {
    let ubah = false;
    const ganti = v => { const id = idPengguna(v); if (id && id !== v) ubah = true; return id || v; };
    for (const a of Object.values(aju)) {
      if (a.status === 'dnoa') { a.status = 'sirena'; ubah = true; }
      const n = a.riwayat.length;
      a.riwayat = a.riwayat.filter(e => e.aksi !== 'dnoa');
      if (a.riwayat.length !== n) ubah = true;
      a.oleh = ganti(a.oleh);
      for (const e of a.riwayat) e.oleh = ganti(e.oleh);
      if (a.status === 'tolak' && a.seri.length) { a.ditolak = (a.ditolak || []).concat(a.seri); a.seri = []; ubah = true; }
    }
    for (const a of Object.values(analisaSimpan)) a.oleh = ganti(a.oleh);
    const grup = new Map();
    for (const [k, s] of Object.entries(milik)) {
      if (!s.oleh) { s.oleh = 'a1a'; ubah = true; }
      s.oleh = ganti(s.oleh);
      if (s.status === 'tolak') { delete milik[k]; delete analisaSimpan[k]; ubah = true; continue; }
      if (s.status === 'basket') { s.status = 'draft'; ubah = true; }
      if (s.status === 'sirena' && !s.pengajuan && s.sirena && !s.manual) {
        if (!grup.has(s.sirena.nomor)) grup.set(s.sirena.nomor, []);
        grup.get(s.sirena.nomor).push(k);
      }
    }
    for (const [nomor, kunci] of grup) {
      const s0 = milik[kunci[0]];
      const id = nomorBaru('SUB', s0.sirena.waktu);
      aju[id] = { id, tema: s0.tema, oleh: s0.oleh, waktu: s0.sirena.waktu, status: 'sirena', seri: kunci.map(k => salinIsi(k, milik[k])),
        riwayat: [{ aksi: 'ajukan', oleh: s0.oleh, waktu: s0.sirena.waktu, catatan: '' }, { aksi: 'kirim', oleh: 'a2', waktu: s0.sirena.waktu, catatan: '' }], sirena: { nomor, waktu: s0.sirena.waktu } };
      kunci.forEach(k => { milik[k].pengajuan = id; });
      ubah = true;
    }
    // revisi 6 Nov 2026: Approve dulu per pengajuan -> status Basket (setuju) kini per seri; seri yang dikembalikan keluar dari a.seri
    for (const a of Object.values(aju)) {
      if (a.status === 'setuju' || a.status === 'sirena') {
        const e = peristiwa(a, 'setujui');
        for (const x of a.seri) {
          const s = milik[x.kunci];
          if (s && s.pengajuan === a.id && s.status === 'ajukan' && a.status === 'setuju') { s.status = 'setuju'; ubah = true; }
          if (s && s.pengajuan === a.id && (s.status === 'setuju' || s.status === 'sirena') && !s.setuju && e) { s.setuju = { oleh: e.oleh, waktu: e.waktu }; ubah = true; }
        }
      }
      if (a.status === 'kembali' && !a.dikembalikan && a.seri.length) { a.dikembalikan = a.seri; a.seri = []; ubah = true; }
    }
    // analisa tanpa entri (dulu boleh dianalisa tanpa masuk basket): dibuang, supaya seri yang belum diklaim tidak membawa analisa siapa pun
    for (const k of Object.keys(analisaSimpan)) if (!milik[k]) { delete analisaSimpan[k]; ubah = true; }
    // tanda baca notifikasi lama per peran -> per pengguna
    for (const k of Object.keys(dibaca)) if (LAMA[k] && LAMA[k] !== k && !dibaca[LAMA[k]]) { dibaca[LAMA[k]] = dibaca[k]; delete dibaca[k]; tulisJson(KUNCI_BACA, dibaca); }
    if (ubah) { tulis(); tulisAju(); tulisAnalisa(); }
  })();

  // ---------- contoh pengajuan di tiap tahap (sekali per peramban) ----------
  // seri ber-flag RE yang punya HS suggestion, bukan milik unit lain; HS / tarif penetapan = suggestion
  (function contoh() {
    try { if (localStorage.getItem(KUNCI_CONTOH)) return; } catch { return; }
    const calon = D.ROWS.filter(r => (r.flag.inkonsistensi || r.flag.perluasan) && !r.terkunci && /^\d{8}$/.test(r.hsSaran || '') && r.trfSaran != null &&
      !CONTOH.has(r.kunci) && !milik[r.kunci] && D.hash(r.kunci + '|aju') < 0.08);
    const jam = h => new Date(Date.now() - h * 3600e3).toISOString();
    const RENCANA = [
      { n: 4, tema: 'Stainless Flat 7220 HS Review', jenis: D.TEMA[0], oleh: 'a1a', status: 'review', alur: [['ajukan', 'a1a', 3]] },
      { n: 3, tema: 'ACFTA Facility Check 7220', jenis: D.TEMA[2], oleh: 'a1b', status: 'setuju', alur: [['ajukan', 'a1b', 900], ['setujui', 'a2', 850, 'Findings are consistent with the reference HS.']] },
      { n: 2, tema: 'Cold Rolled Strip Inconsistency', jenis: D.TEMA[0], oleh: 'a1a', status: 'kembali', alur: [['ajukan', 'a1a', 70], ['kembalikan', 'a2', 20, 'Kd Skep Fas 54: please recheck the BM rate for the final HS.']] },
      { n: 5, tema: 'Penul Expansion Q3', jenis: D.TEMA[3], oleh: 'a1b', status: 'sirena', alur: [['ajukan', 'a1b', 150], ['setujui', 'a2', 125], ['kirim', 'a2', 124]] },
      { n: 1, tema: 'Narrow Strip Tariff Review', jenis: D.TEMA[0], oleh: 'a1a', status: 'tolak', alur: [['ajukan', 'a1a', 200], ['tolak', 'a2', 180, 'Already covered by an audit LHA batch.']] },
      // draft Analis 1 B yang belum dikirim: terlihat terkunci oleh Analis 1 A
      { n: 3, tema: 'Stainless Coil Facility Review', jenis: D.TEMA[2], oleh: 'a1b', status: 'draft', alur: [['draft', 'a1b', 5]] }
    ];
    if (calon.length < RENCANA.reduce((n, x) => n + x.n, 0)) return;
    let j = 0;
    for (const p of RENCANA) {
      const rows = calon.slice(j, j + p.n);
      j += p.n;
      const tAwal = jam(p.alur[0][2] + 30), tHs = jam(p.alur[0][2] + 2);
      for (const r of rows) {
        const t = tarifOtomatis(r, r.hsSaran) || {};
        milik[r.kunci] = { tema: p.tema, jenis: p.jenis, catatan: '', waktu: tAwal, oleh: p.oleh, hs: r.hsSaran, bm: r.trfSaran, ppn: t.ppn ?? null, pph: t.pph ?? null,
          lain: [], fasDitolak: false, alasan: 'Follows reference finding', waktuHs: tHs, status: 'draft', sirena: null };
        analisaSimpan[r.kunci] = { ...salinAnalisa(milik[r.kunci]), oleh: p.oleh };
      }
      if (p.status === 'draft') continue;
      const waktu = jam(p.alur[0][2]);
      const id = nomorBaru('SUB', waktu);
      const a = aju[id] = { id, tema: p.tema, oleh: p.oleh, waktu, status: p.status, contoh: true, seri: rows.map(r => salinIsi(r.kunci, milik[r.kunci])), riwayat: [], sirena: null };
      for (const [aksi, oleh, h, catatan] of p.alur) {
        const w = jam(h);
        if (aksi === 'kirim') a.sirena = { nomor: nomorBaru('SRN', w), waktu: w };
        a.riwayat.push({ aksi, oleh, waktu: w, catatan: catatan || '', ...(aksi === 'ajukan' ? {} : { seri: rows.map(r => r.kunci) }), ...(aksi === 'kirim' ? { nomor: a.sirena.nomor } : {}) });
      }
      const ks = peristiwa(a, 'setujui');
      const setuju = ks ? { oleh: ks.oleh, waktu: ks.waktu } : null;
      for (const r of rows) {
        const s = milik[r.kunci];
        if (p.status === 'review') Object.assign(s, { status: 'ajukan', pengajuan: id });
        else if (p.status === 'setuju') Object.assign(s, { status: 'setuju', pengajuan: id, setuju });
        else if (p.status === 'kembali') s.kembali = { id, catatan: a.riwayat[1].catatan, waktu: a.riwayat[1].waktu };
        else if (p.status === 'tolak') { delete milik[r.kunci]; delete analisaSimpan[r.kunci]; }
        else Object.assign(s, { status: 'sirena', pengajuan: id, sirena: a.sirena, setuju });
      }
      if (p.status === 'tolak') { a.ditolak = a.seri; a.seri = []; }
      if (p.status === 'kembali') { a.dikembalikan = a.seri; a.seri = []; }
    }
    // pengajuan yang peristiwa terakhirnya lebih lama dari 36 jam dianggap sudah dibaca (id notifikasi = nomor#jumlah riwayat)
    const batas = jam(36);
    for (const p of PENGGUNA) dibaca[p.id] = Object.values(aju).filter(a => waktuAkhir(a) < batas).map(a => a.id + '#' + a.riwayat.length);
    tulis();
    tulisAju();
    tulisAnalisa();
    tulisJson(KUNCI_BACA, dibaca);
    try { localStorage.setItem(KUNCI_CONTOH, '1'); } catch { /* abaikan */ }
  })();

  root.SkpkBasket = {
    PERAN, PENGGUNA, penggunaKini, gantiPengguna, peranKini, namaOleh, peranOleh, boleh, inisial,
    status, label, warna, ditetapkan, sumberTetap, sisaHari, kadaluarsa, HARI_PERINGATAN, umurBasket, HARI_BASKET, baris, tambah, daftarTema, daftarJenis, hapusTema, keluarkan, temaBisaHapus, pulihkanTema, normFas, tarifOtomatis,
    analisa, analisaTampil, analisaLengkap, bisaAnalisa, isiAnalisa, potensi,
    TAHAP, NAMA_TAHAP, NAMA_STATUS, NAMA_AKSI, tahapSeri, seriAju, langkahSeri, statusSeriAju, ajukan, setujuiSeri, kembalikanSeri, tolakSeri, kirimSirena, ditolakSaya, putuskan, urungkan, daftarAju, ambilAju, potensiAju, langkahAju, waktuAkhir, tugas,
    sirenaManual, hapusManual,
    notifikasi, tandaiBaca
  };
})(window);
