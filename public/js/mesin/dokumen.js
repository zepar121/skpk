/*
 * SKPK prototipe To-Be: profil jenis dokumen (BC 2.0, BC 3.0, ...).
 * Tiap jenis punya kolom Excel sendiri; aplikasi tidak menyebut kolom langsung, tetapi lewat "peran"
 * (uraian, hs, pelaku, ...) yang dipetakan di sini ke nama kolom Excel jenis itu.
 * Jenis yang tampil di tombol pilih = jenis yang punya profil DAN datanya ada (public/data/daftar.js).
 * Hanya data jenis aktif yang dimuat; berganti jenis = simpan pilihan lalu muat ulang halaman.
 *
 * Menambah jenis: konversi Excel (scripts/excel-ke-data.py <kode> <file>), lalu tambah profil di PROFIL.
 * Panel detail: tiap baris berisi label kolom, atau [judul, [label kolom, ...]] untuk nilai yang digabung " · ",
 * atau penanda khusus '@harga' (harga per kg dibanding kelompok) dan '@jalur' (badge jalur).
 */
(function (root) {
  'use strict';

  // kolom flag hitungan (data.js, analisis.js) dan riwayat penetapan, ikut tampil sejak awal
  const FLAG = ['Price Flag', 'HS Flag', 'Audit Flag', 'Penul Flag', 'Assessed', 'Notul', 'Importer Notul'];

  const PROFIL = {
    bc20: {
      kode: 'bc20',
      label: 'BC 2.0',
      nama: 'Pemberitahuan Impor Barang',
      satuan: 'PIB',
      pelaku: 'importer',
      tabel: 'pib',
      tarif: 'Duty',
      bea: 'import duty',
      peran: {
        uraian: 'Ur Brg', hs: 'Hs Code', tarif: 'Trf Bm', pelaku: 'Nm Imp', npwp: 'Npwp Imp', npwp9: 'Npwp9',
        aju: 'No Aju', seri: 'Seri Brg', nomor: 'No Pib', tanggal: 'Tgl Pib',
        nilai: 'Nilai Devisa Idr', netto: 'Netto', jumlah: 'Jml Sat Hrg', negara: 'Neg Asal',
        kantor: 'Kd Kantor', jalur: 'Status Jalur', fasilitas: 'Kd Skep Fas', audit: 'Fl Audit'
      },
      kode_teks: ['Npwp9', 'Npwp Imp', 'Digit (Npwp)', 'Bendera Voy', 'Filter Penul', 'Hs Code', 'Kd Kantor', 'Kd Sat Hrg', 'Kd Val',
        'Kode Incoterm', 'Neg Asal', 'Neg Pemasok', 'Neg Pengirim', 'No Aju', 'No Api', 'No Bc11', 'No Pib', 'No Pos Bc11', 'No Sub Pos Bc11',
        'No Voy Flight', 'Npwp Ind', 'Npwp Ppjk', 'Pel Bongkar', 'Pel Muat', 'Pel Transit', 'Status Imp', 'Status Jalur', 'Sumber Data',
        'Tmp Penimbunan', 'Kd Skep Fas', 'Fl Audit'],
      lebar: {
        'Ur Brg': 240, 'Nm Imp': 220, 'Hs Code': 112, 'Trf Bm': 84, 'No Pib': 100, 'Tgl Pib': 112, 'Neg Asal': 96, 'Status Jalur': 104, 'Nm Ind': 240, 'Nm Pemasok': 260, 'Nm Pengirim': 260, 'Nama Ppjk': 220, 'Nm Angkut': 180,
        'Ur Audit': 320, 'Merek': 160, 'Type': 160, 'No Aju': 230, 'Npwp Imp': 200, 'Npwp Ind': 200, 'Npwp Ppjk': 200, 'Filter Penul': 220,
        'Nilai Devisa Idr': 150, 'Ket Status Imp': 130
      },
      bawaan: ['Ur Brg', 'Hs Code', 'Trf Bm', 'Nm Imp', 'No Pib', 'Tgl Pib', 'Neg Asal', 'Nilai Devisa Idr', ...FLAG],
      tautan: ['Nm Imp', 'Npwp Imp'],
      panel: {
        item: ['Ur Brg', 'Type', 'Merek', 'Hs Code', 'Trf Bm', 'Kd Skep Fas', 'Neg Asal', ['Jml Sat Hrg', ['Jml Sat Hrg', 'Kd Sat Hrg']], 'Netto', 'Jml Kms'],
        nilai: ['Nilai Devisa Idr', 'Nilai Devisa Usd', ['Kd Val · Ndpbm', ['Kd Val', 'Ndpbm']], '@harga', 'CIF', 'FOB', 'Freight', 'Asuransi', 'Bmby', 'Ppnby', 'Pphby'],
        dokumen: [['No Pib · Tgl Pib', ['No Pib', 'Tgl Pib']], ['No Aju · Tgl Aju', ['No Aju', 'Tgl Aju']], ['Kd Kantor', ['Kd Kantor', 'Nm Kantor']], 'Nm Kanwil', '@jalur',
          ['Jns Pib · Jns Bayar', ['Jns Pib', 'Jns Bayar']], ['No Bc11 · Tgl Bc11', ['No Bc11', 'Tgl Bc11']], 'Tgl Tiba',
          ['Nm Angkut', ['Nm Angkut', 'No Voy Flight']], ['Pel Muat → Pel Bongkar', ['Pel Muat', 'Pel Transit', 'Pel Bongkar']]],
        ketPelaku: 'Ket Status Imp',
        perusahaan: [['Nm Pemasok', ['Nm Pemasok', 'Neg Pemasok']], 'Nama Ppjk'],
        audit: ['Fl Audit', 'Ur Audit']
      }
    },
    bc30: {
      kode: 'bc30',
      label: 'BC 3.0',
      nama: 'Pemberitahuan Ekspor Barang',
      satuan: 'PEB',
      pelaku: 'exporter',
      tabel: 'peb',
      tarif: 'Export duty',
      bea: 'export duty',
      peran: {
        uraian: 'Uraian Barang', hs: 'Kode Hs', tarif: 'Tarif Bk', pelaku: 'Nama Eksportir', npwp: 'Npwp Eksportir', npwp9: 'Npwp9',
        aju: 'No Aju', seri: 'Seri Barang', nomor: 'Nomor Peb', tanggal: 'Tanggal Peb',
        nilai: 'Nilai Dev Idr Brg', netto: 'Netto Per Barang', jumlah: 'Jumlah Satuan', negara: 'Negara Tujuan',
        kantor: 'Kode Kantor Ekspor', jalur: 'Kode Jalur', fasilitas: null, audit: null
      },
      kode_teks: ['Npwp9', 'Npwp Eksportir', 'Digit (Npwp)', 'Bendera', 'Kd Kantor Periksa', 'Kode Barang', 'Kode Hs', 'Kode Jalur', 'Kode Kantor Ekspor',
        'Kode Kantor Muat', 'Kppbc Pemeriksa', 'Negara Pembeli', 'Negara Penerima', 'Negara Tujuan', 'No Aju', 'Nomor Peb', 'Nomor Voyage', 'Npwp Pemilik',
        'Npwp Ppjk', 'Pelabuhan Bongkar', 'Pelabuhan Muat Asal', 'Pelabuhan Muat Ekspor', 'Pelabuhan Tujuan', 'Sumber Data', 'Valuta', 'Jenis Kms Brg',
        'Jenis Koli', 'Jenis Satuan', 'Flag Batal', 'Gudang Plb', 'Niper', 'Cara Penyerahan Barang'],
      lebar: {
        'Uraian Barang': 260, 'Nama Eksportir': 220, 'Kode Hs': 112, 'Tarif Bk': 90, 'Nomor Peb': 110, 'Tanggal Peb': 120, 'Negara Tujuan': 120,
        'Kode Jalur': 100, 'No Aju': 230, 'Npwp Eksportir': 200, 'Npwp Pemilik': 200, 'Npwp Ppjk': 200, 'Nama Pembeli': 220, 'Nama Penerima': 220,
        'Nama Pemilik': 220, 'Nama Ppjk': 220, 'Alamat Eksportir': 320, 'Alamat Pembeli': 320, 'Alamat Pemilik': 320, 'Alamat Penerima': 320,
        'Alamat Ppjk': 320, 'Nilai Dev Idr Brg': 160, 'Carrier': 180, 'Daerah Asal Brg': 200
      },
      bawaan: ['Uraian Barang', 'Kode Hs', 'Tarif Bk', 'Nama Eksportir', 'Nomor Peb', 'Tanggal Peb', 'Negara Tujuan', 'Nilai Dev Idr Brg', ...FLAG],
      tautan: ['Nama Eksportir', 'Npwp Eksportir'],
      panel: {
        item: ['Uraian Barang', 'Tipe Barang', 'Merk', 'Kode Barang', 'Kode Hs', 'Tarif Bk', 'Negara Tujuan', 'Daerah Asal Brg',
          ['Jumlah Satuan', ['Jumlah Satuan', 'Jenis Satuan']], 'Netto Per Barang', ['Jumlah Kms Brg', ['Jumlah Kms Brg', 'Jenis Kms Brg']]],
        nilai: ['Nilai Dev Idr Brg', 'Nilai Dev Usd Brg', ['Fob Per Barang · Valuta', ['Fob Per Barang', 'Valuta']], '@harga', 'Nilai Bk Per Barang',
          'Fob Peb', 'Nilai Dev Idr Peb', 'Freight Fob', 'Asuransi Fob', 'Pphekspor Peb'],
        dokumen: [['Nomor Peb · Tanggal Peb', ['Nomor Peb', 'Tanggal Peb']], 'No Aju', ['Kode Kantor Ekspor', ['Kode Kantor Ekspor', 'Nm Kantor']], 'Nm Kanwil', '@jalur',
          ['Jenis Ekspor · Kategori Ekspor', ['Jenis Ekspor', 'Kategori Ekspor']], ['Cara Bayar · Cara Penyerahan Barang', ['Cara Bayar', 'Cara Penyerahan Barang']],
          ['Kppbc Pemeriksa · Tanggal Periksa', ['Kppbc Pemeriksa', 'Tanggal Periksa']], 'Tanggal Perkiraan Ekspor',
          ['Carrier', ['Cara Angkut', 'Carrier', 'Nomor Voyage']], ['Pelabuhan Muat Ekspor → Pelabuhan Tujuan', ['Pelabuhan Muat Ekspor', 'Pelabuhan Bongkar', 'Pelabuhan Tujuan']]],
        ketPelaku: 'Alamat Eksportir',
        perusahaan: [['Nama Pembeli', ['Nama Pembeli', 'Negara Pembeli']], ['Nama Penerima', ['Nama Penerima', 'Negara Penerima']], 'Nama Pemilik', 'Nama Ppjk'],
        audit: []
      }
    }
  };

  // Jenis dokumen lain yang disiapkan di dropdown; belum punya data/profil (tautan dikosongkan dulu).
  // Kalau datanya sudah ada, pindahkan ke PROFIL dan hapus dari daftar ini.
  const AKAN = [
    { kode: 'bc11', label: 'BC 1.1', nama: 'Pemberitahuan Pabean Manifes (Inward Manifest)' },
    { kode: 'bc23', label: 'BC 2.3', nama: 'Pemberitahuan Impor Barang ke TPB' },
    { kode: 'bc25', label: 'BC 2.5', nama: 'Pemberitahuan Impor Barang dari TPB' },
    { kode: 'bc27', label: 'BC 2.7', nama: 'Pemberitahuan Pengeluaran/Pemasukan Barang antar TPB' },
    { kode: 'bc28', label: 'BC 2.8', nama: 'Pemberitahuan Impor Barang dari PLB' },
    { kode: 'bc40', label: 'BC 4.0', nama: 'Pemberitahuan Pemasukan Barang asal TLDDP ke TPB' },
    { kode: 'bc41', label: 'BC 4.1', nama: 'Pemberitahuan Pengeluaran Barang asal TPB ke TLDDP' }
  ];

  const KUNCI = 'skpk-prototipe.dokumen.v1';
  const ADA = (root.SKPK_DOKUMEN_ADA || []).filter(k => PROFIL[k]);
  let aktif = null;
  try { aktif = localStorage.getItem(KUNCI); } catch (e) { /* penyimpanan peramban tidak tersedia */ }
  if (!ADA.includes(aktif)) aktif = ADA.includes('bc20') ? 'bc20' : ADA[0];

  // semua jenis yang dikenal (berprofil dan yang disiapkan), untuk kolom Jenis Dok di file unggahan
  const SEMUA = Object.values(PROFIL).map(p => ({ kode: p.kode, label: p.label, nama: p.nama })).concat(AKAN.filter(d => !PROFIL[d.kode]));
  const label = kode => (SEMUA.find(d => d.kode === kode) || { label: kode }).label;
  // teks bebas -> kode: "BC 2.0", "2.0", "20", 2, "PIB" -> bc20; "BC 3.0", "PEB" -> bc30; tidak dikenal -> null
  function normalJenis(v) {
    const s = String(v === null || v === undefined ? '' : v).toUpperCase().replace(/\s+/g, '');
    if (!s) return null;
    if (s === 'PIB') return 'bc20';
    if (s === 'PEB') return 'bc30';
    const m = /^(?:BC)?(\d)[.,]?(\d)?$/.exec(s);
    const kode = m ? 'bc' + m[1] + (m[2] || '0') : null;
    return kode && SEMUA.some(d => d.kode === kode) ? kode : null;
  }
  // data jenis lain (format public/data/<kode>.js) tanpa menimpa window.SKPK_SUMBER jenis aktif; disimpan per kode
  const cacheSumber = new Map();
  function muatSumber(kode) {
    if (kode === aktif && root.SKPK_SUMBER) return Promise.resolve(root.SKPK_SUMBER);
    if (!ADA.includes(kode)) return Promise.resolve(null);
    if (!cacheSumber.has(kode)) {
      cacheSumber.set(kode, fetch('/data/' + kode + '.js')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(teks => { const w = {}; new Function('window', teks)(w); return w.SKPK_SUMBER || null; })
        .catch(() => { cacheSumber.delete(kode); return null; }));
    }
    return cacheSumber.get(kode);
  }

  root.SKPK_DOKUMEN = {
    PROFIL,
    ADA,
    AKAN: AKAN.filter(d => !ADA.includes(d.kode) && !PROFIL[d.kode]),
    SEMUA,
    AKTIF: aktif,
    label,
    normalJenis,
    muatSumber,
    pilih(kode) {
      if (!ADA.includes(kode) || kode === aktif) return;
      try { localStorage.setItem(KUNCI, kode); } catch (e) { /* abaikan */ }
      location.reload();
    }
  };

  // muat data jenis aktif saja, sebelum data.js berjalan; database notul (menu History) hanya untuk PIB
  if (aktif && typeof document !== 'undefined' && document.readyState === 'loading') {
    document.write('<script src="/data/' + aktif + '.js"><\/script>');
    if (aktif === 'bc20') document.write('<script src="/data/notul.js"><\/script>');
  }
})(typeof window !== 'undefined' ? window : globalThis);
