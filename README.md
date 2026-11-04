# SKPK v2

Tampilan **SKPK (Sistem Komputer Penelitian Kembali) awal dari CEISA 4.0** (salinan `..\website-skpk-asli`) dengan **2 menu**, Browse dan Basket,
ditambah mesin hitungan dari prototipe To-Be (`..\website-skpk`). Dasarnya hasil rapat TOR 28 Okt 2026
(`MockUp.pptx` dan `Catatan Rapat TOR SKPK_28 Okt 26.xlsx` di `..\website-skpk-asli`).

Ikon, warna, dan komponen CEISA tidak diubah. Tambahan memakai komponen yang sudah ada (tabel, label flag, tombol,
select, modal, toast, panel Save to theme). CSS baru hanya untuk freeze kolom/header dan baris checkbox flag RE,
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

Online di **https://skpk.asyerf.workers.dev** (Cloudflare Worker `skpk`, dibangun otomatis tiap push ke GitHub `zepar121/skpk`).
`wrangler.jsonc` mengatur Worker: `worker/index.js` menjawab `/api/komentar*`, sisanya file statis dari `dist`.
Penyimpanan: Cloudflare D1 `skpk-komentar` (database terpisah dari kode, disambung lewat nama; dibuat otomatis saat deploy bila belum ada)
lewat `functions/api/komentar*.js` dan `lib/db.js`; tabel dibuat otomatis. Folder `functions/` juga membuat situs bisa jalan di Cloudflare Pages.
Karena terpisah, komentar **tidak hilang** saat situs diperbarui (push ke GitHub → Cloudflare membangun ulang). "Hapus" hanya menandai,
datanya tetap di database. Tiap komentar mencatat halaman, elemen yang diklik (selektor, teks, untuk sel tabel: id baris + judul kolom),
koordinat cadangan, dan versi situs (commit). Bila setelah perbaikan elemennya tidak ada lagi, pin tampil bergaris putus-putus
di posisi lama; komentar pada baris tabel hanya tampil saat baris itu terlihat. Semua tetap ada di daftar.

Tanpa login: siapa pun yang membuka situs bisa berkomentar dan mengubah status. Nama diketik sendiri dan diingat peramban.
API untuk dibaca program lain: `GET /api/komentar` (JSON).

## Peran menu

| Menu | Peran | Isi |
|---|---|---|
| **Browse** (Menu 1) | Cari dan pilih | Seluruh populasi BC 2.0, flag RE, status seri, centang → turunkan ke basket |
| **Basket** (Menu 2) | Basket kerja | Hanya seri yang sudah diturunkan, isi HS penetapan, hitung potensi, ajukan ke analis senior |

## Approval, peran, dan notifikasi (4 Nov 2026)

Hanya dua menu (Browse, Basket). **Topbar tidak diubah** karena bawaan aplikasi induk CEISA; yang diubah hanya isi halaman
mulai kartu di bawah judul halaman.

- **Kepala kartu** (kanan): lonceng notifikasi (angka merah = belum dibaca) dan kotak inisial peran (JA / SA / AD) dengan dropdown
  untuk berganti peran (pengganti login, `skpk-v2:peran`). Di Basket juga ada tombol Data History dan **Approval** (angka = pengajuan
  yang menunggu peran aktif).
- **Lipat** (Dashboard, Advance Filter): caret kecil di kiri tiap bagian seperti collapse di Word; terlipat = garis putus-putus tipis.
  Titik kuning di caret Advance Filter = ada saringan aktif.
- **Alur**: Basket → Final HS → Senior Review → Approved → SIRENA (berhenti di SIRENA). Junior: Penetapan HS dan **Submit** (bar melayang Basket
  atau halaman detail); satu Submit = satu pengajuan `SUB-...`. Senior: Approve, Return (catatan wajib, seri kembali ke basket berlabel
  Returned), Reject (catatan wajib, seri terkunci), lalu Send to SIRENA (`SRN-...`). Admin: semuanya.
