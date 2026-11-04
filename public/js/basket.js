/*
 * SKPK v2: Basket (Menu 2) dan Approval (Menu 3). Seri yang diturunkan dari Browse masuk basket unit dengan tema,
 * lalu diberi HS penetapan + tarif akhir (BM, PPN, PPh, pungutan lain) dan dihitung potensinya.
 * Alur: analis junior mengajukan seri (satu pengajuan = satu nomor SUB-...) -> analis senior menyetujui, mengembalikan
 * (seri kembali ke basket dengan catatan), atau menolak -> analis senior mengirim ke SIRENA (nomor SRN-...). Alur berhenti di SIRENA.
 * Warna baris (Browse dan Basket): putih = belum di basket, kuning = di basket (termasuk dikembalikan / ditolak),
 * hijau = sudah diproses dari basket (Submit, Approved, SIRENA), merah = sudah ditetapkan (SPTNP / SPKTNP / LHA).
 * Peran (junior / senior / admin) menggantikan login: dipilih di avatar topbar.
 * Seri yang sudah ada di basket unit lain terkunci (tidak bisa diambil dua kali) dan tetap terlihat setelah masuk SIRENA.
 * Disimpan di localStorage peramban (skpk-v2:basket, skpk-v2:pengajuan, skpk-v2:peran, skpk-v2:notif-baca).
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

  const bacaJson = (k, awal) => { try { return JSON.parse(localStorage.getItem(k)) || awal; } catch { return awal; } };
  const tulisJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  let milik = bacaJson(KUNCI, {});
  let aju = bacaJson(KUNCI_AJU, {});
  const tulis = () => tulisJson(KUNCI, milik);
  const tulisAju = () => tulisJson(KUNCI_AJU, aju);

  // ---------- peran (pengganti login) ----------
  const PERAN = {
    junior: { nama: 'Junior Analyst', inisial: 'JA', warna: '#1d6fc9' },
    senior: { nama: 'Senior Analyst', inisial: 'SA', warna: '#23a26d' },
    admin: { nama: 'Admin', inisial: 'AD', warna: '#7c3aed' },
    sirena: { nama: 'SIRENA', inisial: 'SR', warna: '#64748b' } // umpan balik sistem, bukan peran yang bisa dipilih
  };
  const PILIHAN_PERAN = ['junior', 'senior', 'admin'];
  let peran = (() => { try { const v = localStorage.getItem(KUNCI_PERAN); return PILIHAN_PERAN.includes(v) ? v : 'junior'; } catch { return 'junior'; } })();
  const peranKini = () => peran;
  function gantiPeran(k) {
    if (!PILIHAN_PERAN.includes(k)) return;
    peran = k;
    try { localStorage.setItem(KUNCI_PERAN, k); } catch { /* abaikan */ }
  }
  // junior meneliti dan mengajukan; senior menyetujui dan mengirim; admin semuanya
  const boleh = {
    ajukan: () => peran === 'junior' || peran === 'admin',
    tinjau: () => peran === 'senior' || peran === 'admin'
  };
  const inisial = k => (PERAN[k] || PERAN.junior).inisial;

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

  // entri basket untuk satu baris (milik sendiri didahulukan), null bila belum ada di basket mana pun
  function status(r) {
    const s = milik[r.kunci];
    if (s) return { ...s, kunci: r.kunci, pemilik: inisial(s.oleh), milikSaya: true };
    const c = CONTOH.get(r.kunci);
    return c ? { ...c, milikSaya: false } : null;
  }
  const label = s => (!s ? null : s.status === 'sirena' ? 'SIRENA ' + s.sirena.nomor : 'Basket - ' + s.pemilik);
  // warna baris: merah | hijau | kuning | null (putih)
  function warna(r) {
    if (r.terkunci || (r.penetapan && r.penetapan.length)) return 'merah';
    const s = status(r);
    if (!s) return null;
    return s.status === 'ajukan' || s.status === 'sirena' ? 'hijau' : 'kuning';
  }
  const baris = () => Object.keys(milik).map(k => D.PER_KUNCI.get(k)).filter(Boolean);

  // turunkan baris dari Browse; seri yang sudah ditetapkan (cleansing) dan basket unit lain dilewati
  function tambah(rows, tema, jenis, catatan) {
    const hasil = { masuk: 0, sudah: 0, penetapan: 0, terkunci: 0 };
    const waktu = new Date().toISOString();
    for (const r of rows) {
      const s = status(r);
      if (s && s.milikSaya) hasil.sudah++;
      else if (s) hasil.terkunci++;
      else if (r.terkunci) hasil.penetapan++;
      else {
        milik[r.kunci] = { tema, jenis, catatan, waktu, oleh: peran, hs: null, bm: null, fasDitolak: false, alasan: '', status: 'basket', sirena: null };
        hasil.masuk++;
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
  const daftarTema = (sendiri = false) => unik((sendiri ? Object.values(milik) : semuaIsian()).map(s => s.tema));
  const daftarJenis = () => unik(D.TEMA.concat(semuaIsian().map(s => s.jenis)));

  // HS penetapan + tarif akhir untuk banyak baris sekaligus; hanya seri yang masih di basket (belum diajukan) yang berubah.
  // isi = { hs, bm, ppn, pph, lain: [{ jenis, tarif }], alasan }; tarif null = otomatis per seri (tarifOtomatis)
  function isiPenetapan(rows, isi) {
    let n = 0;
    for (const r of rows) {
      const s = milik[r.kunci];
      if (!s || s.status !== 'basket') continue;
      const auto = tarifOtomatis(r, isi.hs) || {};
      s.hs = isi.hs;
      s.bm = isi.bm ?? auto.bm ?? null;
      s.ppn = isi.ppn ?? auto.ppn ?? null;
      s.pph = isi.pph ?? auto.pph ?? null;
      s.lain = (isi.lain || []).map(x => ({ ...x }));
      s.fasDitolak = false;
      s.alasan = isi.alasan;
      s.waktuHs = new Date().toISOString();
      n++;
    }
    if (n) tulis();
    return n;
  }

  // potensi = penetapan - pemberitahuan. PPN / PPh kosong (isian lama, contoh unit lain) = tarif pemberitahuan.
  // Pungutan lain: PPnBM menggantikan tarif PPnBM, sisanya (BMAD, BMTP, ...) ditambahkan ke BM karena dasarnya sama (nilai pabean)
  function potensi(r, s) {
    s = s || status(r);
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
  // tahap satu seri / pengajuan, urut sesuai bilah progres
  const TAHAP = [['basket', 'Basket'], ['tetap', 'Final HS'], ['review', 'Senior Review'], ['setuju', 'Approved'], ['sirena', 'SIRENA']];
  const NAMA_TAHAP = Object.fromEntries(TAHAP);
  // status pengajuan -> posisi di bilah progres; kembali / tolak berhenti di Senior Review
  const POSISI = { review: 2, kembali: 2, tolak: 2, setuju: 3, sirena: 4 };
  const NAMA_STATUS = { review: 'Senior Review', setuju: 'Approved', kembali: 'Returned', tolak: 'Rejected', sirena: 'SIRENA' };
  const NAMA_AKSI = { ajukan: 'Submitted', setujui: 'Approved', kembalikan: 'Returned', tolak: 'Rejected', kirim: 'Sent to SIRENA' };

  // tahap satu entri basket: basket | tetap | review | setuju | sirena | tolak
  function tahapSeri(s) {
    if (!s) return null;
    if (s.status === 'tolak') return 'tolak';
    if (s.status === 'sirena') return 'sirena';
    if (s.status === 'ajukan') return aju[s.pengajuan] && aju[s.pengajuan].status === 'setuju' ? 'setuju' : 'review';
    return s.hs ? 'tetap' : 'basket';
  }

  const dua = n => String(n).padStart(2, '0');
  function nomorBaru(awalan, waktu) {
    const d = new Date(waktu);
    let no;
    do no = awalan + '-' + d.getFullYear() + dua(d.getMonth() + 1) + dua(d.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000));
    while (aju[no] || Object.values(aju).some(a => a.sirena && a.sirena.nomor === no));
    return no;
  }
  // isi penetapan yang dibekukan saat diajukan (seri bisa diubah lagi bila dikembalikan)
  const salinIsi = (kunci, s) => ({ kunci, hs: s.hs, bm: s.bm, ppn: s.ppn ?? null, pph: s.pph ?? null, lain: (s.lain || []).map(x => ({ ...x })), alasan: s.alasan || '' });

  // ajukan seri milik unit yang sudah berisi HS penetapan; satu pengajuan satu nomor
  function ajukan(rows, catatan) {
    if (!boleh.ajukan()) return null;
    const siap = rows.filter(r => { const s = milik[r.kunci]; return s && s.status === 'basket' && s.hs; });
    if (!siap.length) return null;
    const waktu = new Date().toISOString();
    const id = nomorBaru('SUB', waktu);
    const tema = milik[siap[0].kunci].tema;
    aju[id] = { id, tema, oleh: peran, waktu, status: 'review', seri: siap.map(r => salinIsi(r.kunci, milik[r.kunci])), riwayat: [{ aksi: 'ajukan', oleh: peran, waktu, catatan: catatan || '' }], sirena: null };
    for (const r of siap) Object.assign(milik[r.kunci], { status: 'ajukan', pengajuan: id, kembali: null });
    tulis();
    tulisAju();
    return aju[id];
  }

  // keputusan atas satu pengajuan: setujui | kembalikan | tolak (status review), kirim (status setuju)
  function putuskan(id, aksi, catatan) {
    const a = aju[id];
    if (!a || !boleh.tinjau()) return null;
    if (aksi === 'kirim' ? a.status !== 'setuju' : a.status !== 'review') return null;
    const waktu = new Date().toISOString();
    a.riwayat.push({ aksi, oleh: peran, waktu, catatan: catatan || '' });
    const tiapSeri = fn => a.seri.forEach(x => { const s = milik[x.kunci]; if (s && s.pengajuan === id) fn(s); });
    if (aksi === 'setujui') a.status = 'setuju';
    else if (aksi === 'kembalikan') {
      a.status = 'kembali';
      tiapSeri(s => Object.assign(s, { status: 'basket', pengajuan: null, kembali: { id, catatan: catatan || '', waktu } }));
    } else if (aksi === 'tolak') {
      a.status = 'tolak';
      tiapSeri(s => { s.status = 'tolak'; });
    } else if (aksi === 'kirim') {
      a.status = 'sirena';
      a.sirena = { nomor: nomorBaru('SRN', waktu), waktu };
      tiapSeri(s => Object.assign(s, { status: 'sirena', sirena: a.sirena }));
    } else return null;
    tulis();
    tulisAju();
    return a;
  }

  // ---------- pengajuan: ringkasan untuk tampilan ----------
  const daftarAju = () => Object.values(aju).sort((x, y) => waktuAkhir(y).localeCompare(waktuAkhir(x)));
  const waktuAkhir = a => (a.riwayat.length ? a.riwayat[a.riwayat.length - 1].waktu : a.waktu);
  const ambilAju = id => aju[id] || null;
  const peristiwa = (a, aksi) => { for (let i = a.riwayat.length - 1; i >= 0; i--) if (a.riwayat[i].aksi === aksi) return a.riwayat[i]; return null; };
  // potensi total dari isi yang diajukan
  function potensiAju(a) {
    let total = 0, ada = false;
    for (const x of a.seri) {
      const r = D.PER_KUNCI.get(x.kunci);
      const p = r && potensi(r, x);
      if (p) { total += p.selisih.total; ada = true; }
    }
    return ada ? total : null;
  }
  // langkah bilah progres satu pengajuan: { k, label, keadaan: lewat | kini | balik | gagal | nanti, oleh, waktu, ket }
  function langkahAju(a) {
    const pos = POSISI[a.status];
    const awal = a.seri.map(x => milik[x.kunci] && milik[x.kunci].waktu).filter(Boolean).sort()[0] || a.waktu;
    const hs = a.seri.map(x => milik[x.kunci] && milik[x.kunci].waktuHs).filter(w => w && w <= a.waktu).sort().pop() || null;
    const kj = peristiwa(a, 'ajukan'), ks = peristiwa(a, 'setujui'), kk = peristiwa(a, 'kirim');
    const kp = a.status === 'kembali' ? peristiwa(a, 'kembalikan') : a.status === 'tolak' ? peristiwa(a, 'tolak') : null;
    const info = {
      basket: { oleh: a.seri.length && milik[a.seri[0].kunci] ? milik[a.seri[0].kunci].oleh || 'junior' : a.oleh, waktu: awal },
      tetap: { oleh: a.oleh, waktu: hs },
      review: kp ? { oleh: kp.oleh, waktu: kp.waktu } : { oleh: kj && kj.oleh, waktu: kj && kj.waktu },
      setuju: ks ? { oleh: ks.oleh, waktu: ks.waktu } : {},
      sirena: kk ? { oleh: kk.oleh, waktu: kk.waktu, ket: a.sirena && a.sirena.nomor } : {}
    };
    return TAHAP.map(([k, label], i) => {
      let keadaan = i < pos ? 'lewat' : i === pos ? 'kini' : 'nanti';
      if (i === pos && a.status === 'kembali') { keadaan = 'balik'; label = 'Returned'; }
      if (i === pos && a.status === 'tolak') { keadaan = 'gagal'; label = 'Rejected'; }
      if (i === pos && a.status === 'sirena') keadaan = 'lewat'; // tahap terakhir
      return { k, label, keadaan, ...(keadaan === 'nanti' ? {} : info[k]) };
    });
  }

  // langkah satu seri: ikut pengajuannya (juga yang mengembalikannya); belum diajukan = Basket / Final HS
  function langkahSeri(s) {
    const a = aju[s.pengajuan] || (s.kembali && aju[s.kembali.id]);
    if (a) return langkahAju(a);
    const pos = s.hs ? 1 : 0;
    const info = [{ oleh: s.oleh, waktu: s.waktu }, { oleh: s.oleh, waktu: s.waktuHs }];
    return TAHAP.map(([k, label], i) => ({ k, label, keadaan: i < pos ? 'lewat' : i === pos ? 'kini' : 'nanti', ...(info[i] || {}) }));
  }

  // tugas peran aktif: pengajuan yang menunggu keputusan / pengiriman
  const tugas = () => (boleh.tinjau() ? daftarAju().filter(a => a.status === 'review' || a.status === 'setuju') : []);

  // ---------- notifikasi ----------
  // semua peristiwa pengajuan yang bukan aksi peran aktif sendiri, terbaru di atas; dibaca per peran
  let dibaca = bacaJson(KUNCI_BACA, {});
  const idPeristiwa = (a, i) => a.id + '#' + i;
  function notifikasi() {
    const baca = new Set(dibaca[peran] || []);
    const d = [];
    for (const a of Object.values(aju)) a.riwayat.forEach((e, i) => {
      if (e.oleh === peran) return;
      const id = idPeristiwa(a, i);
      d.push({ id, aju: a, ...e, baru: !baca.has(id) });
    });
    return d.sort((x, y) => y.waktu.localeCompare(x.waktu));
  }
  function tandaiBaca(ids) {
    const baca = new Set(dibaca[peran] || []);
    (ids || notifikasi().map(n => n.id)).forEach(id => baca.add(id));
    dibaca[peran] = Array.from(baca);
    tulisJson(KUNCI_BACA, dibaca);
  }

  // ---------- data lama: seri yang dikirim ke SIRENA sebelum ada alur approval; tahap DNOA yang sudah dihapus ----------
  (function migrasi() {
    let ubah = false;
    for (const a of Object.values(aju)) {
      if (a.status === 'dnoa') { a.status = 'sirena'; ubah = true; }
      const n = a.riwayat.length;
      a.riwayat = a.riwayat.filter(e => e.aksi !== 'dnoa');
      if (a.riwayat.length !== n) ubah = true;
    }
    const grup = new Map();
    for (const [k, s] of Object.entries(milik)) {
      if (!s.oleh) { s.oleh = 'junior'; ubah = true; }
      if (s.status === 'sirena' && !s.pengajuan && s.sirena) {
        if (!grup.has(s.sirena.nomor)) grup.set(s.sirena.nomor, []);
        grup.get(s.sirena.nomor).push(k);
      }
    }
    for (const [nomor, kunci] of grup) {
      const s0 = milik[kunci[0]];
      const id = nomorBaru('SUB', s0.sirena.waktu);
      aju[id] = { id, tema: s0.tema, oleh: 'junior', waktu: s0.sirena.waktu, status: 'sirena', seri: kunci.map(k => salinIsi(k, milik[k])),
        riwayat: [{ aksi: 'ajukan', oleh: 'junior', waktu: s0.sirena.waktu, catatan: '' }, { aksi: 'kirim', oleh: 'senior', waktu: s0.sirena.waktu, catatan: '' }], sirena: { nomor, waktu: s0.sirena.waktu } };
      kunci.forEach(k => { milik[k].pengajuan = id; });
      ubah = true;
    }
    if (ubah) { tulis(); tulisAju(); }
  })();

  // ---------- contoh pengajuan di tiap tahap (sekali per peramban) ----------
  // seri ber-flag RE yang punya HS suggestion, bukan milik unit lain; HS / tarif penetapan = suggestion
  (function contoh() {
    try { if (localStorage.getItem(KUNCI_CONTOH)) return; } catch { return; }
    const calon = D.ROWS.filter(r => (r.flag.inkonsistensi || r.flag.perluasan) && !r.terkunci && /^\d{8}$/.test(r.hsSaran || '') && r.trfSaran != null &&
      !CONTOH.has(r.kunci) && !milik[r.kunci] && D.hash(r.kunci + '|aju') < 0.08);
    const jam = h => new Date(Date.now() - h * 3600e3).toISOString();
    const RENCANA = [
      { n: 4, tema: 'Stainless Flat 7220 HS Review', jenis: D.TEMA[0], status: 'review', alur: [['ajukan', 'junior', 3]] },
      { n: 3, tema: 'ACFTA Facility Check 7220', jenis: D.TEMA[2], status: 'setuju', alur: [['ajukan', 'junior', 50], ['setujui', 'senior', 26, 'Findings are consistent with the reference HS.']] },
      { n: 2, tema: 'Cold Rolled Strip Inconsistency', jenis: D.TEMA[0], status: 'kembali', alur: [['ajukan', 'junior', 70], ['kembalikan', 'senior', 20, 'Kd Skep Fas 54: please recheck the BM rate for the final HS.']] },
      { n: 5, tema: 'Penul Expansion Q3', jenis: D.TEMA[3], status: 'sirena', alur: [['ajukan', 'junior', 150], ['setujui', 'senior', 125], ['kirim', 'senior', 124]] },
      { n: 1, tema: 'Narrow Strip Tariff Review', jenis: D.TEMA[0], status: 'tolak', alur: [['ajukan', 'junior', 200], ['tolak', 'senior', 180, 'Already covered by an audit LHA batch.']] }
    ];
    if (calon.length < RENCANA.reduce((n, x) => n + x.n, 0)) return;
    let j = 0;
    for (const p of RENCANA) {
      const rows = calon.slice(j, j + p.n);
      j += p.n;
      const tAwal = jam(p.alur[0][2] + 30), tHs = jam(p.alur[0][2] + 2);
      for (const r of rows) {
        const t = tarifOtomatis(r, r.hsSaran) || {};
        milik[r.kunci] = { tema: p.tema, jenis: p.jenis, catatan: '', waktu: tAwal, oleh: 'junior', hs: r.hsSaran, bm: r.trfSaran, ppn: t.ppn ?? null, pph: t.pph ?? null,
          lain: [], fasDitolak: false, alasan: 'Follows reference finding', waktuHs: tHs, status: 'basket', sirena: null };
      }
      const waktu = jam(p.alur[0][2]);
      const id = nomorBaru('SUB', waktu);
      const a = aju[id] = { id, tema: p.tema, oleh: 'junior', waktu, status: p.status, contoh: true, seri: rows.map(r => salinIsi(r.kunci, milik[r.kunci])), riwayat: [], sirena: null };
      for (const [aksi, oleh, h, catatan] of p.alur) {
        const w = jam(h);
        if (aksi === 'kirim') a.sirena = { nomor: nomorBaru('SRN', w), waktu: w };
        a.riwayat.push({ aksi, oleh, waktu: w, catatan: catatan || '' });
      }
      for (const r of rows) {
        const s = milik[r.kunci];
        if (p.status === 'review' || p.status === 'setuju') Object.assign(s, { status: 'ajukan', pengajuan: id });
        else if (p.status === 'kembali') s.kembali = { id, catatan: a.riwayat[1].catatan, waktu: a.riwayat[1].waktu };
        else if (p.status === 'tolak') Object.assign(s, { status: 'tolak', pengajuan: id });
        else Object.assign(s, { status: 'sirena', pengajuan: id, sirena: a.sirena });
      }
    }
    // peristiwa yang lebih lama dari 36 jam dianggap sudah dibaca
    const batas = jam(36);
    for (const k of PILIHAN_PERAN) dibaca[k] = Object.values(aju).flatMap(a => a.riwayat.map((e, i) => (e.waktu < batas ? idPeristiwa(a, i) : null))).filter(Boolean);
    tulis();
    tulisAju();
    tulisJson(KUNCI_BACA, dibaca);
    try { localStorage.setItem(KUNCI_CONTOH, '1'); } catch { /* abaikan */ }
  })();

  root.SkpkBasket = {
    PERAN, PILIHAN_PERAN, peranKini, gantiPeran, boleh, inisial,
    status, label, warna, baris, tambah, daftarTema, daftarJenis, normFas, tarifOtomatis, isiPenetapan, potensi,
    TAHAP, NAMA_TAHAP, NAMA_STATUS, NAMA_AKSI, tahapSeri, langkahSeri, ajukan, putuskan, daftarAju, ambilAju, potensiAju, langkahAju, waktuAkhir, tugas,
    notifikasi, tandaiBaca
  };
})(window);
