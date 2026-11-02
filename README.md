# SKPK v2

Tampilan **SKPK awal dari CEISA 4.0** (salinan `..\website-skpk-asli`) dengan **2 menu**, Browse PIB dan Profil Komoditas,
ditambah mesin hitungan dari prototipe To-Be (`..\website-skpk`). Dasarnya hasil rapat TOR 28 Okt 2026
(`MockUp.pptx` dan `Catatan Rapat TOR SKPK_28 Okt 26.xlsx` di `..\website-skpk-asli`).

Ikon, warna, dan komponen CEISA tidak diubah. Tambahan memakai komponen yang sudah ada (tabel, label flag, tombol,
select, modal, toast, kartu Input Analisis). CSS baru hanya untuk freeze kolom/header dan baris checkbox flag RE,
keduanya diminta rapat.

## Menjalankan

```
npm install      # sekali saja
npm run dev      # http://127.0.0.1:4332  (komentar mode lokal, tersimpan di peramban saja)
npm run cf       # http://127.0.0.1:8788  (seperti di Cloudflare: komentar ke database D1 lokal di .wrangler/)
```

Atau klik dua kali `scripts\jalankan-skpk-v2.vbs`. Port: 4330 To-Be, 4331 As-Is, 4332 v2. Butuh Node 22.23 ke atas (`.nvmrc` = 24).

## Komentar pengguna

Tombol bulat di kanan bawah (lapisan di atas situs, bukan bagian desain CEISA):

- **Tambah komentar** (ikon balon +): masuk mode komentar, klik bagian halaman mana saja, tulis nama dan masukan, Simpan.
  Muncul pin kuning bernomor di tempat itu. Esc untuk keluar dari mode.
- **Daftar komentar** (ikon balon, angka merah = komentar yang belum selesai): semua komentar per halaman atau semua halaman,
  saring per status, klik untuk membuka halaman dan utasnya, **Unduh CSV** untuk dipelajari.
- Klik pin: baca utas, balas, ubah status (Baru / Sedang diperbaiki / Selesai / Tidak dikerjakan), hapus komentar sendiri.

Penyimpanan: Cloudflare D1 (database terpisah dari kode) lewat `functions/api/komentar*.js` dan `lib/db.js`; tabel dibuat otomatis.
Karena terpisah, komentar **tidak hilang** saat situs diperbarui (push ke GitHub → Cloudflare membangun ulang). "Hapus" hanya menandai,
datanya tetap di database. Tiap komentar mencatat halaman, elemen yang diklik (selektor, teks, untuk sel tabel: id baris + judul kolom),
koordinat cadangan, dan versi situs (commit). Bila setelah perbaikan elemennya tidak ada lagi, pin tampil bergaris putus-putus
di posisi lama; komentar pada baris tabel hanya tampil saat baris itu terlihat. Semua tetap ada di daftar.

Tanpa login: siapa pun yang membuka situs bisa berkomentar dan mengubah status. Nama diketik sendiri dan diingat peramban.
API untuk dibaca program lain: `GET /api/komentar` (JSON).

## Peran menu

| Menu | Peran | Isi |
|---|---|---|
| **Browse PIB** (Menu 1) | Cari dan pilih | Seluruh populasi BC 2.0, flag RE, status seri, centang → turunkan ke basket |
| **Profil Komoditas** (Menu 2) | Basket kerja | Hanya seri yang sudah diturunkan, isi HS penetapan, hitung potensi, kirim ke SIRENA |

Anti-dobel: seri yang sudah ditetapkan (SPTNP/SPKTNP/LHA) dan seri yang ada di basket unit lain tidak bisa diturunkan.
Seri yang sudah dikirim ke SIRENA tetap tampil di basket dan di Browse PIB dengan nomor kirimannya.

## Jejak perubahan terhadap catatan rapat

"Excel n" = nomor di `Catatan Rapat TOR SKPK_28 Okt 26.xlsx`; "Slide x" = poin di `MockUp.pptx`.

