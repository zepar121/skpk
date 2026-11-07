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
| **Browse** (Menu 1) | Cari, analisis, review draft, kirim, **Approval**, **Riwayat Penetapan**, **Import DNOA** | Seluruh populasi BC 2.0, flag RE, status seri; satu popup **Penetapan HS** untuk seri tercentang: tema + HS penetapan, tarif, pratinjau potensi, lalu **Simpan** = masuk **draft** Analis 1 itu; **Daftar Analisis** (workspace Analis 1) lalu **Kirim** ke Approval; workspace **Approval** (Analis 2 / Admin): Setujui / Kembalikan / Tolak; halaman **Riwayat Penetapan** dan **Import DNOA** dengan Import (Analis 1) dan Approval import (Analis 2) |
| **Basket Nominasi** (Menu 2) | Final (Analis 2 / Admin saja) | Hanya seri yang sudah disetujui; tanpa fitur kembalikan; tinggal **Kirim** ke SIRENA. Analis 1 tidak bisa membuka menu ini |

## Revisi 7 Nov 2026: Simpan / Kirim per centang, HS 8 digit, istilah baku

- **Popup Penetapan HS**: tombol *Simpan N seri* / *Kirim N seri* menghitung seri yang **dicentang** (dulu semua seri lengkap, tercentang atau tidak).
  - **Simpan** cukup **Tema + Jenis Tema**; HS Penetapan, tarif, Pungutan Lain, Alasan, dan dokumen boleh kosong (yang terisi harus sah).
    Draft tanpa HS tampil di Daftar Analisis dan bisa dilengkapi lewat Penetapan HS.
  - **Kirim** mewajibkan semua isian (Tema, Jenis Tema, HS Penetapan 8 digit, Alasan, tarif sah) kecuali dokumen. Syarat yang sama dipakai
    tombol Kirim di Daftar Analisis dan halaman Detail (`B.analisaLengkap`).
  - Tombol aktif hanya bila semua seri tercentang memenuhi syarat; seri tercentang yang belum memenuhi diberi titik merah, tooltip = isian yang kurang.
- **HS Penetapan** hanya angka, mentok 8 digit (tempel `8471.30.10` terbaca `84713010`); kotak merah bila terisi kurang dari 8 digit.
- **Istilah** mengikuti `Daftar Istilah SKPK v2 - Review.xlsx` (sheet Pedoman Bahasa): Basket Nominasi, Riwayat Penetapan (dulu Data History),
  Import DNOA (dulu SIRENA Manual), Daftar Analisis, Kedaluwarsa, Status (posisi seri dan file import), Tema, Alasan, Tarif BM Penetapan,
  Jenis Penetapan, HS / Tarif Rekomendasi, tombol satu kata kerja (Kirim, Simpan, Setujui, Kembalikan, Tolak, Hapus, Cari, Unggah, Batal),
  toast dan notifikasi berbahasa Indonesia, operator Advanced Filter berbahasa Indonesia (operator angka tetap simbol), angka format Indonesia.
  Alamat halaman (`#/.../data-history`, `#/.../sirena-manual`) dan kunci data tidak diubah supaya tautan dan data tersimpan tetap jalan.
