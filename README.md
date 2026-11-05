# SKPK v2

Tampilan **SKPK (Sistem Komputer Penelitian Kembali) awal dari CEISA 4.0** (salinan `..\website-skpk-asli`) dengan **2 menu**, Browse dan Basket,
ditambah mesin hitungan dari prototipe To-Be (`..\website-skpk`). Dasarnya hasil rapat TOR 28 Okt 2026
(`MockUp.pptx` dan `Catatan Rapat TOR SKPK_28 Okt 26.xlsx` di `..\website-skpk-asli`).

Ikon, warna, dan komponen CEISA tidak diubah. Tambahan memakai komponen yang sudah ada (tabel, label flag, tombol,
select, modal, toast). CSS baru hanya untuk freeze kolom/header dan baris checkbox flag RE,
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
| **Browse** (Menu 1) | Cari, analisa, pilih | Seluruh populasi BC 2.0, flag RE, status seri; satu popup **Penetapan HS** untuk seri tercentang: tema + HS penetapan, tarif, pratinjau potensi, lalu simpan = masuk basket |
| **Basket** (Menu 2) | Kirim | Hanya seri yang sudah dianalisa dan dinilai layak, ajukan ke Analis 2 (tanpa analisa di sini) |

## Approval, peran, dan notifikasi (4 Nov 2026)

Hanya dua menu (Browse, Basket). **Topbar tidak diubah** karena bawaan aplikasi induk CEISA; yang diubah hanya isi halaman
mulai kartu di bawah judul halaman.

- **Kepala kartu** (kanan): lonceng notifikasi (angka merah = belum dibaca) dan kotak inisial peran (A1 / A2 / AD = Analis 1 / Analis 2 / Admin) dengan dropdown
  untuk berganti peran (pengganti login, `skpk-v2:peran`). Di Basket juga ada tombol Data History dan **Approval** (angka = pengajuan
  yang menunggu peran aktif).
- **Lipat** (Dashboard, Advance Filter): caret kecil di kiri tiap bagian seperti collapse di Word; terlipat = garis putus-putus tipis.
  Titik kuning di caret Advance Filter = ada saringan aktif.
- **Alur**: Final HS (di Browse) → Basket → Analis 2 Review → Approved → SIRENA (berhenti di SIRENA). Analis 1: Penetapan HS di Browse dan **Submit** (bar melayang Basket
  atau halaman detail); satu Submit = satu pengajuan `SUB-...`. Analis 2: Approve, Return (catatan wajib, seri kembali ke basket berlabel
  Returned; diperbaiki lewat Penetapan HS di Browse), Reject (catatan wajib, seri terkunci), lalu Send to SIRENA (`SRN-...`). Admin: semuanya. Kunci peran di peramban tetap `junior` / `senior` / `admin`.
- **Basket**: kolom Status (setelah Potensi) = mini progres + nama tahap, klik = halaman Approval. **Dobel-klik baris** = halaman detail.
- **Halaman detail** (`#/smart-pcc/penelitian-skpk/detail-skpk/<id>`, dobel-klik atau tombol biru): bilah progres seri, hasil analisa
  satu seri dalam **form yang sama dengan popup Penetapan HS** (`htmlFormHs` / `pasangFormHs` di app.js: HS Penetapan, tarif,
  Pungutan Lain, Alasan; **selalu hanya baca**, analisa diubah di Browse), data pokok
  (Hs Code, Trf Bm, Kd Skep Fas, Nm Imp, Npwp Imp, Potensi), dan tombol sesuai peran di kepala kartu (Submit / Approve / Return /
  Reject / Send to SIRENA). Isi lama halaman ini (Informasi Dokumen, Analisis Audit, tabel Flag, Hasil Penelitian) dihapus supaya ringkas.
- **Supporting Documents** (halaman detail, menggantikan tombol upload kuning di tabel Basket): tombol Upload membuka popup File
  (semua jenis; pilih atau seret), Document Name, Document No., Description. Daftar dokumen di bawah data seri; klik = buka (PDF /
  gambar di tab baru, jenis lain diunduh); hapus lewat ikon tempat sampah. Upload dan hapus hanya selama seri masih di basket.
  Disimpan di IndexedDB peramban (`skpk-v2-lampiran`, `public/js/lampiran.js`).
