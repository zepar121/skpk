/*
 * SKPK v2: komentar ala PDF untuk masukan pengguna. Lapisan di atas situs, tidak mengubah tampilan CEISA.
 * - Tombol bulat kanan bawah: mode komentar (klik bagian mana saja, tulis komentar) dan daftar semua komentar.
 * - Komentar tampil sebagai pin bernomor di tempat yang diklik; klik pin untuk membaca, membalas, dan mengubah status.
 * - Disimpan di server (Cloudflare Pages Functions + D1, /api/komentar), terpisah dari kode situs, jadi tidak hilang
 *   saat situs diperbarui. Bila posisi asli berubah setelah perbaikan, pin memakai koordinat lama (bergaris putus-putus)
 *   dan komentar tetap ada di daftar.
 * - Tanpa server (npm run dev) komentar disimpan di peramban ini saja (mode lokal).
 */
(function (root) {
  'use strict';

  const API = '/api/komentar';
  const KUNCI_LOKAL = 'skpk-v2:komentar';
  const VERSI = document.documentElement.dataset.versi || 'lokal';
  const STATUS = { baru: 'Baru', dikerjakan: 'Sedang diperbaiki', selesai: 'Selesai', ditolak: 'Tidak dikerjakan' };

  const simpan = {
    baca(k, awal) { try { const v = localStorage.getItem(k); return v == null ? awal : JSON.parse(v); } catch { return awal; } },
    tulis(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };
  // penulis = id acak per peramban (untuk hapus komentar sendiri); nama diingat setelah komentar pertama
  let penulis = simpan.baca('skpk-v2:penulis', null);
  if (!penulis) { penulis = 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36); simpan.tulis('skpk-v2:penulis', penulis); }
  const namaSaya = () => simpan.baca('skpk-v2:nama', '');

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const waktu = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const halamanIni = () => location.hash || '#/';
  const judulIni = () => { const j = document.getElementById('judulHal'); return j ? j.textContent.trim() : document.title; };

  // ---------- penyimpanan: server atau lokal ----------
  const st = { mode: 'memuat', pesan: '', data: [], aktif: false, panel: false, filter: { lingkup: 'ini', status: '' } };
  const lokal = {
    semua: () => simpan.baca(KUNCI_LOKAL, []),
    tulis: d => simpan.tulis(KUNCI_LOKAL, d)
  };
  async function minta(metode, url, isi) {
    const r = await fetch(url, { method: metode, headers: { 'content-type': 'application/json' }, body: isi ? JSON.stringify(isi) : undefined });
    const jenis = r.headers.get('content-type') || '';
    if (!jenis.includes('application/json')) { const e = new Error('API komentar tidak tersedia'); e.tanpaApi = true; throw e; }
    const data = await r.json();
    if (!r.ok) throw new Error(data.galat || 'Permintaan gagal (' + r.status + ')');
    return data;
  }
  async function muat() {
    if (st.mode === 'lokal') { st.data = lokal.semua(); return; }
    try {
      st.data = await minta('GET', API);
      st.mode = 'server';
      st.pesan = '';
    } catch (e) {
      if (e.tanpaApi) { st.mode = 'lokal'; st.pesan = 'Mode lokal: server komentar tidak ada, komentar hanya tersimpan di peramban ini.'; st.data = lokal.semua(); }
      else { st.mode = 'galat'; st.pesan = 'Server komentar bermasalah: ' + e.message; }
    }
  }
  async function tambah(k) {
    if (st.mode === 'lokal') {
      const d = lokal.semua();
      const baru = { ...k, id: d.reduce((m, x) => Math.max(m, x.id), 0) + 1, status: 'baru', dibuat: new Date().toISOString() };
      d.push(baru); lokal.tulis(d); st.data = d; return baru;
    }
    const baru = await minta('POST', API, k);
    st.data.push(baru);
    return baru;
  }
  async function ubahStatus(id, status) {
    if (st.mode === 'lokal') {
      const d = lokal.semua(); const x = d.find(y => y.id === id); if (x) { x.status = status; x.status_oleh = namaSaya(); x.diubah = new Date().toISOString(); }
      lokal.tulis(d); st.data = d; return;
    }
    const baru = await minta('PATCH', API + '/' + id, { status, oleh: namaSaya() });
    Object.assign(st.data.find(y => y.id === id), baru);
  }
  async function hapus(id) {
    if (st.mode === 'lokal') { const d = lokal.semua().filter(y => y.id !== id && y.induk !== id); lokal.tulis(d); st.data = d; return; }
    await minta('DELETE', API + '/' + id, { penulis });
    st.data = st.data.filter(y => y.id !== id && y.induk !== id);
  }

  const induk = () => st.data.filter(k => k.induk == null);
  const balasan = id => st.data.filter(k => k.induk === id);
  const jangkarDari = k => { try { return typeof k.jangkar === 'string' ? JSON.parse(k.jangkar) : k.jangkar || {}; } catch { return {}; } };

  // ---------- gaya (hanya untuk lapisan komentar; tidak menyentuh gaya CEISA) ----------
  const gaya = document.createElement('style');
  gaya.textContent = `
    .kmt-fab { position: fixed; right: 20px; bottom: 20px; z-index: 900; display: flex; flex-direction: column; gap: 10px; }
    .kmt-fab button { width: 46px; height: 46px; border-radius: 50%; border: 0; background: #1d6fc9; color: #fff; box-shadow: 0 6px 16px rgba(20, 40, 80, .28); display: grid; place-items: center; cursor: pointer; position: relative; }
    .kmt-fab button:hover { filter: brightness(1.08); }
    .kmt-fab button.aktif { background: #f5b100; }
    .kmt-fab svg { width: 22px; height: 22px; }
    .kmt-fab .kmt-jml { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; border-radius: 10px; background: #e5342a; color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; padding: 0 5px; }
    body.kmt-mode, body.kmt-mode * { cursor: crosshair !important; }
    body.kmt-mode .kmt-ui, body.kmt-mode .kmt-ui * { cursor: auto !important; }
    .kmt-pita { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 901; background: #1f2937; color: #fff; font-size: 12px; padding: 8px 14px; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,.25); }
    .kmt-lapis { position: fixed; inset: 0; pointer-events: none; z-index: 880; }
    .kmt-pin { position: fixed; pointer-events: auto; width: 26px; height: 26px; margin: -26px 0 0 -4px; border-radius: 13px 13px 13px 2px; background: #f5b100; color: #1f2937; font-size: 11px; font-weight: 800; display: grid; place-items: center; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,.3); cursor: pointer; }
    .kmt-pin.selesai { background: #2e9e5b; color: #fff; }
    .kmt-pin.ditolak { background: #9ca3af; color: #fff; }
    .kmt-pin.dikerjakan { background: #1d6fc9; color: #fff; }
    .kmt-pin.geser { border-style: dashed; opacity: .85; }
    .kmt-kotak { position: fixed; z-index: 920; width: 340px; max-height: 70vh; overflow: auto; background: #fff; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.28); font-size: 12px; color: #374151; }
    .kmt-kotak header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #eef0f3; font-weight: 700; color: #1f2937; }
    .kmt-kotak header span { flex: 1; }
    .kmt-kotak .kmt-isi { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .kmt-kotak textarea, .kmt-kotak input, .kmt-kotak select, .kmt-panel select { width: 100%; border: 1px solid #d5dbe3; border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 12px; box-sizing: border-box; }
    .kmt-kotak textarea { min-height: 70px; resize: vertical; }
    .kmt-tombol { display: flex; gap: 8px; justify-content: flex-end; }
    .kmt-tombol button, .kmt-btn { border: 1px solid #c9d3df; background: #fff; color: #374151; border-radius: 6px; padding: 6px 12px; font: inherit; font-size: 12px; cursor: pointer; }
    .kmt-tombol button.utama, .kmt-btn.utama { background: #1d6fc9; border-color: #1d6fc9; color: #fff; }
    .kmt-tombol button:disabled { opacity: .5; cursor: default; }
    .kmt-x { border: 0; background: none; font-size: 18px; line-height: 1; color: #6b7280; cursor: pointer; }
    .kmt-item { border: 1px solid #eef0f3; border-radius: 8px; padding: 8px 10px; }
    .kmt-item.balas { margin-left: 16px; background: #f8fafc; }
    .kmt-meta { font-size: 11px; color: #6b7280; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .kmt-meta b { color: #1f2937; }
    .kmt-teks { white-space: pre-wrap; word-break: break-word; margin-top: 4px; color: #374151; }
    .kmt-chip { font-size: 10px; border-radius: 4px; padding: 1px 6px; border: 1px solid #d5dbe3; background: #f3f4f6; }
    .kmt-chip.baru { color: #a16207; border-color: #f5d27a; background: #fffbeb; }
    .kmt-chip.dikerjakan { color: #1d6fc9; border-color: #9cc3ec; background: #eef6ff; }
    .kmt-chip.selesai { color: #2e7d4f; border-color: #79c99f; background: #f3fbf6; }
    .kmt-pesan { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #f5d27a; border-radius: 6px; padding: 6px 8px; }
    .kmt-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 100vw; z-index: 910; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,.2); display: flex; flex-direction: column; font-size: 12px; color: #374151; }
    .kmt-panel header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #eef0f3; font-weight: 700; font-size: 13px; color: #1f2937; }
    .kmt-panel header span { flex: 1; }
    .kmt-saring { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #eef0f3; }
    .kmt-daftar { flex: 1; overflow: auto; padding: 10px 16px; display: flex; flex-direction: column; gap: 8px; }
    .kmt-daftar .kmt-item { cursor: pointer; }
    .kmt-daftar .kmt-item:hover { border-color: #9cc3ec; background: #f7fbff; }
    .kmt-kaki { padding: 10px 16px; border-top: 1px solid #eef0f3; display: flex; gap: 8px; justify-content: space-between; align-items: center; font-size: 11px; color: #6b7280; }
    .kmt-kosong { text-align: center; color: #9ca3af; padding: 30px 0; }`;
  document.head.appendChild(gaya);

  const IKON = {
    komentar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M12 9v6M9 12h6"/></svg>',
    daftar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M8 10h8M8 14h5"/></svg>'
  };

  // ---------- kerangka lapisan ----------
  const fab = document.createElement('div');
  fab.className = 'kmt-fab kmt-ui';
  fab.innerHTML = `<button type="button" data-k="mode" title="Tambah komentar: klik bagian halaman yang ingin dikomentari" aria-label="Mode komentar">${IKON.komentar}</button>
    <button type="button" data-k="panel" title="Daftar komentar" aria-label="Daftar komentar">${IKON.daftar}<span class="kmt-jml" style="display:none"></span></button>`;
  const lapis = document.createElement('div');
  lapis.className = 'kmt-lapis kmt-ui';
  document.body.append(lapis, fab);
  let pita = null, kotak = null, panel = null;

  function aturMode(aktif) {
    st.aktif = aktif;
    document.body.classList.toggle('kmt-mode', aktif);
    fab.querySelector('[data-k=mode]').classList.toggle('aktif', aktif);
    if (aktif && !pita) { pita = document.createElement('div'); pita.className = 'kmt-pita kmt-ui'; pita.textContent = 'Mode komentar: klik bagian yang ingin dikomentari. Esc untuk keluar.'; document.body.appendChild(pita); }
    if (!aktif && pita) { pita.remove(); pita = null; }
  }
  const tutupKotak = () => { if (kotak) { kotak.remove(); kotak = null; } };

  // posisi kotak di dekat titik, tetap di dalam layar
  function taruh(el, x, y) {
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(x + 12, innerWidth - w - 8)) + 'px';
    el.style.top = Math.max(8, Math.min(y + 12, innerHeight - h - 8)) + 'px';
  }

  // ---------- jangkar: elemen yang diklik + posisi relatif di dalamnya ----------
  function selektor(el) {
    const bagian = [];
    while (el && el !== document.body && el.nodeType === 1) {
      if (el.id) { bagian.unshift('#' + CSS.escape(el.id)); break; }
      let i = 1;
      for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === el.tagName) i++;
      bagian.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    return bagian.join(' > ');
  }
  const ringkas = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  function buatJangkar(el, x, y) {
    // sel tabel: diingat juga lewat id baris + judul kolom, supaya tetap ketemu bila urutan kolom berubah
    const td = el.closest('td');
    const tr = el.closest('tr[data-id]');
    let kolom = null, wadah = null;
    if (td && tr) {
      const th = td.closest('table').querySelectorAll('thead th')[Array.prototype.indexOf.call(tr.children, td)];
      kolom = th ? ringkas((th.querySelector('.judul-kolom') || th).textContent) : null;
      const w = tr.closest('[id]');
      wadah = w ? w.id : null;
      el = td;
    }
    const r = el.getBoundingClientRect();
    return {
      sel: selektor(el), rx: r.width ? (x - r.left) / r.width : 0, ry: r.height ? (y - r.top) / r.height : 0,
      teks: ringkas(el.textContent), baris: tr ? tr.dataset.id : null, kolom, wadah,
      px: x + scrollX, py: y + scrollY, lebar: innerWidth, judul: judulIni()
    };
  }
  // sel tabel dari id baris + judul kolom; null bila barisnya tidak tampil (halaman tabel lain, tersaring)
  function selTabel(j) {
    const w = document.getElementById(j.wadah);
    const tr = w && w.querySelector(`tr[data-id="${CSS.escape(j.baris)}"]`);
    if (!tr) return null;
    const i = Array.prototype.findIndex.call(tr.closest('table').querySelectorAll('thead th'), th => ringkas((th.querySelector('.judul-kolom') || th).textContent) === j.kolom);
    return i < 0 ? null : tr.children[i] || null;
  }
  // posisi layar pin; null bila elemennya tidak terlihat (mis. baris tabel di halaman lain, kolom tertutup)
  function posisi(j) {
    let el = null;
    if (j.baris && j.kolom && j.wadah) {
      el = selTabel(j);
      if (!el) return null;
    } else {
      try { el = j.sel ? document.querySelector(j.sel) : null; } catch { el = null; }
      if (el && j.baris) { const tr = el.closest('tr[data-id]'); if (!tr || tr.dataset.id !== j.baris) return null; }
      if (el && j.teks && !ringkas(el.textContent).startsWith(j.teks.slice(0, 20))) el = null;
    }
    if (el) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      const x = r.left + j.rx * r.width, y = r.top + j.ry * r.height;
      const atas = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1));
      // tertutup elemen situs lain (mis. kolom beku di atas sel yang digeser) = tidak terlihat; tertutup kotak komentar tetap tampil
      if (atas && atas !== el && !el.contains(atas) && !atas.contains(el) && !atas.closest('.kmt-ui')) return null;
      return { x, y, geser: false };
    }
    if (j.baris) return null;
    return { x: j.px - scrollX, y: j.py - scrollY, geser: true };
  }

  // ---------- pin ----------
  let jadwal = 0;
  function gambarPin() {
    // setTimeout, bukan requestAnimationFrame: rAF berhenti di tab latar, padahal jumlah komentar tetap perlu diperbarui
    clearTimeout(jadwal);
    jadwal = setTimeout(() => {
      const hal = halamanIni();
      lapis.style.display = 'none';
      const pin = induk().filter(k => k.halaman === hal).map(k => ({ k, p: posisi(jangkarDari(k)) })).filter(x => x.p);
      lapis.style.display = '';
      lapis.innerHTML = pin.map(({ k, p }) => `<div class="kmt-pin ${esc(k.status)}${p.geser ? ' geser' : ''}" data-id="${k.id}" style="left:${p.x}px;top:${p.y}px"
        title="${esc('#' + k.id + ' ' + k.nama + ': ' + k.teks.slice(0, 80) + (p.geser ? ' (posisi asli berubah)' : ''))}">${k.id}</div>`).join('');
      const jml = induk().filter(k => k.status !== 'selesai' && k.status !== 'ditolak').length;
      const b = fab.querySelector('.kmt-jml');
      b.style.display = jml ? '' : 'none';
      b.textContent = jml;
    }, 16);
  }

  // ---------- kotak tulis komentar baru ----------
  function kotakBaru(jangkar, x, y) {
    tutupKotak();
    kotak = document.createElement('div');
    kotak.className = 'kmt-kotak kmt-ui';
    kotak.innerHTML = `<header><span>Komentar baru</span><button class="kmt-x" data-k="tutup" aria-label="Tutup">×</button></header>
      <div class="kmt-isi">
        ${st.pesan ? `<div class="kmt-pesan">${esc(st.pesan)}</div>` : ''}
        <div class="kmt-meta">Pada: <b>${esc(jangkar.teks || jangkar.judul || '-')}</b></div>
        <input data-k="nama" placeholder="Nama Anda" maxlength="80" value="${esc(namaSaya())}">
        <textarea data-k="teks" placeholder="Tulis masukan atau permintaan perbaikan..." maxlength="4000"></textarea>
        <div class="kmt-tombol"><button data-k="tutup">Batal</button><button class="utama" data-k="kirim" disabled>Simpan</button></div>
      </div>`;
    document.body.appendChild(kotak);
    taruh(kotak, x, y);
    const nama = kotak.querySelector('[data-k=nama]'), teks = kotak.querySelector('[data-k=teks]'), kirim = kotak.querySelector('[data-k=kirim]');
    const cek = () => { kirim.disabled = st.mode === 'galat' || !nama.value.trim() || !teks.value.trim(); };
    kotak.addEventListener('input', cek);
    (nama.value ? teks : nama).focus();
    kotak.addEventListener('click', async e => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      if (k.dataset.k === 'tutup') return tutupKotak();
      if (k.dataset.k !== 'kirim' || kirim.disabled) return;
      kirim.disabled = true;
      simpan.tulis('skpk-v2:nama', nama.value.trim());
      try {
        const baru = await tambah({ halaman: halamanIni(), jangkar: JSON.stringify(jangkar), teks: teks.value.trim(), nama: nama.value.trim(), penulis, versi: VERSI });
        tutupKotak();
        aturMode(false);
        gambarPin();
        gambarPanel();
        bukaUtas(baru.id);
      } catch (err) { alert('Komentar gagal disimpan: ' + err.message); cek(); }
    });
  }

  // ---------- kotak utas: komentar, balasan, status ----------
  function bukaUtas(id, x, y) {
    const k = st.data.find(z => z.id === id);
    if (!k) return;
    tutupKotak();
    const item = (z, balas) => `<div class="kmt-item${balas ? ' balas' : ''}">
        <div class="kmt-meta"><b>${esc(z.nama)}</b><span>${esc(waktu(z.dibuat))}</span>${z.versi ? `<span title="Versi situs saat komentar dibuat">v${esc(z.versi)}</span>` : ''}
          ${z.penulis === penulis ? `<button class="kmt-x" style="font-size:12px;margin-left:auto" data-hapus="${z.id}" title="Hapus komentar saya">Hapus</button>` : ''}</div>
        <div class="kmt-teks">${esc(z.teks)}</div></div>`;
    kotak = document.createElement('div');
    kotak.className = 'kmt-kotak kmt-ui';
    kotak.innerHTML = `<header><span>#${k.id} · ${esc(jangkarDari(k).judul || k.halaman)}</span><button class="kmt-x" data-k="tutup" aria-label="Tutup">×</button></header>
      <div class="kmt-isi">
        ${item(k)}${balasan(k.id).map(z => item(z, true)).join('')}
        <label class="kmt-meta">Status <select data-k="status">${Object.entries(STATUS).map(([v, l]) => `<option value="${v}" ${v === k.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${k.status_oleh ? `<div class="kmt-meta">Status diubah oleh ${esc(k.status_oleh)} ${esc(waktu(k.diubah))}</div>` : ''}
        <input data-k="nama" placeholder="Nama Anda" maxlength="80" value="${esc(namaSaya())}">
        <textarea data-k="teks" placeholder="Balas..." maxlength="4000"></textarea>
        <div class="kmt-tombol"><button class="utama" data-k="balas" disabled>Balas</button></div>
      </div>`;
    document.body.appendChild(kotak);
    const pin = lapis.querySelector(`[data-id="${id}"]`);
    if (x == null && pin) { const r = pin.getBoundingClientRect(); x = r.right; y = r.top; }
    taruh(kotak, x == null ? innerWidth / 2 - 170 : x, y == null ? 80 : y);
    const nama = kotak.querySelector('[data-k=nama]'), teks = kotak.querySelector('[data-k=teks]'), tombol = kotak.querySelector('[data-k=balas]');
    kotak.addEventListener('input', () => { tombol.disabled = st.mode === 'galat' || !nama.value.trim() || !teks.value.trim(); });
    kotak.querySelector('[data-k=status]').addEventListener('change', async e => {
      try { await ubahStatus(id, e.target.value); gambarPin(); gambarPanel(); } catch (err) { alert('Status gagal diubah: ' + err.message); }
    });
    kotak.addEventListener('click', async e => {
      const h = e.target.closest('[data-hapus]');
      if (h) {
        if (!confirm('Hapus komentar ini' + (Number(h.dataset.hapus) === id ? ' beserta balasannya' : '') + '?')) return;
        try { await hapus(Number(h.dataset.hapus)); } catch (err) { return alert('Gagal menghapus: ' + err.message); }
        gambarPin(); gambarPanel();
        return Number(h.dataset.hapus) === id ? tutupKotak() : bukaUtas(id);
      }
      const k2 = e.target.closest('[data-k]');
      if (!k2) return;
      if (k2.dataset.k === 'tutup') return tutupKotak();
      if (k2.dataset.k !== 'balas' || tombol.disabled) return;
      tombol.disabled = true;
      simpan.tulis('skpk-v2:nama', nama.value.trim());
      try {
        await tambah({ induk: id, halaman: k.halaman, jangkar: null, teks: teks.value.trim(), nama: nama.value.trim(), penulis, versi: VERSI });
        gambarPanel();
        bukaUtas(id);
      } catch (err) { alert('Balasan gagal disimpan: ' + err.message); tombol.disabled = false; }
    });
  }

  // ---------- panel daftar komentar ----------
  function gambarPanel() {
    if (!st.panel) { if (panel) { panel.remove(); panel = null; } return; }
    if (!panel) {
      panel = document.createElement('aside');
      panel.className = 'kmt-panel kmt-ui';
      document.body.appendChild(panel);
      panel.addEventListener('change', e => { const f = e.target.dataset.f; if (f) { st.filter[f] = e.target.value; gambarPanel(); } });
      panel.addEventListener('click', e => {
        if (e.target.closest('[data-k=tutup]')) { st.panel = false; return gambarPanel(); }
        if (e.target.closest('[data-k=unduh]')) return unduhCsv();
        if (e.target.closest('[data-k=segar]')) return muat().then(() => { gambarPin(); gambarPanel(); });
        const it = e.target.closest('[data-id]');
        if (it) pergiKe(Number(it.dataset.id));
      });
    }
    const hal = halamanIni();
    const daftar = induk().filter(k => (st.filter.lingkup === 'semua' || k.halaman === hal) && (!st.filter.status || k.status === st.filter.status)).reverse();
    panel.innerHTML = `<header><span>Komentar (${induk().length})</span><button class="kmt-x" data-k="tutup" aria-label="Tutup">×</button></header>
      <div class="kmt-saring">
        <select data-f="lingkup" aria-label="Halaman"><option value="ini" ${st.filter.lingkup === 'ini' ? 'selected' : ''}>Halaman ini</option><option value="semua" ${st.filter.lingkup === 'semua' ? 'selected' : ''}>Semua halaman</option></select>
        <select data-f="status" aria-label="Status"><option value="">Semua status</option>${Object.entries(STATUS).map(([v, l]) => `<option value="${v}" ${v === st.filter.status ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="kmt-daftar">${st.pesan ? `<div class="kmt-pesan">${esc(st.pesan)}</div>` : ''}
        ${daftar.length ? daftar.map(k => `<div class="kmt-item" data-id="${k.id}">
          <div class="kmt-meta"><b>#${k.id} ${esc(k.nama)}</b><span>${esc(waktu(k.dibuat))}</span><span class="kmt-chip ${esc(k.status)}">${STATUS[k.status] || esc(k.status)}</span></div>
          <div class="kmt-meta">${esc(jangkarDari(k).judul || k.halaman)}${jangkarDari(k).teks ? ' · ' + esc(jangkarDari(k).teks.slice(0, 40)) : ''}</div>
          <div class="kmt-teks">${esc(k.teks.length > 200 ? k.teks.slice(0, 200) + '…' : k.teks)}</div>
          ${balasan(k.id).length ? `<div class="kmt-meta" style="margin-top:4px">${balasan(k.id).length} balasan</div>` : ''}</div>`).join('') : '<div class="kmt-kosong">Belum ada komentar. Klik tombol komentar di kanan bawah, lalu klik bagian halaman.</div>'}
      </div>
      <div class="kmt-kaki"><span>${st.mode === 'server' ? 'Tersimpan di server' : st.mode === 'lokal' ? 'Tersimpan di peramban ini' : ''}</span>
        <span style="display:flex;gap:8px"><button class="kmt-btn" data-k="segar">Muat ulang</button><button class="kmt-btn utama" data-k="unduh">Unduh CSV</button></span></div>`;
  }

  // buka halaman komentar lalu tampilkan utasnya
  function pergiKe(id) {
    const k = st.data.find(z => z.id === id);
    if (!k) return;
    const buka = () => setTimeout(() => {
      const j = jangkarDari(k);
      let el = null;
      try { el = j.baris && j.kolom ? selTabel(j) : j.sel ? document.querySelector(j.sel) : null; } catch { el = null; }
      if (el) el.scrollIntoView({ block: 'center' }); else if (j.py != null) scrollTo(0, Math.max(0, j.py - innerHeight / 2));
      gambarPin();
      setTimeout(() => bukaUtas(id), 120);
    }, 250);
    if (location.hash !== k.halaman) { addEventListener('hashchange', buka, { once: true }); location.hash = k.halaman; } else buka();
  }

  function unduhCsv() {
    const sel = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const kolom = ['id', 'induk', 'halaman', 'judul', 'bagian', 'nama', 'teks', 'status', 'status_oleh', 'versi', 'dibuat', 'diubah'];
    const baris = st.data.map(k => { const j = jangkarDari(k); return [k.id, k.induk, k.halaman, j.judul, j.teks, k.nama, k.teks, STATUS[k.status] || k.status, k.status_oleh, k.versi, k.dibuat, k.diubah]; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [kolom, ...baris].map(r => r.map(sel).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'komentar-skpk-v2.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- peristiwa ----------
  fab.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    if (b.dataset.k === 'mode') { tutupKotak(); aturMode(!st.aktif); }
    else { st.panel = !st.panel; if (st.panel) muat().then(() => { gambarPin(); gambarPanel(); }); gambarPanel(); }
  });
  // mode komentar: klik di halaman membuka kotak komentar baru; klik tidak diteruskan ke situs
  document.addEventListener('click', e => {
    if (!st.aktif || e.target.closest('.kmt-ui')) return;
    e.preventDefault();
    e.stopPropagation();
    kotakBaru(buatJangkar(e.target, e.clientX, e.clientY), e.clientX, e.clientY);
  }, true);
  ['mousedown', 'pointerdown'].forEach(n => document.addEventListener(n, e => {
    if (st.aktif && !e.target.closest('.kmt-ui')) e.preventDefault();
  }, true));
  lapis.addEventListener('click', e => { const p = e.target.closest('.kmt-pin'); if (p) { const r = p.getBoundingClientRect(); bukaUtas(Number(p.dataset.id), r.right, r.top); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (kotak) tutupKotak(); else if (st.aktif) aturMode(false); } });
  // kotak tertutup bila klik di luar (bukan saat mode komentar)
  document.addEventListener('mousedown', e => { if (kotak && !st.aktif && !e.target.closest('.kmt-ui')) tutupKotak(); });
  addEventListener('hashchange', () => { tutupKotak(); gambarPin(); gambarPanel(); });
  addEventListener('scroll', gambarPin, true);
  addEventListener('resize', gambarPin);
  const view = document.getElementById('view') || document.body;
  new MutationObserver(gambarPin).observe(view, { childList: true, subtree: true });

  muat().then(gambarPin);
  setInterval(() => { if (!document.hidden && st.mode === 'server') muat().then(() => { gambarPin(); if (st.panel) gambarPanel(); }); }, 60000);
})(window);