- **Basket**: kolom Status (setelah Potensi) = mini progres + nama tahap, klik = halaman Approval. **Dobel-klik baris** = halaman detail.
- **Halaman detail** (`#/smart-pcc/penelitian-skpk/detail-skpk/<id>`, dobel-klik atau tombol biru): bilah progres seri, Penetapan HS
  satu seri (teks Indonesia; tarif BM / PPN / PPh terisi otomatis dari HS Penetapan + Kd Skep Fas selama belum diketik), data pokok
  (Hs Code, Trf Bm, Kd Skep Fas, Nm Imp, Npwp Imp, Potensi), dan tombol sesuai peran di kepala kartu (Submit / Approve / Return /
  Reject / Send to SIRENA). Isi lama halaman ini (Informasi Dokumen, Analisis Audit, tabel Flag, Hasil Penelitian) dihapus supaya ringkas.
- **Supporting Documents** (halaman detail, menggantikan tombol upload kuning di tabel Basket): tombol Upload membuka popup File
  (semua jenis; pilih atau seret), Document Name, Document No., Description. Daftar dokumen di bawah data seri; klik = buka (PDF /
  gambar di tab baru, jenis lain diunduh); hapus lewat ikon tempat sampah. Upload dan hapus hanya selama seri masih di basket.
  Disimpan di IndexedDB peramban (`skpk-v2-lampiran`, `public/js/lampiran.js`).
- **Approval** (`#/smart-pcc/penelitian-skpk/approval/<SUB>`, halaman di dalam Basket): saringan tahap = titik warna + jumlah (nama di
  tooltip, klik lagi = semua); kiri daftar pengajuan (tema, umur, mini progres), kanan bilah progres (nama + tanggal; siapa, jam, nomor
  SRN di tooltip), catatan senior bila dikembalikan / ditolak, tombol keputusan, dan tabel seri (klik baris = detail) dengan total Potensi.
- **Notifikasi**: peristiwa pengajuan yang bukan aksi peran aktif sendiri (aksi, tema, umur; catatan di tooltip). Klik = buka pengajuannya
  dan tandai dibaca; ikon centang ganda = tandai semua (`skpk-v2:notif-baca`, per peran).
- **Contoh**: sekali per peramban dibuat 6 pengajuan contoh di setiap tahap (`skpk-v2:contoh-pengajuan`). Seri yang dulu dikirim lewat
  Process dipindahkan otomatis menjadi pengajuan berstatus SIRENA. Data: `skpk-v2:pengajuan`.

## Jejak perubahan terhadap catatan rapat

"Excel n" = nomor di `Catatan Rapat TOR SKPK_28 Okt 26.xlsx`; "Slide x" = poin di `MockUp.pptx`.