- **Approval** (`#/smart-pcc/penelitian-skpk/approval/<SUB>`, halaman di dalam Basket): saringan tahap = titik warna + jumlah (nama di
  tooltip, klik lagi = semua); kiri daftar pengajuan (tema, umur, mini progres), kanan bilah progres (nama + tanggal; siapa, jam, nomor
  SRN di tooltip), catatan senior bila dikembalikan / ditolak, tombol keputusan, dan tabel seri (klik baris = detail) dengan total Potensi.
- **Notifikasi**: hanya hal yang perlu ditindaklanjuti peran aktif, bukan log peristiwa; hilang sendiri setelah ditangani. Senior / Admin:
  *Needs approval* (Senior Review) dan *Ready for SIRENA* (Approved). Junior / Admin: *Returned*. Penanggung jawab seri (Junior untuk seri di basket,
  Senior untuk seri yang sedang diajukan): *Expiring soon* (tinggal ≤ 30 hari dari batas 2 tahun) dan *Expired*, satu baris per tema, klik = Basket
  dengan saringan tema itu. Angka merah di lonceng = jumlah yang masih perlu ditindaklanjuti; latar biru = belum dibuka (`skpk-v2:notif-baca`, per peran).
- **Contoh**: sekali per peramban dibuat 6 pengajuan contoh di setiap tahap (`skpk-v2:contoh-pengajuan`). Seri yang dulu dikirim lewat
  Process dipindahkan otomatis menjadi pengajuan berstatus SIRENA. Data: `skpk-v2:pengajuan`.

## Revisi 5 Nov 2026 (arahan atasan)

- **Analisa pindah ke Browse, digabung dengan Save to theme**: satu tombol pena di bar melayang membuka popup **Penetapan HS**:
  kiri seri tercentang dengan pratinjau tarif BM / PPN / PPh dan **Potensi per seri + total** (potensi ≤ 0 diredupkan supaya seri yang
  tidak layak mudah dilepas centangnya; label *Basket* / SPTNP / SPKTNP / LHA di depan uraian, catatan kuning bila ada seri yang sudah
  ditetapkan atau tidak ikut); kanan **Nama Tema, Jenis Tema**, lalu HS Penetapan, tarif, Pungutan Lain, Alasan (= analisis tema), dokumen.
  Simpan = analisa tersimpan per seri (`skpk-v2:analisa`) dan seri masuk basket dengan tema itu; seri yang sudah di basket sendiri
  (mis. Returned) hanya diperbarui analisanya dan tetap di temanya (tema tidak wajib bila semua seri sudah di basket). Panel kanan
  Save to theme dan popup *Already Assessed* dihapus. Di Basket tidak ada lagi Penetapan HS: tinggal Submit / keluarkan; halaman detail
  hanya baca. Seri yang sedang diajukan, milik unit lain, atau expired tidak ikut.
- **Kolom**: tombol Columns (Browse dan Basket) dan seret judul kolom dihapus. Basket: Tema, Kode Kantor, Nomor Dokumen, Tanggal, Seri,
  Uraian, Perusahaan, HS Code, Tarif, HS Penetapan, Tarif Penetapan, Potensi, **Status paling belakang**.
- **Regex** di Advance Filter: bukan operator dan bukan sakelar global, tapi **tombol ikon per kondisi** di luar kotak nilai (sebelah tombol
  hapus kondisi), **hanya untuk kolom teks** (HS Code, NPWP, Nomor Dokumen, uraian, dsb. bertipe teks). Kolom angka / tanggal tidak
  punya tombol (tempatnya kosong supaya baris sejajar): isi mentahnya berbeda dari yang tampil dan operatornya sendiri (>, between,
  before / after) lebih tepat; operator *is empty / is not empty* juga tanpa tombol. Garis biru = mati, biru penuh = nyala, merah = pola
  tidak sah (kotak nilai ikut merah, Search ditolak dengan pesan yang menyebut kondisinya); saat nyala kotak nilai berhuruf monospace.
  **Operator tetap berlaku** supaya user cukup menulis inti pola: contains = di mana saja, equals = `^(...)$`, begins / ends with =
  `^(...)` / `(...)$`, "does not" = kebalikannya (sulit ditulis sebagai regex murni). Sesi lama ("matches regex" atau sakelar global)
  otomatis jadi regex nyala di kondisinya.
