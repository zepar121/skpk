/*
 * SKPK v2: basket Profil Komoditas (Menu 2). Seri yang diturunkan dari Browse PIB masuk basket pengguna dengan tema,
 * lalu diberi HS penetapan + tarif BM akhir, dihitung potensinya, dan dikirim ke SIRENA (siap DNOA).
 * Seri yang sudah ada di basket pengguna lain terkunci (tidak bisa diambil dua kali) dan tetap terlihat setelah masuk SIRENA.
 * Disimpan di localStorage peramban (skpk-v2:basket). Basket unit lain adalah contoh yang dibangkitkan tetap, tidak disimpan.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_ASLI;
  const T = root.SkpkTarif;
  const KUNCI = 'skpk-v2:basket';
  const PENGGUNA = 'AB'; // inisial di topbar; login belum ada

  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI)) || {}; } catch { return {}; } };
  const tulis = v => { try { localStorage.setItem(KUNCI, JSON.stringify(v)); return true; } catch { return false; } };
  let milik = baca();

  // ---------- contoh basket unit lain ----------
  // ±20 seri ber-flag RE yang belum ditetapkan, dipilih dengan hash tetap; sebagian sudah dikirim ke SIRENA
  const UNIT_LAIN = ['Kanwil DJBC Jawa Timur I', 'KPU BC Tipe A Tanjung Priok'];
  const CONTOH = new Map();
  D.ROWS.filter(r => (r.flag.inkonsistensi || r.flag.perluasan) && !r.terkunci && D.hash(r.kunci + '|basket') < 0.03).slice(0, 20).forEach((r, i) => {
    const h = D.hash(r.kunci + '|unit');
    const kirim = i % 3 === 0;
    CONTOH.set(r.kunci, {
      kunci: r.kunci, contoh: true, pemilik: UNIT_LAIN[h < 0.5 ? 0 : 1], waktu: '2026-10-' + String(10 + (i % 18)).padStart(2, '0'),
      tema: r.flag.inkonsistensi ? 'Inkonsistensi HS Code' : 'Perluasan Penetapan', catatan: '',
      hs: kirim ? r.hsSaran : null, bm: kirim ? r.trfSaran : null, fasDitolak: false, alasan: kirim ? 'Mengikuti temuan acuan' : '',
      status: kirim ? 'sirena' : 'basket', sirena: kirim ? { nomor: 'SRN-202610' + String(10 + i).padStart(2, '0') + '-' + (1000 + Math.floor(h * 8999)), waktu: '2026-10-' + String(10 + i).padStart(2, '0') } : null
    });
  });

  // entri basket untuk satu baris (milik sendiri didahulukan), null bila belum ada di basket mana pun
  function status(r) {
    const s = milik[r.kunci];
    if (s) return { ...s, kunci: r.kunci, pemilik: PENGGUNA, milikSaya: true };
    const c = CONTOH.get(r.kunci);
    return c ? { ...c, milikSaya: false } : null;
  }
  const label = s => (!s ? null : s.status === 'sirena' ? 'SIRENA ' + s.sirena.nomor : 'Basket - ' + s.pemilik);
  const baris = () => Object.keys(milik).map(k => D.PER_KUNCI.get(k)).filter(Boolean);

  // turunkan baris dari Browse PIB; seri yang sudah ditetapkan (cleansing) dan basket unit lain dilewati
  function tambah(rows, tema, catatan) {
    const hasil = { masuk: 0, sudah: 0, penetapan: 0, terkunci: 0 };
    const waktu = new Date().toISOString();
    for (const r of rows) {
      const s = status(r);
      if (s && s.milikSaya) hasil.sudah++;
      else if (s) hasil.terkunci++;
      else if (r.terkunci) hasil.penetapan++;
      else {
        milik[r.kunci] = { tema, catatan, waktu, hs: null, bm: null, fasDitolak: false, alasan: '', status: 'basket', sirena: null };
        hasil.masuk++;
      }
    }
    if (hasil.masuk) tulis(milik);
    return hasil;
  }

  // tarif BM referensi untuk HS + fasilitas baris (dummy To-Be: MFN 10%, ACFTA 0%); null bila HS tidak dikenal
  function tarifRef(r, hs, fasDitolak) {
    const t = T.tarifUntuk(hs, r.mesin[root.SKPK_DATA.P.fasilitas], { fasDitolak });
    return t.ditemukan ? t.bm : null;
  }

  // HS penetapan + tarif BM akhir (bisa bukan MFN) untuk banyak baris sekaligus; baris yang sudah di SIRENA tidak berubah
  function isiPenetapan(rows, isi) {
    let n = 0;
    for (const r of rows) {
      const s = milik[r.kunci];
      if (!s || s.status === 'sirena') continue;
      s.hs = isi.hs;
      s.bm = isi.bm == null ? tarifRef(r, isi.hs, isi.fasDitolak) : isi.bm;
      s.fasDitolak = !!isi.fasDitolak;
      s.alasan = isi.alasan;
      n++;
    }
    if (n) tulis(milik);
    return n;
  }

  // potensi = penetapan - pemberitahuan. Hanya tarif BM yang berubah; PPN, PPnBM, PPh 22 memakai tarif pemberitahuan
  // (referensi tarif To-Be masih dummy, jadi tarif pajak dari referensi akan memunculkan potensi palsu)
  function potensi(r, s) {
    s = s || status(r);
    if (!s || !s.hs || s.bm == null) return null;
    const d = T.deklarasi(r.mesin);
    const p = T.hitung({ np: d.np, bm: s.bm, ppn: d.tarif.ppn, ppnbm: d.tarif.ppnbm, pph: d.tarif.pph });
    const selisih = Object.fromEntries(T.JENIS.map(k => [k, p[k] - d[k]]));
    return { d, p, selisih };
  }

  // kirim ke SIRENA: baris milik sendiri yang sudah berisi HS penetapan; satu kiriman satu nomor
  function kirimSirena(rows) {
    const siap = rows.filter(r => { const s = milik[r.kunci]; return s && s.status === 'basket' && s.hs; });
    if (!siap.length) return null;
    const kini = new Date();
    const p = n => String(n).padStart(2, '0');
    const nomor = 'SRN-' + kini.getFullYear() + p(kini.getMonth() + 1) + p(kini.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000));
    for (const r of siap) Object.assign(milik[r.kunci], { status: 'sirena', sirena: { nomor, waktu: kini.toISOString() } });
    tulis(milik);
    return { nomor, jumlah: siap.length };
  }

  root.SkpkBasket = { PENGGUNA, status, label, baris, tambah, tarifRef, isiPenetapan, potensi, kirimSirena };
})(window);