- Template import: *Tanggal Awal / Akhir Periode* (dulu "... Periode Audit") dan *Tema* (dulu "Nama Tema"); judul lama tetap dikenali.
  Dummy di `..\Import SKPK v2\`: Audit (LHA), Penelitian Ulang (LHPU), DNOA.
- Export Basket Nominasi kini Excel (dulu CSV).

## Revisi 6 Nov 2026: Import Data History dan SIRENA Manual

Dua tombol Import lama (Data History dan Basket) hanya memunculkan toast. Sekarang import punya template, validasi, dan Approval.
Bagian README lain yang menyebut Data History di Basket atau tombol Import di Basket sudah digantikan oleh bagian ini.

- **Sumber riwayat**: Notul (SPTNP) otomatis dari database, tidak diimport. Audit (LHA) dan Penul (LHPU) sementara diupload manual;
  nanti terhubung otomatis dengan SIMAUDI dan SIRENA. **SIRENA Manual** = seri yang sudah jadi DNOA / dikirim ke SIRENA di luar SKPK
  (masa transisi), statusnya paling tinggi (di atas Basket).
- **Dua halaman transit di Browse** (ikon di kepala tabel Browse, sebelah Daftar Analisa / Approval; semua peran):
  `#/smart-pcc/browse-pib/data-history` dan `#/smart-pcc/browse-pib/sirena-manual`. Alamat lama `/penelitian-skpk/data-history` dialihkan.
  Tabel view + Reset, **Import** (Analis 1 / Admin), Export. Kolom **Status** (System / Approval / Approved / Rejected, detail di tooltip)
  dan **Import** (nomor `IMP-...`, nama file di tooltip). Badge angka di ikon = file yang menunggu Approval (Analis 2 / Admin).
  Basket tidak lagi punya Import maupun tautan Data History.
- **Popup Import**: jenis (Audit · LHA / Penul · LHPU; SIRENA Manual tanpa pilihan), ikon unduh **template** .xlsx, dan zona file
  (.xlsx / .csv, pilih atau seret). Revisi 6 Nov 2026: tabel kolom (Column · Type · Format · Required) dan sheet Columns dihapus;
  template = satu sheet berisi judul kolom, data type tertanam di format kolom (kode = Text, tanggal = dd/mm/yyyy, angka = General).
  File contoh berisi data dummy (seri asli populasi, lolos validasi): `..\Import SKPK v2\Dummy Import *.xlsx`. File langsung diperiksa:
  1. judul kolom sesuai template (kolom asing / wajib hilang = ditolak);
  2. data type (Kode Kantor 6 digit, Nomor Dokumen angka, tanggal, Seri bilangan bulat, HS 8 digit, tarif 0–100);
  3. kolom wajib tidak kosong;
  4. **kebenaran seri**: Kode Dokumen + Kode Kantor + Nomor + Tanggal + Seri harus ada di populasi (mencegah data karangan);
  5. HS Code (opsional) sama dengan data; 6. duplikat dalam file; 7. duplikat di SKPK (temuan yang sama sudah ada / menunggu;
     SIRENA Manual: seri sudah SIRENA atau sedang di upload lain).
  **Satu baris error = file ditolak**: daftar "Row n · kolom · nilai · pesan" dan ikon unduh daftar error. File bersih: *n rows ready*,
  lalu **Send to Approval** (satu file = satu pengajuan import).
- **Approval import** (Analis 2 / Admin): centang baris lalu bar melayang **Approve / Reject**, berlaku untuk seluruh file dari baris
  terpilih, lewat popup konfirmasi (Reject catatan wajib). Admin juga **Delete** (bypass, catatan wajib), termasuk file yang sudah
  Approved. Approve / Delete Audit / Penul memuat ulang halaman karena flag mesin (Penetapan Seri, Cleansing, RE Perluasan) dihitung saat dimuat.
- **SIRENA Manual menimpa** Draft, Approval, dan Basket: seri keluar dari pengajuannya (`ditimpa`, riwayat aksi `manual`), analisanya dibuang,
  entri jadi `sirena` dengan `manual: { impor, dnoa, ... }`. Status Basket di Browse = `SIRENA <nomor SIRENA atau DNOA>` (hijau). Tidak tampil
  di Basket maupun Daftar Analisa.
- **Notifikasi**: *Import needs approval* (Analis 2 / Admin, per file), *Import rejected* (pengunggah, dengan catatan), *Overridden by SIRENA
  Manual* (pemilik lama seri yang ditimpa). Dua yang terakhir hilang setelah dibuka.
- Kode: `public/js/impor.js` (pembaca XLSX / CSV disalin dari To-Be, template, `periksa`, alur), `SkpkBasket.sirenaManual` / `hapusManual`
  (`basket.js`), halaman `halTransit` (`app.js`). Penyimpanan: `skpk-v2:impor`, `skpk-v2:ditimpa`; temuan yang di-Approve masuk riwayat mesin
  (`skpk-prototipe.riwayat.v1`, field `impor`).