- **Jenis dokumen**: BC 2.0, BC 2.5, BC 2.8, BC 3.0, PPFTZ-01 TLDDP (BC 2.3 dihapus). Selain BC 2.0 datanya belum ada.
- **Tanpa hitungan baris setelah saring** (memberatkan, harus dihitung ulang): jumlah di dropdown Flag RE, Cleansing, dan Status Basket, jumlah
  di chip tampilan Cleansing, jumlah data cocok Advance Filter, "dari M" dan ringkasan PIB · NPWP · nilai devisa di status bar tabel.
- **Peran**: Analis 1, Analis 2, Admin (inisial A1 / A2 / AD); tahap Senior Review jadi Analis 2 Review; Final HS sebelum Basket di bilah progres.
- Perbaikan: di peramban yang baru pertama membuka SKPK, pembuatan pengajuan contoh berhenti dengan galat (`idPeristiwa` tidak ada) dan halaman kosong.

## Jejak perubahan terhadap catatan rapat

"Excel n" = nomor di `Catatan Rapat TOR SKPK_28 Okt 26.xlsx`; "Slide x" = poin di `MockUp.pptx`.

| Perubahan | Dasar | Tempat |
|---|---|---|
| Satu baris per seri, Kode Fas gabungan ("52, 54") | Slide 1a | Browse (data sumber sudah unik per No Aju + seri) |
| Urutan kolom: Kantor, No PIB, Tgl, Seri, Kode Fas, Uraian, Harga Satuan, Status Jalur; lalu Nama Importir dan NPWP | Excel 3, Slide 1b | Browse |
| Kolom Harga Satuan (nilai devisa IDR ÷ jumlah satuan) | Excel 3 | Browse |
| Freeze 7 kolom kiri + header | Excel 4, Slide 1b | Browse; bisa diubah lewat menu kolom (Pin); seret judul dihapus 5 Nov 2026 (kolom pin maks. 60% lebar tabel, selebihnya ikut bergulir) |
| Kolom Flag RE Inkonsistensi, Perluasan, SKA di ujung kanan; dihapus dari Basket | Slide 1c | Browse |
| Flag RE Perluasan berisi sumbernya: AUDIT / PENUL / NOTUL | Excel 7 | Browse |
| Flag Penetapan Seri: SPTNP / SPKTNP / LHA atas seri itu sendiri | Excel 8, Slide 1d | Browse |
| Status Basket: Basket – pemilik / SIRENA nomor | Excel 10, Slide 1e | Browse |
| Nama: SKPK = Sistem Komputer Penelitian Kembali; menu Browse PIB → **Browse**, Profil Komoditas → **Basket** (rute hash tetap, supaya pin komentar lama cocok) | Permintaan pengguna 4 Nov 2026 | Sidebar, judul halaman, judul tab peramban |
| Menu aktif jelas: latar putih, teks tebal, aksen biru di kiri; menu ciut punya ikon Browse dan Basket; isi dan judul halaman masuk dengan animasi singkat | Permintaan pengguna 4 Nov 2026 | Sidebar, semua halaman |
| Advance Filter tanpa judul; jumlah cocok dan tombol tambah / reset / cari di kanan baris kondisi pertama; titik kuning di tombol cari = isi form belum diterapkan; angka mini dashboard berkedip sekali setelah diperbarui | Permintaan pengguna 4 Nov 2026 | Browse |
| **Flag RE** = satu ikon bendera di kanan kepala kartu Data PIB (sebelah sapu Cleansing), dropdown bercentang Inkonsistensi / Perluasan / SKA dengan titik warna dan jumlah (setelah Cleansing + Advance Filter); tanpa centang = semua baris, dicentang = hanya baris ber-flag itu (beberapa = salah satunya). Ikon biru penuh selama ada flag dicentang | Slide 1f; permintaan pengguna 3 dan 4 Nov 2026 | Browse |
| **Cleansing** (ikon sapu di kepala kartu Data PIB, sebelah Columns) = dropdown bercentang: **Notul** (SPTNP), **Penul** (SPKTNP), **Audit** (LHA), **Expired** (lewat 2 tahun sejak tanggal dokumen, dihitung dari hari halaman dibuka), **Basket** (di basket mana pun, termasuk diajukan / ditolak), **SIRENA**. Baris yang masuk salah satu kategori tercentang disembunyikan dari tabel, chip RE, mini dashboard, dan jumlah Advance Filter; centang pada baris tersembunyi dilepas. Tiap kategori: titik warna (= warna baris), jumlah, dan **ikon mata** untuk melihat baris yang dibuang kategori itu (mata di baris Cleansing = semua yang dibuang); selama dilihat ada chip biru di kiri sapu, klik = kembali. Ikon sapu biru penuh selama ada kategori dicentang. Diingat (`skpk-asli:sesi:browse2`, `bersih`), tidak ikut Reset; tampilan mata tidak diingat | Permintaan pengguna 4 Nov 2026 | Browse |
| Penetapan HS + tema: seri **expired** (lewat 2 tahun sejak tanggal dokumen), sedang diajukan, atau milik unit lain **tidak ikut** (disebut di catatan kuning popup). Seri yang sudah ditetapkan tetap boleh (penetapan ulang 0% → 5% → 10%): berlabel SPTNP / SPKTNP / LHA dan disebut jumlahnya; lepas centangnya bila tidak ingin | Masukan rapat dan pengguna 4-5 Nov 2026 | Browse → Penetapan HS |
| Export Excel hasil saringan | Excel 11 | Browse, tombol Export di kepala kartu Data PIB (sebelah Columns); kolom = kolom yang tampil, sesuai urutannya |
| Semua kolom PIB (107 kolom data sumber, nama dan isi persis seperti Excel) + 6 kolom tambahan SKPK, total 113; tombol **Columns** | Permintaan pengguna 3 Nov 2026 | Browse (bawaan 27 kolom rapat, sisanya tersembunyi); Basket juga punya Pilih Kolom |
| Advance Filter lengkap seperti To-Be: kolom apa saja, operator sesuai tipe, AND/OR, between, kosong, jumlah cocok (tanpa dropdown saran nilai) | Permintaan pengguna 3 Nov 2026 | Browse |
| Penetapan HS + Save to theme = satu popup dari bar melayang di tengah bawah layar (jumlah tercentang, pena, batalkan); banyak seri sekaligus. Halaman Browse dan Basket muat satu layar; yang bergulir hanya tabel. Nama / Jenis Tema: klik = daftar yang pernah dibuat, tetap bisa diketik baru | Excel 1, Slide 2; permintaan pengguna 3 dan 5 Nov 2026 | Browse |
| Kartu atas Browse dirampingkan: tanpa judul "Browse", jenis dokumen jadi dropdown (seperti To-Be), periode di baris yang sama, mini dashboard tetap seperti CEISA (2 × 4 kartu), caret kecil di kiri untuk melipat mini dashboard dan Advance Filter (sejak 4 Nov 2026; diingat `skpk-asli:lipat`; titik kuning di caret filter = ada saringan aktif) | Permintaan pengguna 3 Nov 2026 | Browse |
| Popup **Penetapan HS** (dulu Set Final HS, teks berbahasa Indonesia atas permintaan pengguna): tabel seri tercentang di kiri (No Pib, Seri Brg, Hs Code, Kd Skep Fas dengan nama fasilitas di tooltip, Ur Brg, dan pratinjau tarif BM / PPN / PPh penetapan per seri; biru = otomatis, gelap = ketikan; titik biru = sudah punya HS penetapan), centang per seri / klik baris / pilih semua. Tarif terisi otomatis dari HS Penetapan + Kd Skep Fas **tiap seri** (ikon rantai), jadi seri dengan fasilitas berbeda (mis. satu 54, satu tanpa fasilitas) tetap mendapat tarifnya masing-masing; bila berbeda, kotak di kanan bertuliskan *Per seri*. Nilai yang diketik berlaku untuk semua seri tercentang (ikon putar = kembali otomatis). Acuan sementara = tarif terbanyak di data PIB untuk HS + Kd Skep Fas yang sama (`tarifOtomatis` di `basket.js`, ganti dengan BTKI nanti). Pungutan Lain: BMAD, BMTP, BMI, BMP, PPnBM (BMAD dsb. ditambahkan ke BM, PPnBM menggantikan tarif PPnBM). Satu **dokumen pendukung** kecil (ikon unggah di bawah Alasan, nama file sebagai chip) diunggah ke tiap seri yang disimpan, nama dokumen = nama file; dokumen lengkap (nomor, keterangan, hapus) tetap di halaman detail. **Simpan tidak menutup popup**: seri yang tersimpan hilang dari tabel (toast *Tersimpan*), sisanya tetap dengan centangnya; popup tertutup sendiri setelah seri terakhir disimpan. Kolom Tarif PPN / PPh Penetapan di tabel | Permintaan pengguna 4 Nov 2026 | Basket |
| Warna baris di Browse dan Basket (`SkpkBasket.warna`): putih = belum di basket, kuning = di basket (termasuk Returned / Rejected), hijau = sudah diproses dari basket (Submit, Approved, SIRENA), **merah = expired** (lewat 2 tahun sejak tanggal dokumen dan belum di SIRENA; menang atas kuning / hijau Submit), **abu = sudah ditetapkan** (notul / penul / audit) dan belum di basket; garis warna di kiri baris. Di Basket saringan status = satu ikon corong di kepala tabel (seperti Browse), dropdown bercentang In basket / Processed / Expired dengan titik warna dan jumlah; dicentang = tampil, ikon biru penuh bila ada yang dimatikan (diingat `skpk-asli:sesi:profil-warna`, ikut Reset). Opsi tabel `kelasBaris` di `tabel.js`. Periode di kartu Browse juga dihitung dari hari dibuka (2 tahun lalu s/d H-30) | Permintaan pengguna 4 Nov 2026 | Browse, Basket |
| Filter Tema di atas tabel | Excel 2, Slide 2.2a | Basket |
| Kolom **Tema Analisis** paling kiri di kolom bawaan Basket (id tabel `basket3`, supaya pilihan kolom lama tidak menutupinya). **Keluarkan seri** dari basket = ikon tempat sampah di bar melayang (setelah baris dicentang, bisa satu baris saja dari sebuah tema), tanpa popup, Undo di toast; seri yang sedang diajukan / di SIRENA tetap (`SkpkBasket.keluarkan`). Hapus seluruh tema tetap lewat ikon sampah di dropdown tema | Permintaan pengguna 4 Nov 2026 | Basket |
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
  Kolom yang disaring ikonnya berubah jadi corong biru; status bar menulis "N rows" dan tautan *Clear column filters* (tanpa "dari M": menghitung ulang seluruh data).