| Perubahan | Dasar | Tempat |
|---|---|---|
| Satu baris per seri, Kode Fas gabungan ("52, 54") | Slide 1a | Browse (data sumber sudah unik per No Aju + seri) |
| Urutan kolom: Kantor, No PIB, Tgl, Seri, Kode Fas, Uraian, Harga Satuan, Status Jalur; lalu Nama Importir dan NPWP | Excel 3, Slide 1b | Browse |
| Kolom Harga Satuan (nilai devisa IDR ÷ jumlah satuan) | Excel 3 | Browse |
| Freeze 7 kolom kiri + header | Excel 4, Slide 1b | Browse; bawaan saja, bisa diubah lewat menu kolom (Pin) atau seret judul (kolom pin maks. 60% lebar tabel, selebihnya ikut bergulir) |
| Kolom Flag RE Inkonsistensi, Perluasan, SKA di ujung kanan; dihapus dari Basket | Slide 1c | Browse |
| Flag RE Perluasan berisi sumbernya: AUDIT / PENUL / NOTUL | Excel 7 | Browse |
| Flag Penetapan Seri: SPTNP / SPKTNP / LHA atas seri itu sendiri | Excel 8, Slide 1d | Browse |
| Status Basket: Basket – pemilik / SIRENA nomor | Excel 10, Slide 1e | Browse |
| Nama: SKPK = Sistem Komputer Penelitian Kembali; menu Browse PIB → **Browse**, Profil Komoditas → **Basket** (rute hash tetap, supaya pin komentar lama cocok) | Permintaan pengguna 4 Nov 2026 | Sidebar, judul halaman, judul tab peramban |
| Menu aktif jelas: latar putih, teks tebal, aksen biru di kiri; menu ciut punya ikon Browse dan Basket; isi dan judul halaman masuk dengan animasi singkat | Permintaan pengguna 4 Nov 2026 | Sidebar, semua halaman |
| Advance Filter tanpa judul; jumlah cocok dan tombol tambah / reset / cari di kanan baris kondisi pertama; titik kuning di tombol cari = isi form belum diterapkan; angka mini dashboard berkedip sekali setelah diperbarui | Permintaan pengguna 4 Nov 2026 | Browse |
| Saringan Show All / RE Inkonsistensi / Re Perluasan / Re SKA (ikon toggle tanpa teks, nama di tooltip) | Slide 1f; permintaan pengguna 3 Nov 2026 | Browse, kepala kartu Data PIB |
| Export Excel hasil saringan | Excel 11 | Browse, tombol Export di kepala kartu Data PIB (sebelah Columns); kolom = kolom yang tampil, sesuai urutannya |
| Semua kolom PIB (107 kolom data sumber, nama dan isi persis seperti Excel) + 6 kolom tambahan SKPK, total 113; tombol **Columns** | Permintaan pengguna 3 Nov 2026 | Browse (bawaan 27 kolom rapat, sisanya tersembunyi); Basket juga punya Pilih Kolom |
| Advance Filter lengkap seperti To-Be: kolom apa saja, operator sesuai tipe, AND/OR, between, kosong, jumlah cocok (tanpa dropdown saran nilai) | Permintaan pengguna 3 Nov 2026 | Browse |
| Save to theme = turunkan seri tercentang ke basket, banyak seri sekaligus, lewat bar melayang di tengah bawah layar (jumlah tercentang, bookmark, batalkan) yang membuka panel kanan. Halaman Browse dan Basket muat satu layar; yang bergulir hanya tabel. Basket tanpa Service Health Monitor; aksi Set Final HS dan Process ada di bar melayang. Isian: Theme Name dan Theme Type (klik = daftar yang pernah dibuat, tetap bisa diketik baru), Analysis (teks bebas) | Excel 1, Slide 2; permintaan pengguna 3 Nov 2026 | Browse |
| Kartu atas Browse dirampingkan: tanpa judul "Browse", jenis dokumen jadi dropdown (seperti To-Be), periode di baris yang sama, mini dashboard tetap seperti CEISA (2 × 4 kartu), caret kecil di kiri untuk melipat mini dashboard dan Advance Filter (sejak 4 Nov 2026; diingat `skpk-asli:lipat`; titik kuning di caret filter = ada saringan aktif) | Permintaan pengguna 3 Nov 2026 | Browse |
| Popup **Penetapan HS** (dulu Set Final HS, teks berbahasa Indonesia atas permintaan pengguna): tabel seri tercentang di kiri (No Pib, Seri Brg, Hs Code, Kd Skep Fas dengan nama fasilitas di tooltip, Ur Brg, dan pratinjau tarif BM / PPN / PPh penetapan per seri; biru = otomatis, gelap = ketikan; titik biru = sudah punya HS penetapan), centang per seri / klik baris / pilih semua. Tarif terisi otomatis dari HS Penetapan + Kd Skep Fas **tiap seri** (ikon rantai), jadi seri dengan fasilitas berbeda (mis. satu 54, satu tanpa fasilitas) tetap mendapat tarifnya masing-masing; bila berbeda, kotak di kanan bertuliskan *Per seri*. Nilai yang diketik berlaku untuk semua seri tercentang (ikon putar = kembali otomatis). Acuan sementara = tarif terbanyak di data PIB untuk HS + Kd Skep Fas yang sama (`tarifOtomatis` di `basket.js`, ganti dengan BTKI nanti). Pungutan Lain: BMAD, BMTP, BMI, BMP, PPnBM (BMAD dsb. ditambahkan ke BM, PPnBM menggantikan tarif PPnBM). **Simpan tidak menutup popup**: seri yang tersimpan hilang dari tabel (toast *Tersimpan*), sisanya tetap dengan centangnya; popup tertutup sendiri setelah seri terakhir disimpan. Kolom Tarif PPN / PPh Penetapan di tabel | Permintaan pengguna 4 Nov 2026 | Basket |
| Warna baris di Browse dan Basket (`SkpkBasket.warna`): putih = belum di basket, kuning = di basket (termasuk Returned / Rejected), hijau = sudah diproses dari basket (Submit, Approved, SIRENA), merah = sudah ditetapkan (notul / penul / audit: SPTNP / SPKTNP / LHA); garis warna di kiri baris. Di Basket legenda kepala tabel (kuning / hijau + jumlah, nama di tooltip) sekaligus saringan (diingat `skpk-asli:sesi:profil-warna`, ikut Reset). Opsi tabel `kelasBaris` di `tabel.js` | Permintaan pengguna 4 Nov 2026 | Browse, Basket |
| Filter Tema di atas tabel | Excel 2, Slide 2.2a | Basket |
| Isi HS Penetapan + Tarif BM akhir untuk banyak seri sekaligus, tarif bisa diedit (bukan MFN) | Excel 5, 6 | Basket, tombol Isi HS Penetapan |
| Kolom HS Penetapan, Tarif BM Penetapan, Potensi, Tema Analisis, Jenis Tema, Analisis, Status | Excel 5, 6 | Basket; filter Tema berisi tema milik sendiri |
| Proses = kirim ke SIRENA, seri tidak hilang dari basket. Sejak 4 Nov 2026 lewat alur Submit → Approve → Send to SIRENA | Slide 1e, 2; permintaan pengguna 4 Nov 2026 | Basket (Submit), Basket → Approval |
| Data History dari batch audit / penul / notul yang sama dengan Flag Penetapan | Excel 8 | Basket → Data History |