## Revisi 6 Nov 2026 (rapat): Approval sebelum Basket, Basket final, menu kolom ringkas

Bagian README lain yang menyebut Approve / Return / Reject di Basket, "Send to Basket", atau tahap "Analis 2 Review / Approved" sudah digantikan oleh bagian ini.

- **Alur**: Draft (Analis 1, Browse) → **Approval** (transit, Browse milik Analis 2) → **Basket** (sudah di-Approve, final) → SIRENA.
  Bilah progres: Draft → Approval → Basket → SIRENA. Status entri seri: `draft` → `ajukan` → `setuju` (+ `setuju: { oleh, waktu }`) → `sirena`.
  Alasannya: seri yang masuk basket mengunci seri itu dari unit lain dan kantor pusat, jadi basket hanya boleh berisi yang benar-benar layak kirim.
- **Approval** (ikon alur di kepala tabel Browse, sebelah Daftar Analisa; hanya Analis 2 / Admin; angka = pengajuan yang menunggu):
  tabel seri kiriman semua Analis 1 (Tema, Analis, Sisa Hari, lalu kolom Browse dan hasil analisa). Bar melayang **Approve / Return / Reject**
  untuk seri terpilih (satu, beberapa, atau satu tema: saring kolom Tema lewat drop list lalu pilih semua). Semuanya lewat **popup konfirmasi**
  (Approve: "cannot be returned"; Return / Reject: catatan wajib). Return per seri = seri kembali ke draft pengusul (Returned); Reject = seri bebas
  lagi. Halaman pengajuan `#/.../approval/<SUB>` sekarang bagian Browse: tombol berlaku untuk semua seri yang masih menunggu, tabel seri menampilkan
  status per seri (Approval / Basket / SIRENA / Returned / Rejected). Detail seri: tombol berlaku untuk seri itu saja.
- **Basket final**: hanya seri `setuju` dan `sirena` unit sendiri. Tidak ada Reject, Return, ikon sampah tema, maupun Undo Approve. Bar melayang
  hanya **Send to SIRENA** (konfirmasi; satu tema = satu nomor `SRN-...`). Kolom baru **Sisa Hari** (sampai batas 2 tahun sejak tanggal dokumen,
  merah ≤ 30 hari) dan **Umur Basket** (hari sejak Approve, merah ≥ 30 hari) sebelum Status. Saringan status: Basket / SIRENA / Expired.
  Tombol Approval di kepala Basket dihapus. Sisa Hari juga ada di Daftar Analisa.
- **Status Basket di Browse** = pemegang seri: `Draft - <analis>`, `Approval - <analis>`, `Basket` / `Basket - <unit lain>`, `SIRENA <nomor>`.
  Warna baris: kuning = Draft / Approval, hijau = Basket / SIRENA.
- **Notifikasi**: *Ready for SIRENA* diganti **30+ days in Basket** (n seri per tema, Analis 2 / Admin; muncul lagi tiap kelipatan 30 hari).
  Tanpa eskalasi. *Needs approval* dan *Expiring* yang masih di Approval membuka Browse mode Approval dengan saringan tema itu.
- **Menu kolom ringkas** (semua tabel): kotak **Search paling atas**, lalu satu baris ikon (Sort naik / turun, Custom Sort, Pin, Autofit; nama di tooltip).
  Tinggi menu sekitar sepertiga dari sebelumnya.
- **Drop list nilai** untuk kolom yang variasinya sedikit: `daftar: true` (Tema, Analis, Status, Status Basket, Jenis Tema) atau kolom teks dengan
  ≤ 30 nilai unik (mis. Jalur, Kode Kantor, flag Y/N). Baru muncul saat kotak Search **diklik atau diketik**, menyempit sesuai ketikan, tanpa jumlah baris.
  Pilih = `=nilai` (sama persis; aturan baru di kotak cari kolom). Angka, tanggal, nomor, dan uraian tidak punya drop list.
  Advance Filter memakai aturan yang sama: pilih nilai = operator *equals* + nilai itu.