- **Kolom tetap** (5 Nov 2026): tombol pilih kolom (Columns) dan seret judul untuk memindah kolom dihapus. Kolom yang tampil dan urutannya
  = kolom bawaan tiap tabel; kolom PIB lain tetap bisa dipakai di Advance Filter. Pin tetap lewat menu kolom; lepas pin = kolom kembali
  ke tempat asalnya (`skpk-asli:pin3:<id>`).
- **Pin**: kolom pin selalu paling kiri. Bawaan Browse tanpa pin. Kolom pin paling banyak 60% lebar tabel; di layar sempit sisanya ikut bergulir.
- **Lebar kolom**: tarik tepi kanan judul; dobel-klik tepi itu = pas isi (semua kolom terpilih sekaligus). `skpk-asli:lebar:<id>`.
- **Sel aktif ala Excel**: klik sel = aktif, Shift+klik / Shift+panah = rentang, panah / Home / End / PageUp / PageDown berpindah,
  Ctrl+panah ke ujung. Klik judul = pilih kolom utuh (Shift = sampai kolom itu, Ctrl = tambah/lepas), Ctrl+Spasi = kolom sel aktif,
  Ctrl+A = semua kolom, Esc = lepas. **Ctrl+C** menyalin teks bertab (langsung ke Excel); kolom utuh disalin sebatas halaman yang tampil.
  Bila lebih dari satu sel terpilih, status bar menampilkan Sum (atau Average, Count, Numerical Count, Min, Max; klik untuk
  memilih, diingat `skpk-asli:agregat`), dihitung hanya atas baris di halaman yang tampil: 50 / 100 / 250 / 500 baris sesuai ukuran halaman,
  seluruh hasil saringan bila ukuran halaman *All*.