## UI/UX tambahan dari To-Be

Bentuk halaman dan kartu tetap CEISA. **Tabel** (`public/js/tabel.js`, gaya `.tg-*` di akhir `style.css`) meniru tabel
`..\website-skpk`, kecuali dua hal yang sengaja tidak dibawa: dropdown saringan khas Excel (daftar nilai dicentang,
Text Filters, Filter by list) dan ikon "buka detail" di kiri baris.

- **Menu kolom** (ikon panah di judul, tampil saat disorot): hanya *Urutkan A → Z*, *Urutkan Z → A* (klik lagi = lepas),
  *Pin Kolom / Lepas Pin*, *Lebar Pas Isi*, dan kotak cari biasa (tanpa daftar nilai). Cari: teks = mengandung, `*` dan `?`
  wildcard; angka `>1000000`, `<=10`, `=5`, `10..20` (boleh `1.000.000` atau `2,5`); tanggal `2026-03` atau `30-03-2026`.
  Kolom yang disaring ikonnya berubah jadi corong biru; status bar menulis "N data dari M" dan tautan *Hapus saringan kolom*.
- **Pilih Kolom** (tombol di kepala kartu Data PIB dan di Basket): cari kolom (nama tampil atau nama kolom PIB),
  centang tampil/sembunyi, seret pegangan (atau ↑/↓) untuk mengurutkan, *Semua*, *Bawaan*. Tanda *tambahan* = kolom hitungan /
  flag SKPK, *pin* = menempel di kiri. Diingat per tabel (`skpk-asli:kolom:<id>`, `skpk-asli:pin:<id>`).