- **Revisi lanjutan 6 Nov 2026**:
  - Drop list nilai kini **pilih banyak** (bercentang, daftar tetap terbuka); nilai terpilih tampil sebagai chip, saringan = salah satu cocok.
  - **Tempel daftar** (menu kolom dan Advance Filter): menempel kolom dari Excel / Notepad (NPWP, uraian, nama perusahaan; satu per baris)
    menjadi chip per baris, bukan satu teks panjang. Angka berpemisah (NPWP `01.234.567.8-901.000`) cocok juga dengan digitnya saja.
    Selama ada chip, ketikan hanya mempersempit drop list; Enter menambah chip, Backspace di kotak kosong menghapus chip terakhir.
    Disimpan sebagai teks berpemisah baris baru (`tabel.js`: `pasangKotakDaftar`, `pisahDaftar`, `digitSaja`).
  - **Penetapan HS, edit per seri** (revisi keempat, 6 Nov 2026): satu konsep pilihan, **centang = seri yang sedang diedit**. Popup dibuka
    dengan semua seri tercentang. Klik bagian baris = fokus ke seri itu saja (seri lain dilepas; Shift = rentang, Ctrl = tambah / kurangi);
    klik area centang (kotak + selnya) = tambah / kurangi untuk memilih beberapa, Shift = rentang. Sakelar Semua / Satu / Beberapa dan
    sorotan dihapus. Isian (HS, tarif, pungutan, alasan, Nama / Jenis Tema) tersimpan per seri; bila seri tercentang isiannya berbeda,
    kolom itu kosong (tanpa keterangan "Per seri") dan hanya kolom yang diubah yang ditimpa. Potensi per seri dan totalnya langsung
    terhitung begitu HS Penetapan dan tarif ada (tidak menunggu Alasan / Tema). **Simpan** menyimpan semua seri yang **lengkap** (tercentang
    atau tidak), dikelompokkan per tema + analisa; seri yang belum lengkap tetap di popup (titik merah bila sebagian sudah lengkap).
    **Kirim** = Simpan lalu langsung Send to Approval (satu tema = satu pengajuan); Undo di toast hanya membatalkan kirim, seri tetap di
    draft. Kirim hanya untuk peran yang boleh mengirim; Enter di isian = Simpan.
  - **Dropdown pencarian** (`pasangPilih`: Nama / Jenis Tema dan sejenisnya): saat dibuka, kotak cari menimpa tombolnya sendiri di baris
    yang sama dan daftar menyambung langsung di bawahnya (tidak menambah baris); bila ruang bawah sempit, daftar terbuka ke atas.
  - **Reset Advance Filter = murni ke awal**: Advance Filter, Flag RE, Cleansing (termasuk tampilan baris yang dibuang), saringan kolom,
    urutan, halaman, dan centang. Susunan kolom serta mode Daftar Analisa / Approval tetap. Undo mengembalikan semuanya.
- **Data lama** dimigrasi: entri yang pengajuannya sudah Approved menjadi `setuju`; pengajuan Returned memindahkan serinya ke `dikembalikan`.

## Pemisahan Analis 1 dari Basket (5 Nov 2026, arahan atasan)

Peran Analis 1 dipegang banyak orang, jadi pekerjaannya dipisah per orang dan Analis 1 tidak lagi melihat atau mengedit Basket.
Bagian lain README yang masih menyebut Submit di Basket, Basket milik Analis 1, atau Reject yang mengunci seri sudah digantikan oleh bagian ini.

- **Pengguna simulasi** (pengganti login, dropdown avatar): Analis 1 A, Analis 1 B, Analis 2, Admin. `skpk-v2:peran` sekarang berisi id
  pengguna (`a1a` / `a1b` / `a2` / `admin`); nilai lama `junior` / `senior` dipetakan ke `a1a` / `a2`. Semua `oleh` (draft, analisa, pengajuan,
  riwayat, dokumen) = id pengguna. Notifikasi dibaca per pengguna.
