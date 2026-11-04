/*
 * SKPK v2: dokumen pendukung per seri di halaman Basket Detail (PDF, Word, gambar, semua jenis file).
 * Tiap dokumen = file + nama dokumen + nomor dokumen + keterangan bebas. Disimpan di IndexedDB peramban
 * (skpk-v2-lampiran), karena isi file terlalu besar untuk localStorage.
 */
(function (root) {
  'use strict';

  const DB = 'skpk-v2-lampiran', STORE = 'dokumen';
  let buka = null;
  const db = () => buka || (buka = new Promise((ok, gagal) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' }).createIndex('kunci', 'kunci');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => { buka = null; gagal(req.error); };
  }));
  const jalan = (mode, fn) => db().then(d => new Promise((ok, gagal) => {
    const tx = d.transaction(STORE, mode);
    const hasil = fn(tx.objectStore(STORE));
    tx.oncomplete = () => ok(hasil && 'result' in hasil ? hasil.result : undefined);
    tx.onerror = () => gagal(tx.error);
  }));

  // daftar dokumen satu seri (tanpa isi file), terbaru di atas
  const daftar = kunci => jalan('readonly', s => s.index('kunci').getAll(kunci))
    .then(a => a.map(({ file, ...x }) => x).sort((x, y) => y.waktu.localeCompare(x.waktu)));

  function tambah(kunci, file, isi) {
    const id = 'DOC-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const x = { id, kunci, nama: isi.nama, nomor: isi.nomor || '', ket: isi.ket || '', oleh: isi.oleh, waktu: new Date().toISOString(),
      namaFile: file.name, jenis: file.type, ukuran: file.size, file };
    return jalan('readwrite', s => s.put(x)).then(() => id);
  }

  const hapus = id => jalan('readwrite', s => s.delete(id));

  // buka di tab baru (PDF / gambar tampil di peramban, jenis lain diunduh dengan nama aslinya)
  function lihat(id) {
    const tab = window.open('', '_blank');
    return jalan('readonly', s => s.get(id)).then(x => {
      if (!x) { if (tab) tab.close(); return false; }
      const url = URL.createObjectURL(x.file);
      const tampil = /^(application\/pdf|image\/|text\/)/.test(x.jenis);
      if (tampil && tab) tab.location.href = url;
      else {
        if (tab) tab.close();
        const a = document.createElement('a');
        a.href = url;
        a.download = x.namaFile;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return true;
    });
  }

  root.SkpkLampiran = { daftar, tambah, hapus, lihat };
})(window);