- **Status bar dan paginasi**: jumlah data, tombol halaman pertama/sebelum/berikut/
  terakhir, nomor halaman bisa diketik, 50 / 100 / 250 / 500 / *Semua* per halaman. Di atas 120 baris hanya baris di sekitar layar
  yang digambar (virtual scrolling), jadi *Semua* tetap ringan.
- **Geser**: isi tabel bisa ditarik dengan mouse; tanpa sel aktif, panah ←/→ menggeser tabel. Header selalu menempel di atas,
  kolom Aksi di kanan.
- **Centang**: setelah centang semua di satu halaman, strip di atas tabel menawarkan *Centang semua N data* dan *Batalkan*.
  Penetapan HS memakai semua yang dicentang, termasuk di halaman lain.
- **Advance Filter** (kartu Browse, meniru Advanced filter To-Be): tiap baris = [kolom] [operator] [nilai], kolom apa saja
  dari 114 kolom. Operator teks: contains, does not contain, equals, does not equal, begins with, does not begin with, ends with,
  does not end with, is empty, is not empty (`*` dan `?` wildcard). **Tombol regex** per kondisi teks = nilai dibaca sebagai regex
  (merah bila tidak sah); operator tetap berlaku (contains = di mana saja, equals = seluruh isi, begins / ends with = awal / akhir). Angka: =, ≠, >, ≥, <, ≤, di antara, kosong,
  tidak kosong. Tanggal: pada, bukan pada, sebelum, sesudah, di antara, kosong, tidak kosong. Penghubung DAN / ATAU per baris (DAN didahulukan). Tanpa jumlah data cocok dan tanpa daftar saran nilai: untuk data besar memberatkan.
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
  - Penetapan Seri = riwayat mesin. Seri yang sudah ditetapkan (`SkpkBasket.ditetapkan`: punya SPTNP / SPKTNP / LHA, atau tarifnya terkunci audit / penul / notul salah tarif)
    **tetap boleh masuk basket** untuk penetapan ulang (mis. 0% → 5% → 10%), berlabel di popup Penetapan HS.
  - HS / Tarif Suggestion = HS penetapan temuan acuan perluasan, atau HS acuan Inkonsistensi.
  - **Masih contoh** (hash tetap, belum ada mesinnya): RE SKA, Flag P2, Flag Analisis, Re-Assessment, Ket. DNDA, periode audit di Data History.