- **Alur**: Penetapan HS di Browse → **Draft** milik analis itu → review di **Daftar Analisa** → **Send to Basket** (satu tema = satu pengajuan
  `SUB-...`, Undo di toast) → Analis 2 Review → Approved → SIRENA. Bilah progres: Draft → Analis 2 Review → Approved → SIRENA.
- **Draft terpisah per orang**: draft analis lain tampil di Browse berlabel `Draft - Analis 1 B` (kuning), tidak bisa dianalisa ulang
  (masuk "Tidak ikut" di popup), dan HS / tarif / potensinya tidak ditampilkan (`SkpkBasket.analisaTampil`). Admin bisa semua draft.
- **Daftar Analisa** (workspace Analis 1; ikon penanda di kepala tabel Browse, sebelah Flag RE; chip *Daftar Analisa* untuk keluar; diingat di
  `sesi:browse2`): semua seri yang pernah dianalisa analis itu (Admin: semua analis) dan **tetap tampil setelah dikirim**: Draft, Returned,
  Analis 2 Review, Approved, SIRENA, serta **Rejected** (hanya baca, analisa yang dulu diajukan dan catatan Analis 2 di tooltip; tampil selama
  seri belum diambil analis lain, dan bisa dianalisa ulang lewat Browse). Kolom Tema Analisis dan Status paling kiri; Flag RE dan Cleansing
  disembunyikan, Advance Filter tetap. Bar melayang: Penetapan HS (perbaiki), **Send to Basket**, dan lepas dari draft (analisa dibuang, Undo);
  aksi hanya berlaku untuk Draft / Returned, seri lain dilewati dan disebut jumlahnya di toast. Dobel-klik = detail seri (dokumen pendukung,
  tombol Send to Basket).
- **Basket dan Approval hanya Analis 2 / Admin** (Data History pindah ke Browse untuk semua peran, 6 Nov 2026): menu Basket disembunyikan untuk Analis 1 dan alamatnya dialihkan ke Browse.
  Analis 1 hanya bisa membuka detail seri miliknya sendiri (menu aktif Browse). Basket berisi kiriman semua Analis 1 dengan kolom **Analis**
  (pengusul); saringan status In review / Processed / Expired.
- **Keputusan Analis 2**: Approve, Return (pengajuan kembali ke draft pengusulnya berlabel Returned), **Reject**, Send to SIRENA. Analis 2 tidak
  mengubah HS / tarif. **Reject = buang** (menggantikan Hapus dan Reject lama yang mengunci seri): per seri (bar melayang Basket), per tema
  (ikon sampah di saringan tema), atau satu pengajuan (Approval / detail); catatan wajib; seri keluar dari basket, analisanya dibuang, dan
  **bebas lagi di Browse** (putih). Jejaknya tetap di pengajuan (`riwayat` aksi `tolak` + daftar seri, salinan isi di `ditolak`) dan tampil di
  Approval sebagai catatan "n series rejected"; pengajuan yang semua serinya ditolak berstatus Rejected.
- **Notifikasi Analis 1**: Returned (hanya pengajuan miliknya, hilang setelah dikirim ulang / dilepas) dan draft hampir expired, keduanya membuka
  Browse Daftar Analisa.
- **Tanpa** ambang potensi minimal (kelayakan dinilai Analis 1; yang terlalu kecil di-Reject Analis 2) dan **tanpa** cek konflik penetapan antar
  analis (risiko diterima; cek kemiripan dinilai terlalu berat).
- **Data lama** dimigrasi otomatis: entri basket berstatus `basket` → `draft`, berstatus `tolak` → dibebaskan; analisa tanpa entri dibuang.
  Contoh pengajuan dibagi ke Analis 1 A / B, ditambah satu draft Analis 1 B (*Stainless Coil Facility Review*).

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