- **Pin dan urutan**: kolom pin selalu paling kiri. Seret judul kolom ke kiri/kanan untuk memindah; jatuh di area pin = ikut di-pin,
  keluar = lepas. Bawaan Browse 7 kolom (rapat). Kolom pin paling banyak 60% lebar tabel; di layar sempit sisanya ikut bergulir.
- **Lebar kolom**: tarik tepi kanan judul; dobel-klik tepi itu = pas isi (semua kolom terpilih sekaligus). `skpk-asli:lebar:<id>`.
- **Sel aktif ala Excel**: klik sel = aktif, Shift+klik / Shift+panah = rentang, panah / Home / End / PageUp / PageDown berpindah,
  Ctrl+panah ke ujung. Klik judul = pilih kolom utuh (Shift = sampai kolom itu, Ctrl = tambah/lepas), Ctrl+Spasi = kolom sel aktif,
  Ctrl+A = semua kolom, Esc = lepas. **Ctrl+C** menyalin teks bertab (langsung ke Excel); kolom utuh disalin sebatas halaman yang tampil.
  Bila lebih dari satu sel terpilih, status bar menampilkan Sum (atau Average, Count, Numerical Count, Min, Max; klik untuk
  memilih, diingat `skpk-asli:agregat`), dihitung hanya atas baris di halaman yang tampil: 50 / 100 / 250 / 500 baris sesuai ukuran halaman,
  seluruh hasil saringan bila ukuran halaman *All*.
- **Status bar dan paginasi**: jumlah data, ringkasan PIB · NPWP · nilai devisa (Browse), tombol halaman pertama/sebelum/berikut/
  terakhir, nomor halaman bisa diketik, 50 / 100 / 250 / 500 / *Semua* per halaman. Di atas 120 baris hanya baris di sekitar layar
  yang digambar (virtual scrolling), jadi *Semua* tetap ringan.
- **Geser**: isi tabel bisa ditarik dengan mouse; tanpa sel aktif, panah ←/→ menggeser tabel. Header selalu menempel di atas,
  kolom Aksi di kanan.
- **Centang**: setelah centang semua di satu halaman, strip di atas tabel menawarkan *Centang semua N data* dan *Batalkan*.
  Save to theme memakai semua yang dicentang, termasuk di halaman lain.
- **Advance Filter** (kartu Browse, meniru Advanced filter To-Be): tiap baris = [kolom] [operator] [nilai], kolom apa saja
  dari 114 kolom. Operator teks: contains, does not contain, equals, does not equal, begins with, does not begin with, ends with,
  does not end with, matches regex, is empty, is not empty (`*` dan `?` wildcard). Angka: =, ≠, >, ≥, <, ≤, di antara, kosong,
  tidak kosong. Tanggal: pada, bukan pada, sebelum, sesudah, di antara, kosong, tidak kosong. Penghubung DAN / ATAU per baris
  (DAN didahulukan). Jumlah data cocok tampil sebelum menekan **Search** (Enter). Tidak ada daftar saran nilai: untuk data besar tidak praktis.
- **Ingat keadaan**: saringan kolom, sortir, halaman, ukuran halaman, centang (`skpk-asli:tabel:<id>`), Advance Filter dan
  checkbox RE (`skpk-asli:sesi:browse2`), filter Tema (`skpk-asli:sesi:profil-tema`) tetap saat kembali dari Data
  Transaksional / Detail. Setelah muat ulang, toast *Saringan Dipulihkan* dengan tombol **Bersihkan**.
- **Urungkan**: Reset (Browse) dan Reset Filter (Profil, Data History) memberi toast dengan tombol **Urungkan**.
- **Tooltip cepat** (`public/js/tip.js`): semua `title` tampil ±350 ms dan saat fokus keyboard; tidak tampil di mode komentar.
- **Lainnya**: Enter di kotak isian modal = tombol utama; garis fokus keyboard; modal muncul dengan fade singkat
  (mati bila `prefers-reduced-motion`); di bawah 1100 px menu otomatis diciutkan, di bawah 760 px menu ikon tetap ada.