- `public/js/basket.js`: basket dan pengajuan di `localStorage` peramban (`skpk-v2:basket`, `skpk-v2:pengajuan`), peran aktif di topbar.
  20 seri contoh berada di basket unit lain (Kanwil DJBC Jawa Timur I, KPU Tanjung Priok), sebagian sudah SIRENA, supaya kunci terlihat.
- Potensi = penetapan − pemberitahuan. Hanya tarif BM yang berubah; PPN, PPnBM, PPh 22 memakai tarif pemberitahuan.
  Tarif BM bawaan dari referensi mesin yang **masih dummy** (MFN 10%, ACFTA kode 54 = 0%), jadi isi Tarif BM Akhir bila tahu tarif sebenarnya.

## Belum dikerjakan (Tahap 3)

- Data jenis dokumen lain (BC 2.5, 2.8, 3.0, PPFTZ-01 TLDDP; sudah ada di pilihan, BC 2.3 tidak dipakai) (Excel 9). Data BC 3.0 sudah ada di To-Be.
- Dashboard SKPK: capaian, HS penul vs LHA, akurasi penetapan, kinerja vs realisasi, potensi vs tagihan.
- Konfirmasi ke IKC: cakupan perluasan penul/LHA (satu entitas atau semua), logika RE Inkonsistensi, Penetapan, SKA.
- Kemiripan nama pemasok di Risk Engine (Slide 1g). Mesin RE SKA yang nyata.
- Login dan unit kerja; sekarang peran dipilih sendiri di kepala kartu (Analis 1 / Analis 2 / Admin), satu unit.
- Umpan balik SIRENA (status setelah dikirim, nomor DNOA) dan notifikasi lewat surel kedinasan.