| Perubahan | Dasar | Tempat |
|---|---|---|
| Satu baris per seri, Kode Fas gabungan ("52, 54") | Slide 1a | Browse PIB (data sumber sudah unik per No Aju + seri) |
| Urutan kolom: Kantor, No PIB, Tgl, Seri, Kode Fas, Uraian, Harga Satuan, Status Jalur | Excel 3, Slide 1b | Browse PIB |
| Kolom Harga Satuan (nilai devisa IDR ÷ jumlah satuan) | Excel 3 | Browse PIB |
| Freeze 7 kolom kiri + header | Excel 4, Slide 1b | Browse PIB (layar sempit: kolom beku dikurangi dari kanan, maks. 72% lebar tabel) |
| Kolom Flag RE Inkonsistensi, Perluasan, SKA di ujung kanan; dihapus dari Profil Komoditas | Slide 1c | Browse PIB |
| Flag RE Perluasan berisi sumbernya: AUDIT / PENUL / NOTUL | Excel 7 | Browse PIB |
| Flag Penetapan Seri: SPTNP / SPKTNP / LHA atas seri itu sendiri | Excel 8, Slide 1d | Browse PIB |
| Status Basket: Basket – pemilik / SIRENA nomor | Excel 10, Slide 1e | Browse PIB |
| Checkbox Show All / RE Inkonsistensi / Re Perluasan / Re SKA | Slide 1f | Browse PIB, kepala kartu Data PIB |
| Export Excel hasil saringan | Excel 11 | Browse PIB, tombol Export di sebelah Reset |
| Kartu Input Analisis = turunkan seri tercentang ke basket (tema + catatan), banyak seri sekaligus | Excel 1, Slide 2 | Browse PIB |
| Filter Tema di atas tabel | Excel 2, Slide 2.2a | Profil Komoditas |
| Isi HS Penetapan + Tarif BM akhir untuk banyak seri sekaligus, tarif bisa diedit (bukan MFN) | Excel 5, 6 | Profil Komoditas, tombol Isi HS Penetapan |
| Kolom HS Penetapan, Tarif BM Penetapan, Potensi, Tema, Catatan, Status | Excel 5, 6 | Profil Komoditas |
| Proses = kirim ke SIRENA (siap DNOA), seri tidak hilang dari basket | Slide 1e, 2 | Profil Komoditas, tombol Proses |
| Data History dari batch audit / penul / notul yang sama dengan Flag Penetapan | Excel 8 | Profil Komoditas → Data History |

## Data dan mesin

- `public/data/bc20.js`, `notul.js`: data dari `website-skpk` yang **identitasnya disamarkan** (`npm run samarkan`, skrip
  `scripts/samarkan-data.mjs`): nama importir, pemilik barang, PPJK, pemasok, pengirim, semua NPWP, No API, dan identitas pengaju
  di No Aju diganti nama/angka samaran yang tetap. Uraian, HS, tarif, nilai, tanggal, kantor tetap, jadi hasil flag sama dengan data asli.
  Data asli tetap hanya di `..\website-skpk` dan tidak masuk repo ini. Bila data asli diperbarui, jalankan `npm run samarkan` lagi.
- `public/js/mesin/`: **disalin apa adanya** dari `..\website-skpk\public\js\` (dokumen, data, query, riwayat, analisis, tarif, ekspor).
  Jangan diedit di sini; bila To-Be diperbarui, salin ulang filenya.
- `public/js/data.js`: baris tampilan CEISA, disambung ke baris mesin lewat No Aju + seri.
  - RE Inkonsistensi = HS Flag mesin `LOWER DUTY` / `MISMATCH` (uraian sama memakai HS berbeda).
  - RE Perluasan = Audit Flag / Penul Flag / Notul Expansion mesin (uraian mirip ≥ 80% dengan temuan, HS asal sama).
  - Penetapan Seri = riwayat mesin. Seri yang tarifnya terkunci (audit, penul, notul salah tarif) tidak bisa masuk basket.
  - HS / Tarif Suggestion = HS penetapan temuan acuan perluasan, atau HS acuan Inkonsistensi.
  - **Masih contoh** (hash tetap, belum ada mesinnya): RE SKA, Flag P2, Flag Analisis, Re-Assessment, Ket. DNDA, periode audit di Data History.
- `public/js/basket.js`: basket di `localStorage` peramban (`skpk-v2:basket`), pengguna `AB` (inisial di topbar).
  20 seri contoh berada di basket unit lain (Kanwil DJBC Jawa Timur I, KPU Tanjung Priok), sebagian sudah SIRENA, supaya kunci terlihat.
- Potensi = penetapan − pemberitahuan. Hanya tarif BM yang berubah; PPN, PPnBM, PPh 22 memakai tarif pemberitahuan.
  Tarif BM bawaan dari referensi mesin yang **masih dummy** (MFN 10%, ACFTA kode 54 = 0%), jadi isi Tarif BM Akhir bila tahu tarif sebenarnya.

## Belum dikerjakan (Tahap 3)

- Jenis dokumen lain (BC 2.5, 2.8, 3.0, PPFTZ-01, TLDDP) (Excel 9). Data BC 3.0 sudah ada di To-Be.
- Dashboard SKPK: capaian, HS penul vs LHA, akurasi penetapan, kinerja vs realisasi, potensi vs tagihan.
- Konfirmasi ke IKC: cakupan perluasan penul/LHA (satu entitas atau semua), logika RE Inkonsistensi, Penetapan, SKA.
- Kemiripan nama pemasok di Risk Engine (Slide 1g). Mesin RE SKA yang nyata.
- Login dan unit kerja; sekarang satu pengguna tetap.