Di mode komentar klik dan tarik tidak diteruskan ke situs, jadi menu kolom, seret, dan ubah lebar tidak terpicu.

## Data dan mesin

- `public/data/bc20.js`, `notul.js`: data dari `website-skpk` yang **hanya kolom `Nm Imp` (nama importir) disamarkan** (`npm run samarkan`,
  skrip `scripts/samarkan-data.mjs`): nama importir diganti lorem ipsum (mis. `PT LOREM DOLOR`, tetap dan unik per importir, sama di bc20 dan notul).
  Semua kolom lain, termasuk NPWP, Nm Ind, Nm Pemasok, Nm Pengirim, Nama Ppjk, No Aju, No Api, uraian, HS, tarif, nilai, tanggal, kantor,
  sama persis dengan sumbernya. Nama kolom dan isi kolom PIB di tabel juga persis seperti Excel (tanpa nama lain, tanpa format tambahan).
  Data asli tetap hanya di `..\website-skpk`. Bila data asli diperbarui, jalankan `npm run samarkan` lagi.
- `public/js/mesin/`: **disalin apa adanya** dari `..\website-skpk\public\js\` (dokumen, data, query, riwayat, analisis, tarif, ekspor).
  Jangan diedit di sini; bila To-Be diperbarui, salin ulang filenya.
- `public/js/data.js`: baris tampilan CEISA, disambung ke baris mesin lewat No Aju + seri.
  - RE Inkonsistensi = HS Flag mesin `LOWER DUTY` / `MISMATCH` (uraian sama memakai HS berbeda).
  - RE Perluasan = Audit Flag / Penul Flag / Notul Expansion mesin (uraian mirip ≥ 80% dengan temuan, HS asal sama).
  - Penetapan Seri = riwayat mesin. Seri yang tarifnya terkunci (audit, penul, notul salah tarif) tidak bisa masuk basket.
  - HS / Tarif Suggestion = HS penetapan temuan acuan perluasan, atau HS acuan Inkonsistensi.
  - **Masih contoh** (hash tetap, belum ada mesinnya): RE SKA, Flag P2, Flag Analisis, Re-Assessment, Ket. DNDA, periode audit di Data History.
- `public/js/basket.js`: basket dan pengajuan di `localStorage` peramban (`skpk-v2:basket`, `skpk-v2:pengajuan`), peran aktif di topbar.
  20 seri contoh berada di basket unit lain (Kanwil DJBC Jawa Timur I, KPU Tanjung Priok), sebagian sudah SIRENA, supaya kunci terlihat.
- Potensi = penetapan − pemberitahuan. Hanya tarif BM yang berubah; PPN, PPnBM, PPh 22 memakai tarif pemberitahuan.
  Tarif BM bawaan dari referensi mesin yang **masih dummy** (MFN 10%, ACFTA kode 54 = 0%), jadi isi Tarif BM Akhir bila tahu tarif sebenarnya.

## Belum dikerjakan (Tahap 3)

- Jenis dokumen lain (BC 2.5, 2.8, 3.0, PPFTZ-01, TLDDP) (Excel 9). Data BC 3.0 sudah ada di To-Be.
- Dashboard SKPK: capaian, HS penul vs LHA, akurasi penetapan, kinerja vs realisasi, potensi vs tagihan.
- Konfirmasi ke IKC: cakupan perluasan penul/LHA (satu entitas atau semua), logika RE Inkonsistensi, Penetapan, SKA.
- Kemiripan nama pemasok di Risk Engine (Slide 1g). Mesin RE SKA yang nyata.
- Login dan unit kerja; sekarang peran dipilih sendiri di topbar (Junior / Senior / Admin), satu unit.
- Umpan balik SIRENA (status setelah dikirim, nomor DNOA) dan notifikasi lewat surel kedinasan.
