/*
 * SKPK v2: router hash + lima halaman dengan tampilan CEISA 4.0 Smart PCC (As-Is).
 *   #/smart-pcc/browse-pib                              Browse (Menu 1: cari, flag RE, turunkan ke basket)
 *   #/smart-pcc/browse-pib/transaksional/<id>           Data Transaksional (Aksi biru di Browse)
 *   #/smart-pcc/penelitian-skpk                         Basket (Menu 2: HS penetapan, potensi, SIRENA)
 *   #/smart-pcc/penelitian-skpk/detail-skpk/<id>        Basket Detail (Aksi biru di Basket)
 *   #/smart-pcc/browse-pib/data-history                 Data History (temuan Audit / Penul / Notul; import LHA / LHPU)
 *   #/smart-pcc/browse-pib/sirena-manual                SIRENA Manual (import seri DNOA / SIRENA masa transisi)
 * Isian yang disimpan (basket, Hasil Penelitian) hanya di localStorage peramban.
 */
(function (root) {
  'use strict';

  const D = root.SKPK_ASLI;
  const B = root.SkpkBasket;
  const { angka, rupiah, tgl } = D;

  // ---------- ikon (garis, currentColor) ----------
  const svg = (d, isi) => `<svg viewBox="0 0 24 24" fill="${isi ? 'currentColor' : 'none'}" stroke="${isi ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IKON = {
    cari: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    grafik: svg('<path d="M4 20V4M4 20h16M9 16v-5M13 16V8M17 16v-3"/>'),
    daftar: svg('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
    pena: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
    dok: svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>'),
    gedung: svg('<path d="M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8"/>'),
    unggahAwan: svg('<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8"/><path d="M12 12v8M9 15l3-3 3 3"/>'),
    kalender: svg('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>'),
    rantai: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    segar: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
    unduh: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    unggah: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
    riwayat: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3"/>'),
    simpan: svg('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'),
    tambah: svg('<path d="M12 5v14M5 12h14"/>'),
    sampah: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    kurang: svg('<path d="M5 12h14"/>'),
    regex: svg('<path d="M16 3.5v9M12.1 5.75l7.8 4.5M12.1 10.25l7.8-4.5"/><circle cx="6.5" cy="17.5" r="2.5"/>'),
    kembali: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    petir: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    cekLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    xLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
    infoLingkaran: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
    menuPcc: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h3M14 18l4-4 2 2-4 4h-2z"/>'),
    ai: svg('<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#7c83f2" stroke="none"/>'),
    bendera: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    info: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h10"/>'),
    pemeriksa: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="11" cy="11" r="3"/><path d="M13 13l3 3"/>'),
    keranjang: svg('<path d="M3 4h2l2 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>'),
    dolar: svg('<circle cx="12" cy="12" r="9"/><path d="M15 9a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2a3 3 0 0 1-3-1.5M12 6v1.5M12 16.5V18"/>'),
    larangan: svg('<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>'),
    kolom: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
    corong: svg('<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>'),
    dasbor: svg('<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="4" rx="1.5"/><rect x="14" y="12" width="7" height="8" rx="1.5"/><rect x="3" y="15" width="7" height="5" rx="1.5"/>'),
    lapis: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    segitiga: svg('<path d="M12 4l9.5 16h-19z"/><path d="M12 10v4M12 17h.01"/>'),
    perluas: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    lencana: svg('<circle cx="12" cy="9" r="5.5"/><path d="M9.5 9l2 2 3-3.5M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>'),
    penanda: svg('<path d="M6 3h12v18l-6-4.5L6 21z"/>'),
    lonceng: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    kirim: svg('<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>'),
    centang: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    centangGanda: svg('<path d="M2 12.5l4.5 4.5L16 7M12 16l1 1 9.5-10"/>'),
    urung: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    silang: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    alur: svg('<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M7.5 12h2M14.5 12h2"/>'),
    turun: svg('<path d="M6 9l6 6 6-6"/>'),
    mata: svg('<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    dokKirim: svg('<path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h6"/><path d="M13 3v5h5v4"/><path d="M15 18h6M18 15l3 3-3 3"/>'),
    sapu: svg('<path d="M20 4l-7.5 7.5"/><path d="M10.5 10l3.5 3.5-1.5 1.5c-1.6 1.6-4.6 2.8-8.5 4 1.2-3.9 2.4-6.9 4-8.5z"/><path d="M8 16.5l-1.5 1.5"/>')
  };
  root.IKON = IKON;

  // ikon statis di kerangka (index.astro)
  const NAMA_IKON = { cari: 'cari', keranjang: 'keranjang', 'menu-pcc': 'menuPcc', ai: 'ai', alur: 'alur' };
  document.querySelectorAll('[data-ikon]').forEach(el => { el.innerHTML = IKON[NAMA_IKON[el.dataset.ikon]] || ''; });

  const esc = root.esc;
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');

  // ---------- penyimpanan lokal (aman bila diblokir) ----------
  const simpanan = {
    baca(k, awal) { try { const v = localStorage.getItem('skpk-asli:' + k); return v ? JSON.parse(v) : awal; } catch { return awal; } },
    tulis(k, v) { try { localStorage.setItem('skpk-asli:' + k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };

  // ---------- toast & modal ----------
  // aksi opsional { teks, fn }: tombol teks di toast (Urungkan, Bersihkan); toast beraksi tampil lebih lama
  function toast(tipe, judul, pesan, aksi) {
    const el = document.createElement('div');
    el.className = 'toast ' + tipe;
    const ik = tipe === 'ok' ? IKON.cekLingkaran : tipe === 'galat' ? IKON.xLingkaran : IKON.infoLingkaran;
    el.innerHTML = `<span class="ik">${ik}</span><div><b>${esc(judul)}</b><p>${esc(pesan)}</p>${aksi ? `<button class="toast-aksi">${esc(aksi.teks)}</button>` : ''}</div><button class="tutup" aria-label="Tutup">×</button>`;
    $('#toast').appendChild(el);
    const buang = () => el.remove();
    el.querySelector('.tutup').onclick = buang;
    if (aksi) el.querySelector('.toast-aksi').onclick = () => { buang(); aksi.fn(); };
    setTimeout(buang, aksi ? 7000 : 4000);
  }
  root.skpkToast = toast; // dipakai tabel.js (pesan salin)

  function modal(judul, isiHtml, tombol) {
    const lap = document.createElement('div');
    lap.className = 'modal-latar';
    lap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(judul)}">
      <div class="modal-kepala">${esc(judul)}<button class="tutup" aria-label="Tutup">×</button></div>
      <div class="modal-isi">${isiHtml}</div>
      <div class="modal-kaki">${(tombol || [{ teks: 'Tutup', kelas: 'btn-garis' }]).map((t, i) => `<button class="btn ${t.kelas}" data-i="${i}"${t.utama ? ' data-utama' : ''}>${t.teks}</button>`).join('')}</div>
    </div>`;
    const tutup = () => { lap.remove(); document.removeEventListener('keydown', esc_); };
    // Esc = tutup; Enter di kotak isian (bukan textarea) = tombol utama (bertanda utama, bawaan tombol terakhir) bila aktif
    const esc_ = e => {
      if (e.key === 'Escape') tutup();
      else if (e.key === 'Enter' && e.target.matches('.modal input')) {
        const utama = lap.querySelector('.modal-kaki [data-utama]') || lap.querySelector('.modal-kaki [data-i]:last-child');
        if (utama && !utama.disabled) { e.preventDefault(); utama.click(); }
      }
    };
    document.addEventListener('keydown', esc_);
    lap.addEventListener('click', e => {
      if (e.target === lap || e.target.closest('.tutup')) return tutup();
      const b = e.target.closest('[data-i]');
      // aksi yang mengembalikan false = popup tetap terbuka
      if (b) { const t = (tombol || [])[b.dataset.i]; if (t && t.aksi && t.aksi() === false) return; tutup(); }
    });
    $('#lapisan').appendChild(lap);
  }

  function pilihFile(terima, saatDipilih) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = terima;
    inp.onchange = () => { if (inp.files[0]) saatDipilih(inp.files[0]); };
    inp.click();
  }

  // ---------- kerangka: token, sidebar ----------
  let sisa = 11 * 3600 + 54 * 60 + 1;
  setInterval(() => {
    sisa = Math.max(0, sisa - 1);
    const p = n => String(n).padStart(2, '0');
    $('#token').textContent = `${p(Math.floor(sisa / 3600))}:${p(Math.floor(sisa / 60) % 60)}:${p(sisa % 60)}`;
  }, 1000);

  $('#btnCiut').onclick = () => $('#app').classList.add('ciut');
  $('#btnLebar').onclick = () => $('#app').classList.remove('ciut');
  // layar sempit: menu otomatis diciutkan supaya tabel mendapat ruang (tetap bisa dilebarkan dengan »)
  const layarSempit = matchMedia('(max-width: 1100px)');
  const aturCiut = () => $('#app').classList.toggle('ciut', layarSempit.matches);
  aturCiut();
  layarSempit.addEventListener('change', aturCiut);
  $('#sbPcc').onclick = () => $('.sb-menu').classList.toggle('buka');
  $('#sbSkpk').onclick = () => $('.sb-anak').classList.toggle('tutup');
  const saringMenu = () => {
    const q = $('#cariMenu').value.trim().toLowerCase();
    document.querySelectorAll('.sb-menu').forEach(m => { m.hidden = q && !m.dataset.cari.includes(q); });
  };
  $('#cariMenu').addEventListener('input', saringMenu);
  $('#hapusCari').onclick = () => { $('#cariMenu').value = ''; saringMenu(); $('#cariMenu').focus(); };

  // ---------- peran (pengganti login) dan notifikasi ----------
  // Topbar adalah bawaan aplikasi induk CEISA dan tidak diubah: keduanya ada di kepala kartu halaman ([data-akun])
  const waktuPenuh = iso => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const tglPendek = iso => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  function umur(iso) {
    const m = (Date.now() - new Date(iso)) / 60000;
    return m < 1 ? 'baru' : m < 60 ? Math.floor(m) + ' mnt' : m < 1440 ? Math.floor(m / 60) + ' jam' : m < 43200 ? Math.floor(m / 1440) + ' hr' : tglPendek(iso);
  }
  // k = id pengguna (atau kunci peran lama); inisial dan warna menurut peran
  const avatarHtml = (k, kelas = '') => `<span class="av ${kelas}" style="--av:${(B.PERAN[B.peranOleh(k)] || B.PERAN.junior).warna}" aria-hidden="true">${B.inisial(k)}</span>`;
  const hrefAju = id => '#/smart-pcc/penelitian-skpk/approval/' + encodeURIComponent(id);

  // popover di bawah tombol; klik di luar / Esc = tutup
  let popAktif = null;
  function tutupPop() {
    if (!popAktif) return;
    popAktif.el.remove();
    popAktif.jangkar.setAttribute('aria-expanded', 'false');
    popAktif = null;
  }
  function bukaPop(jangkar, kelas, html) {
    const sama = popAktif && popAktif.jangkar === jangkar;
    tutupPop();
    if (sama) return null;
    const el = document.createElement('div');
    el.className = 'pop ' + kelas;
    el.innerHTML = html;
    document.body.appendChild(el);
    const b = jangkar.getBoundingClientRect();
    el.style.top = b.bottom + 6 + 'px';
    el.style.right = Math.max(8, innerWidth - b.right) + 'px';
    jangkar.setAttribute('aria-expanded', 'true');
    popAktif = { el, jangkar };
    return el;
  }
  document.addEventListener('mousedown', e => { if (popAktif && !popAktif.el.contains(e.target) && !popAktif.jangkar.contains(e.target)) tutupPop(); });
  // Esc menutup popover saja (laci / modal di belakangnya tetap terbuka)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && popAktif) { e.stopImmediatePropagation(); const j = popAktif.jangkar; tutupPop(); j.focus(); } });
  window.addEventListener('resize', tutupPop);
  window.addEventListener('hashchange', tutupPop);

  // dropdown pengganti <select> / datalist: daftar bergulir, kotak cari baru muncul saat dibuka (atau saat mulai mengetik).
  // o = { nilai, daftar: () => [{ v, n?, hapus? }] (v '' = tanpa pilihan), label(v) -> html, cari (bawaan true),
  //       baru (teks cari yang belum ada boleh dipilih sebagai nilai baru), lebar, pilih(v), hapus(v, segarkan) }
  function pasangPilih(btn, o) {
    const label = v => (o.label ? o.label(v) : esc(v));
    const atur = v => {
      btn.value = v || '';
      btn.innerHTML = `<span class="pilih-teks">${label(btn.value)}</span>`;
      btn.classList.toggle('kosong', !btn.value);
    };
    atur(o.nilai);
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.onclick = () => buka('');
    btn.onkeydown = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); buka(''); }
      else if (o.cari !== false && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); buka(e.key); }
    };
    function buka(awal) {
      const el = bukaPop(btn, 'pop-pilih', `${o.cari === false ? '' : `<label class="pp-cari"><span class="ik">${IKON.cari}</span><input type="text" placeholder="Cari" aria-label="Cari" autocomplete="off" spellcheck="false"></label>`}<div class="pp-daftar" role="listbox"></div>`);
      if (!el) return;
      const b = btn.getBoundingClientRect();
      const lebar = Math.max(b.width, o.lebar || 0);
      Object.assign(el.style, { right: 'auto', width: lebar + 'px', left: Math.max(8, Math.min(b.left, innerWidth - lebar - 8)) + 'px' });
      // kotak cari tepat di atas tombolnya (baris yang sama), daftar menyambung langsung di bawahnya; bila ruang bawah sempit,
      // daftar dibalik ke atas dengan kotak cari tetap di baris tombol. Tepi 5px = padding 4 + garis 1 dari .pop-pilih
      if (o.cari !== false) {
        const cari = el.querySelector('.pp-cari');
        cari.style.height = b.height + 'px';
        const bawah = innerHeight - b.top - 8, atas = b.bottom - 8;
        const keAtas = bawah < 200 && atas > bawah;
        el.classList.toggle('ke-atas', keAtas);
        Object.assign(el.style, keAtas
          ? { top: 'auto', bottom: innerHeight - b.bottom - 5 + 'px', maxHeight: Math.min(330, atas) + 'px' }
          : { top: b.top - 5 + 'px', maxHeight: Math.min(330, bawah) + 'px' });
      }
      const inp = el.querySelector('input');
      const daftar = el.querySelector('.pp-daftar');
      let ops = [], sorot = -1;
      const gambar = () => {
        const kata = inp ? inp.value.trim().replace(/\s+/g, ' ') : '';
        const semua = o.daftar();
        ops = semua.filter(x => !kata || x.v.toLowerCase().includes(kata.toLowerCase()));
        if (o.baru && kata && !semua.some(x => x.v.toLowerCase() === kata.toLowerCase())) ops.unshift({ v: kata, baru: true });
        if (sorot < 0 || sorot >= ops.length) sorot = Math.max(0, ops.findIndex(x => x.v === btn.value && !x.baru));
        if (kata) sorot = 0;
        daftar.innerHTML = ops.length ? ops.map((x, i) => `<div class="pp-op${x.v === btn.value && !x.baru ? ' kini' : ''}${i === sorot ? ' sorot' : ''}" role="option" aria-selected="${x.v === btn.value && !x.baru}" data-i="${i}">
            ${x.baru ? `<span class="ik">${IKON.tambah}</span><span class="pp-teks">${esc(x.v)}</span>` : `<span class="pp-teks">${label(x.v)}</span>`}
            ${x.n != null ? `<b class="pp-n">${x.n}</b>` : ''}${x.hapus ? `<button class="pp-hapus" data-hapus title="Hapus" aria-label="Hapus ${esc(x.v)}"><span class="ik">${IKON.sampah}</span></button>` : ''}</div>`).join('')
          : '<div class="pp-kosong">Tidak ada yang cocok</div>';
      };
      const geser = d => {
        if (!ops.length) return;
        sorot = (sorot + d + ops.length) % ops.length;
        daftar.querySelectorAll('.pp-op').forEach((x, i) => x.classList.toggle('sorot', i === sorot));
        daftar.children[sorot].scrollIntoView({ block: 'nearest' });
      };
      const pilih = i => {
        const x = ops[i];
        if (!x) return;
        tutupPop();
        atur(x.v);
        btn.focus();
        if (o.pilih) o.pilih(x.v);
      };
      gambar();
      const kini = daftar.querySelector('.kini');
      if (kini) kini.scrollIntoView({ block: 'nearest' });
      el.onclick = e => {
        const op = e.target.closest('.pp-op');
        if (!op) return;
        if (e.target.closest('[data-hapus]')) {
          o.hapus(ops[op.dataset.i].v, () => { if (popAktif && popAktif.el === el) gambar(); });
          return (inp || daftar).focus();
        }
        pilih(+op.dataset.i);
      };
      el.onmousemove = e => {
        const op = e.target.closest('.pp-op');
        if (op && +op.dataset.i !== sorot) { sorot = +op.dataset.i; daftar.querySelectorAll('.pp-op').forEach((x, i) => x.classList.toggle('sorot', i === sorot)); }
      };
      el.onkeydown = e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); geser(e.key === 'ArrowDown' ? 1 : -1); }
        else if (e.key === 'Enter') { e.preventDefault(); pilih(sorot); }
        else if (e.key === 'Tab') tutupPop();
      };
      if (inp) {
        inp.value = awal || '';
        inp.oninput = () => { sorot = -1; gambar(); };
        if (awal) gambar();
        inp.focus();
      } else { daftar.tabIndex = -1; daftar.focus(); }
    }
    return { atur };
  }

  // hapus tema dari draft sendiri (dropdown tema Penetapan HS); Undo memulihkan seri dan analisanya
  function hapusTema(nama, segarkan) {
    const h = B.hapusTema(nama);
    const n = Object.keys(h.hapus).length;
    if (!n) return toast('galat', 'Tidak Bisa Menghapus', 'Tema ini tidak punya seri di draft Anda.');
    segarkan();
    toast('ok', 'Tema Dihapus', `${nama} · ${n} seri keluar dari draft` + (h.sisa ? ` (${h.sisa} terkirim / milik analis lain tetap)` : ''), { teks: 'Undo', fn: () => { B.pulihkanTema(h.hapus); segarkan(); } });
  }
  // Keputusan Analis 2 di Approval (Browse): Approve / Return / Reject untuk seri terpilih atau semua seri satu pengajuan.
  // Semuanya lewat popup konfirmasi (rapat 6 Nov 2026): Approve = masuk Basket, final dan tidak bisa dikembalikan;
  // Return / Reject minta catatan wajib. Send to SIRENA (Basket) juga dikonfirmasi.
  const bisaPutus = r => { const s = B.status(r); return !!s && s.unit && s.status === 'ajukan'; };
  const bisaKirim = r => { const s = B.status(r); return !!s && s.unit && s.status === 'setuju'; };
  const PUTUS = {
    setujui: { judul: 'Setujui', tombol: 'btn-biru', selesai: 'Disetujui', pesan: 'Seri masuk Basket Nominasi dan tidak bisa dikembalikan.', fn: 'setujuiSeri' },
    kembalikan: { judul: 'Kembalikan', tombol: 'btn-biru', selesai: 'Dikembalikan', pesan: 'Seri kembali ke draft analis.', catatan: true, fn: 'kembalikanSeri' },
    tolak: { judul: 'Tolak', tombol: 'btn-merah', selesai: 'Ditolak', pesan: 'Seri dilepas dan analisisnya dihapus.', catatan: true, fn: 'tolakSeri' }
  };
  function putusSeri(aksi, rows, judul, selesai) {
    const P = PUTUS[aksi];
    const siap = rows.filter(bisaPutus);
    if (!siap.length) return toast('galat', 'Tidak Bisa Diproses', 'Pilih seri yang menunggu Approval.');
    const lewat = rows.length - siap.length;
    modal(P.judul, `<p class="ap-konfirm">${esc(judul)} · <b>${siap.length}</b> seri</p><p class="ap-peringatan"><span class="ik">${IKON.segitiga}</span>${P.pesan}</p>
      ${P.catatan ? '<textarea class="inp ap-catatan-isi" id="apCatatan" rows="3" aria-label="Catatan"></textarea>' : ''}`, [
      { teks: 'Batal', kelas: 'btn-garis' },
      { teks: P.judul, kelas: P.tombol, aksi: () => {
        const el = $('#apCatatan');
        const c = el ? el.value.trim() : '';
        if (P.catatan && !c) { el.classList.add('galat'); el.focus(); return false; }
        const h = B[P.fn](siap.map(r => r.kunci), c);
        if (!h || !h.n) { toast('galat', 'Gagal', 'Seri ini sudah berubah.'); return; }
        gambarAkun();
        selesai();
        toast('ok', P.selesai, `${h.n} seri` + (lewat ? ` (${lewat} dilewati, tidak menunggu Approval)` : ''));
      } }
    ]);
    setTimeout(() => { const c = $('#apCatatan'); if (c) { c.focus(); c.oninput = () => c.classList.remove('galat'); } });
  }
  function kirimSeri(rows, selesai) {
    const siap = rows.filter(bisaKirim);
    if (!siap.length) return toast('galat', 'Tidak Bisa Mengirim', 'Pilih seri di Basket Nominasi.');
    const tema = new Set(siap.map(r => B.status(r).tema)).size;
    modal('Kirim ke SIRENA', `<p class="ap-konfirm"><b>${siap.length}</b> seri · ${tema} tema</p>`, [
      { teks: 'Batal', kelas: 'btn-garis' },
      { teks: 'Kirim', kelas: 'btn-biru', aksi: () => {
        const h = B.kirimSirena(siap.map(r => r.kunci));
        if (!h.length) { toast('galat', 'Gagal', 'Seri ini sudah berubah.'); return; }
        gambarAkun();
        selesai();
        toast('ok', 'Terkirim ke SIRENA', h.map(g => g.nomor).join(', '));
      } }
    ]);
  }

  const htmlAkun = () => '<div class="kp-akun" data-akun></div>';
  function gambarAkun() {
    tutupPop();
    const p = B.penggunaKini();
    const n = B.notifikasi().length;
    const html = `<button class="kp-btn" data-buka="notif" aria-haspopup="dialog" aria-expanded="false" title="Notifikasi" aria-label="Notifikasi${n ? `, ${n} menunggu` : ''}"><span class="ik">${IKON.lonceng}</span>${n ? `<b class="kp-badge merah">${n > 99 ? '99+' : n}</b>` : ''}</button>
      <button class="kp-peran" data-buka="peran" aria-haspopup="menu" aria-expanded="false" title="${esc(p.nama)}" aria-label="Pengguna: ${esc(p.nama)}">${avatarHtml(p.id)}<span class="ik">${IKON.turun}</span></button>`;
    document.querySelectorAll('[data-akun]').forEach(el => { el.innerHTML = html; });
    // jumlah pengajuan yang menunggu peran aktif, di tombol Approval (Basket)
    const tg = B.tugas().length;
    document.querySelectorAll('[data-hitung="approval"]').forEach(el => { el.textContent = tg > 99 ? '99+' : tg; el.hidden = !tg; });
    // file import yang menunggu Approval (Analis 2 / Admin), di ikon Data History dan SIRENA Manual
    for (const h of ['history', 'manual']) {
      const n = root.SkpkImpor ? root.SkpkImpor.menunggu(h).length : 0;
      document.querySelectorAll(`[data-hitung="impor-${h}"]`).forEach(el => { el.textContent = n; el.hidden = !n; });
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-akun] [data-buka]');
    if (b) (b.dataset.buka === 'notif' ? bukaNotif : bukaAkun)(b);
  });

  function bukaAkun(j) {
    const k = B.penggunaKini().id;
    const el = bukaPop(j, 'pop-akun', B.PENGGUNA.map(x => `<button class="pop-mi${x.id === k ? ' kini' : ''}" role="menuitemradio" aria-checked="${x.id === k}" data-pengguna="${x.id}">${avatarHtml(x.id, 'kecil')}<span>${esc(x.nama)}</span></button>`).join(''));
    if (!el) return;
    el.setAttribute('role', 'menu');
    el.onclick = e => {
      const b = e.target.closest('[data-pengguna]');
      if (!b) return;
      if (b.dataset.pengguna === k) return tutupPop();
      B.gantiPengguna(b.dataset.pengguna);
      jalankan();
      toast('info', 'Pengguna Diganti', B.penggunaKini().nama);
    };
  }

  // notifikasi = yang perlu ditindaklanjuti saja (B.notifikasi): Needs approval, 30+ days in Basket, Returned, Expiring, Expired
  const JENIS_NOTIF = {
    approve: ['Menunggu Approval', 'centang'], lama: [B.HARI_BASKET + '+ hari di Basket Nominasi', 'kalender'], kembali: ['Dikembalikan', 'urung'],
    expiring: ['Hampir Kedaluwarsa', 'kalender'], expired: ['Kedaluwarsa', 'segitiga'],
    impor: ['Import Menunggu Approval', 'unggah'], imporTolak: ['Import Ditolak', 'xLingkaran'], ditimpa: ['Ditimpa Import DNOA', 'dokKirim']
  };
  function bukaNotif(j) {
    const daftar = B.notifikasi();
    // tujuan klik: Returned / expiring milik Analis 1 = Browse mode Daftar Analisa (Analis 1 tidak membuka Basket);
    // Needs approval / expiring yang masih di Approval = Browse mode Approval; lama / expiring di Basket = Basket. Tema ikut disaring
    const exp = x => x.jenis === 'expiring' || x.jenis === 'expired';
    // import (Needs approval / Rejected) = halaman Data History / SIRENA Manual dengan saringan file itu; ditimpa = SIRENA Manual
    const ke = x => (x.halaman ? x.halaman : x.jenis === 'ditimpa' ? 'manual' : x.jenis === 'kembali' || (B.peranKini() === 'junior' && exp(x)) ? 'draft'
      : x.jenis === 'approve' || (exp(x) && x.approval) ? 'approval' : 'basket');
    const HREF_KE = { basket: BASKET, history: HREF_HISTORY, manual: HREF_MANUAL };
    const baris = x => {
      const [judul, ik] = JENIS_NOTIF[x.jenis];
      const tip = exp(x) ? `${x.n} seri lewat / ≤ ${B.HARI_PERINGATAN} hari menuju batas 2 tahun` : x.jenis === 'lama' ? `${x.n} seri belum dikirim ke SIRENA`
        : x.jenis === 'impor' ? x.ket : x.jenis === 'imporTolak' ? x.ket + ' · ' + x.catatan : x.jenis === 'ditimpa' ? x.n + ' seri · ' + x.impor : x.catatan || '';
      const kanan = x.jenis === 'expiring' ? `<span class="notif-umur" title="Sisa ${x.sisa} hari">${x.sisa} hr</span>`
        : x.jenis === 'lama' ? `<span class="notif-umur" title="Terlama: ${x.umur} hari di Basket Nominasi">${x.umur} hr</span>`
        : exp(x) ? '' : `<span class="notif-umur" title="${esc(waktuPenuh(x.waktu))}">${umur(x.waktu)}</span>`;
      const tujuan = ke(x);
      return `<a class="notif${x.baru ? ' baru' : ''}" href="${HREF_KE[tujuan] || BERANDA}" data-notif="${esc(x.id)}" data-ke="${tujuan}" data-tema="${esc(x.tema)}" data-impor="${esc(x.impor || '')}"${tip ? ` title="${esc(tip)}"` : ''}>
        <span class="notif-ik nf-${x.jenis}"><span class="ik">${IKON[ik]}</span></span>
        <span class="notif-isi"><b>${judul}</b><span>${exp(x) || x.jenis === 'lama' || x.jenis === 'ditimpa' ? `<em>${x.n}</em> · ` : ''}${esc(x.tema)}</span></span>${kanan}</a>`;
    };
    const el = bukaPop(j, 'pop-notif', `
      <div class="pop-kepala"><b>Notifikasi</b></div>
      <div class="pop-daftar">${daftar.length ? daftar.map(baris).join('') : `<div class="pop-kosong"><span class="ik">${IKON.lonceng}</span></div>`}</div>`);
    if (!el) return;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Notifikasi');
    el.onclick = e => {
      const a = e.target.closest('[data-notif]');
      if (!a) return;
      B.tandaiBaca([a.dataset.notif]);
      const k = a.dataset.ke, tema = a.dataset.tema;
      if (k === 'basket') simpanan.tulis('sesi:profil-tema', tema);
      else if (k === 'history' || k === 'manual') { if (a.dataset.impor) saringImpor(k, a.dataset.impor); }
      else {
        browse.draft = k === 'draft';
        browse.approval = k === 'approval';
        simpanBrowse();
        if (k === 'approval') saringTema('browse-approval', KP.tema.key, tema);
      }
      if (location.hash === a.getAttribute('href')) { e.preventDefault(); tutupPop(); jalankan(); return; }
      gambarAkun();
    };
  }

  // bilah progres Basket -> Final HS -> Senior Review -> Approved -> SIRENA: titik + nama + tanggal; siapa / jam / nomor SRN di tooltip
  function htmlLangkah(L) {
    const titik = (x, i) => (x.keadaan === 'lewat' ? IKON.centang : x.keadaan === 'gagal' ? IKON.silang : x.keadaan === 'balik' ? IKON.urung : x.keadaan === 'kini' ? '<i></i>' : i + 1);
    return `<ol class="ap-langkah" aria-label="Progres">${L.map((x, i) => {
      const tip = [x.oleh ? B.namaOleh(x.oleh) : '', x.waktu ? waktuPenuh(x.waktu) : '', x.ket || ''].filter(Boolean).join('\n');
      return `<li class="${x.keadaan}"${tip ? ` title="${esc(tip)}"` : ''}${x.keadaan !== 'lewat' && x.keadaan !== 'nanti' ? ' aria-current="step"' : ''}><span class="ap-titik">${titik(x, i)}</span><span class="ap-langkah-l">${esc(x.label)}</span><span class="ap-langkah-k">${x.waktu ? tglPendek(x.waktu) : ''}</span></li>`;
    }).join('')}</ol>`;
  }

  // keputusan atas seluruh seri satu pengajuan (halaman Approval / detail): seri yang menunggu, atau yang di Basket untuk SIRENA
  function aksiAju(a, aksi, selesai) {
    const rows = a.seri.map(x => D.PER_KUNCI.get(x.kunci)).filter(Boolean);
    if (aksi === 'kirim') return kirimSeri(rows, selesai);
    putusSeri(aksi, rows, a.tema, selesai);
  }
  // Send to Approval (Browse mode Daftar Analisa: bar melayang; detail: tombol) = ajukan draft sendiri ke Analis 2, langsung tanpa popup.
  // Satu tema = satu pengajuan; Undo di toast membatalkan semuanya
  function ajukanSeri(rows, selesai) {
    const siap = rows.filter(r => { const s = B.status(r); return s && s.milikSaya && s.status === 'draft' && B.analisaLengkap(s); });
    if (!siap.length) return toast('galat', 'Tidak Bisa Mengirim', 'Pilih seri Draft yang isiannya lengkap.');
    const daftar = B.ajukan(siap, '');
    if (!daftar.length) return toast('galat', 'Tidak Bisa Mengirim', 'Peran Anda tidak bisa mengirim ke Approval.');
    gambarAkun();
    selesai(daftar);
    const n = daftar.reduce((x, a) => x + a.seri.length, 0);
    // pilihan di Daftar Analisa bisa berisi seri yang sudah dikirim / ditolak: dilewati
    const lewat = rows.length - siap.length;
    toast('ok', 'Terkirim ke Approval', `${n} seri` + (daftar.length > 1 ? ` · ${daftar.length} tema` : ' · ' + daftar[0].tema) + (lewat ? ` (${lewat} dilewati, bukan Draft / belum lengkap)` : ''), { teks: 'Undo', fn: () => {
      if (!daftar.map(a => B.urungkan(a.id)).every(Boolean)) toast('galat', 'Tidak Bisa Undo', 'Analis 2 sudah memproses pengajuan ini.');
      jalankan();
    } });
  }

  // ---------- tombol Back ----------
  // jejak halaman SKPK yang dibuka (per tab, tahan muat ulang). Back = halaman sebelumnya di jejak; tanpa jejak = halaman induk
  // (Basket untuk Detail / Approval / Data History, Browse untuk Basket dan Data Transaksional). Browse = home, tanpa induk.
  // Hash sama dengan entri kedua dari atas = pengguna mundur, jadi entri teratas dibuang.
  const BERANDA = '#/smart-pcc/browse-pib';
  const BASKET = '#/smart-pcc/penelitian-skpk';
  // halaman transit di Browse (revisi 6 Nov 2026): Data History dan SIRENA Manual, masing-masing dengan Import
  const HREF_HISTORY = '#/smart-pcc/browse-pib/data-history';
  const HREF_MANUAL = '#/smart-pcc/browse-pib/sirena-manual';
  let jejak = [];
  try { jejak = JSON.parse(sessionStorage.getItem('skpk-v2:jejak')) || []; } catch { /* abaikan */ }
  const simpanJejak = () => { try { sessionStorage.setItem('skpk-v2:jejak', JSON.stringify(jejak)); } catch { /* abaikan */ } };
  function catatJejak(h) {
    if (jejak.length > 1 && jejak[jejak.length - 2] === h) jejak.pop();
    else if (jejak[jejak.length - 1] !== h) jejak.push(h);
    jejak = jejak.slice(-50);
    simpanJejak();
  }
  // Approval mengganti hash tanpa router (pilih pengajuan): entri teratas ikut diganti
  function gantiJejak(h) { if (jejak.length) jejak[jejak.length - 1] = h; else jejak.push(h); simpanJejak(); }
  function namaHal(h) {
    const j = h.replace(/^#/, '');
    if (/\/transaksional\//.test(j)) return 'Data Transaksional';
    if (/\/detail-skpk\//.test(j)) return 'Detail';
    if (/\/data-history$/.test(j)) return 'Riwayat Penetapan';
    if (/\/sirena-manual$/.test(j)) return 'Import DNOA';
    if (/\/approval/.test(j)) return 'Approval';
    if (/penelitian-skpk$/.test(j)) return 'Basket Nominasi';
    return 'Browse';
  }
  // Analis 1 tidak membuka Basket: induk halaman detail = Browse
  // halaman Approval (pengajuan) ada di bawah Browse sejak 6 Nov 2026
  const indukHal = h => (/penelitian-skpk\/(?!approval)/.test(h) && B.boleh.basket() ? BASKET : h === BERANDA ? null : BERANDA);
  function tombolKembali() {
    const kini = location.hash;
    const ke = jejak.length > 1 && jejak[jejak.length - 1] === kini ? jejak[jejak.length - 2] : indukHal(kini);
    if (!ke) return '';
    const nama = 'Kembali ke ' + namaHal(ke);
    return `<a class="kp-btn kp-kembali" href="${esc(ke)}" title="${nama}" aria-label="${nama}"><span class="ik">${IKON.kembali}</span></a>`;
  }

  // ---------- bagian bersama ----------
  // keadaan halaman (saringan, urutan, halaman, centang) diingat peramban; saat situs dimuat ulang toast memberi tahu
  // apa yang dipulihkan, dengan tombol Bersihkan untuk mulai dari nol
  let muatPertama = true;
  function beritaPulih(ada, bersihkan) {
    if (muatPertama && ada) toast('info', 'Filter Dipulihkan', 'Filter, urutan, dan pilihan terakhir di halaman ini dipulihkan.', { teks: 'Reset', fn: bersihkan });
  }
  const lupakanTabel = id => simpanan.tulis('tabel:' + id, null);
  // saring satu tabel ke satu tema (sama persis) sebelum dibuka, mis. dari notifikasi; urutan dan ukuran halaman tetap
  const saringTema = (id, key, tema) => simpanan.tulis('tabel:' + id, { ...(simpanan.baca('tabel:' + id, null) || {}), saring: { [key]: '=' + tema }, hal: 1, pilih: [] });
  const STAT_LABEL = [
    ['Jumlah Entitas / NPWP', 'entitas', 'merah'], ['Jumlah Dokumen', 'pib', 'kuning'], ['Jumlah Seri Barang', 'seri', 'hijau'], ['Jumlah Kantor', 'kantor', 'biru'],
    ['HS Code Terbanyak', 'hs', 'merah'], ['Tarif Terbanyak', 'tarif', 'kuning'], ['Kode Fasilitas Terbanyak', 'skep', 'hijau'], ['Total Nilai Devisa', 'devisa', 'biru']
  ];
  function htmlStat(st) {
    const nilai = (k, v) => (v == null ? '-' : k === 'devisa' ? 'Rp. ' + Math.round(v).toLocaleString('id-ID') + (Math.round(v) === v ? '' : ',' + String(Math.round((v % 1) * 100)).padStart(2, '0')) : typeof v === 'number' && k !== 'tarif' ? v.toLocaleString('id-ID') : v);
    const kartu = ([lbl, k, w]) => `<div class="stat w-${w}${st ? '' : ' muat'}"><div class="lbl">${lbl}</div><div class="nil">${st ? esc(nilai(k, st[k])) : ''}</div><span class="chip"></span></div>`;
    return `${st ? '' : '<div class="memuat"><span class="bar"></span><span>Loading…</span></div>'}
      <div class="stat-grid">${STAT_LABEL.slice(0, 4).map(kartu).join('')}</div>
      <div class="stat-grid">${STAT_LABEL.slice(4).map(kartu).join('')}</div>`;
  }
  // tampilkan kerangka statistik sebentar seperti CEISA memuat infografis, lalu isi
  function isiStat(el, rows) {
    el.innerHTML = htmlStat(null);
    setTimeout(() => { if (el.isConnected) { el.innerHTML = htmlStat(D.statistik(rows)); el.classList.remove('segar'); void el.offsetWidth; el.classList.add('segar'); } }, 450);
  }

  const flagHtml = v => `<span class="flag ${v ? 'y' : 'n'}">${v ? 'Y' : 'N'}</span>`;
  const t = v => esc(v == null || v === '' ? '-' : v);

  // ---------- kolom ----------
  // Dua lapis kolom supaya jenis dokumen berbeda (BC 2.0, BC 3.0, ...) bisa disetarakan:
  // 1. kolom inti: nama umum yang sama untuk semua dokumen (Nama Perusahaan, Nomor Dokumen, Tarif, ...), dipetakan lewat peran
  //    (dokumen.js + data.js) ke kolom Excel tiap jenis, mis. Nama Perusahaan = Nm Imp (BC 2.0) / Nama Eksportir (BC 3.0);
  // 2. kolom khusus: nama dan isi persis seperti header Excel jenis dokumen itu (excel: ...), kosong untuk jenis lain.
  // Kolom buatan SKPK (flag, harga satuan, basket, dsb.) punya nama sendiri.
  const K = {
    uraian: { key: 'uraian', label: 'Uraian Barang', peran: 'uraian', saring: 'teks', lebar: 190 },
    tipe: { key: 'tipe', label: 'Tipe', peran: 'tipe', saring: 'teks', lebar: 140 },
    merk: { key: 'merk', label: 'Merek', peran: 'merk', saring: 'teks', lebar: 130 },
    hs: { key: 'hs', label: 'HS Code', peran: 'hs', saring: 'teks', lebar: 120 },
    hsSaran: { key: 'hsSaran', label: 'HS Rekomendasi', saring: 'teks', lebar: 120 },
    // tarif bea masuk (BC 2.0) dan bea keluar (BC 3.0) dalam satu kolom; jenisnya terbaca dari Kode Dokumen
    trfBm: { key: 'trfBm', label: 'Tarif', peran: 'tarif', saring: 'teks', lebar: 110 },
    trfSaran: { key: 'trfSaran', label: 'Tarif Rekomendasi', saring: 'teks', lebar: 130, isi: r => (r.trfSaran == null ? '-' : r.trfSaran + '%') },
    skep: { key: 'kodeFas', label: 'Kode Fasilitas', peran: 'fasilitas', saring: 'teks', lebar: 135 },
    perusahaan: { key: 'perusahaan', label: 'Nama Perusahaan', peran: 'pelaku', saring: 'teks', lebar: 190 },
    npwp: { key: 'npwp', label: 'NPWP Perusahaan', peran: 'npwp', saring: 'teks', lebar: 190 },
    kantor: { key: 'kantorKode', label: 'Kode Kantor', peran: 'kantor', saring: 'teks', lebar: 120 },
    noPib: { key: 'noPib', label: 'Nomor Dokumen', peran: 'nomor', saring: 'teks', lebar: 145 },
    dokumen: { key: 'dokumen', label: 'Kode Dokumen', inti: true, saring: 'teks', lebar: 135 },
    aju: { key: 'aju', label: 'No Aju', peran: 'aju', saring: 'teks', lebar: 200 },
    tglDaftar: { key: 'tglDaftar', label: 'Tanggal Dokumen', peran: 'tanggal', tipe: 'tanggal', saring: 'tanggal', lebar: 150 },
    seri: { key: 'seri', label: 'Seri Barang', peran: 'seri', saring: 'teks', lebar: 125 },
    satuan: { key: 'satuan', label: 'Satuan', peran: 'satuan', saring: 'teks', lebar: 100 },
    jmlSatuan: { key: 'jmlSatuan', label: 'Jumlah Satuan', peran: 'jumlah', saring: 'teks', lebar: 135 },
    negara: { key: 'negara', label: 'Negara', peran: 'negara', saring: 'teks', lebar: 100 },
    devisa: { key: 'devisa', label: 'Nilai Devisa', peran: 'nilai', saring: 'teks', lebar: 150 },
    jalur: { key: 'jalurKode', label: 'Jalur', peran: 'jalur', saring: 'teks', lebar: 100 },
    // kolom khusus BC 2.0
    waktuRekam: { key: 'waktuRekam', label: 'Tgl Aju', excel: 'Tgl Aju', dok: 'BC 2.0', tipe: 'tanggal', saring: 'tanggal', lebar: 110 },
    pemasok: { key: 'pemasok', label: 'Nm Pemasok', excel: 'Nm Pemasok', dok: 'BC 2.0', saring: 'teks', lebar: 200 },
    bmBayar: { key: 'bmBayar', label: 'Bmby', excel: 'Bmby', dok: 'BC 2.0', saring: 'teks', lebar: 130 }
  };
  // nama kolom Excel jenis dokumen aktif untuk kolom inti: ikut dicari di pemilih kolom (alias), tanpa ditampilkan
  for (const k of Object.values(K)) if (k.peran && D.PERAN[k.peran]) k.alias = D.PERAN[k.peran];
  // kelompok di pemilih kolom: General (kolom inti), jenis dokumen (kolom khusus), SKPK (kolom buatan SKPK)
  const GRUP_INTI = 'Umum';
  const grupDari = k => (k.peran || k.inti ? GRUP_INTI : k.dok || (k.excel ? D.DOK.label : 'SKPK'));
  const bergrup = ks => ks.map(k => ({ ...k, grup: grupDari(k) }));
  const flagKolom = (key, label, lebar = 170, ket) => ({ key: 'f_' + key, label, saring: 'pilih', lebar, opsi: ['Y', 'N'], nilai: r => (r.flag[key] ? 'Y' : 'N'),
    isi: r => (ket && r[ket] ? `<span title="${esc(r[ket])}">${flagHtml(r.flag[key])}</span>` : flagHtml(r.flag[key])) });
  const ketKolom = (key, label, lebar = 150) => ({ key, label, saring: 'teks', lebar, isi: r => `<span title="${esc(r[key] || '')}">${t(r[key] && r[key].length > 60 ? r[key].slice(0, 60) + '…' : r[key])}</span>` });
  // flag berisi teks (sumber perluasan, jenis penetapan, status basket); merah = perlu perhatian, hijau = milik sendiri
  const flagTeks = (teks, ket, warna = 'y') => (teks ? `<span class="flag ${warna}" title="${esc(ket || '')}">${esc(teks)}</span>` : flagHtml(false));

  // kolom tambahan Browse (catatan rapat no. 3, 4; slide 1), dibuat ringkas
  const KB = {
    kantor: K.kantor, noPib: K.noPib, tgl: K.tglDaftar, seri: K.seri, fas: K.skep, uraian: { ...K.uraian, lebar: 200 },
    harga: { key: 'hargaSatuan', label: 'Harga Satuan', tipe: 'angka', saring: 'teks', lebar: 160, nilai: r => (r.hargaSatuan == null ? null : Math.round(r.hargaSatuan)),
      isi: r => (r.hargaSatuan == null ? '-' : rupiah(r.hargaSatuan) + ' / ' + esc(r.satuan || '')) },
    reInk: flagKolom('inkonsistensi', 'Flag RE Inkonsistensi', 150, 'ketInkonsistensi'),
    rePerluasan: { key: 'f_perluasan', label: 'Flag RE Perluasan', saring: 'pilih', lebar: 150, nilai: r => (r.perluasan.length ? r.perluasan.join(', ') : 'N'),
      isi: r => flagTeks(r.perluasan.join(', '), r.ketPerluasan) },
    reSka: flagKolom('ska', 'Flag RE SKA', 130, 'ketSka'),
    penetapan: { key: 'f_penetapan', label: 'Flag Penetapan Seri', saring: 'pilih', lebar: 160, nilai: r => (r.penetapan.length ? jenisPenetapan(r) : 'N'),
      isi: r => flagTeks(jenisPenetapan(r), r.penetapanTeks) },
    basket: { key: 'basket', label: 'Status', saring: 'teks', lebar: 230, nilai: r => B.label(B.status(r)),
      isi: r => { const s = B.status(r); return s ? flagTeks(B.label(s), 'Tema: ' + s.tema, s.milikSaya ? 'n' : 'y') : '-'; } }
  };
  const jenisPenetapan = r => Array.from(new Set(r.penetapan.map(p => p.jenis))).join(', ');

  // kolom basket di Basket
  const isian = r => B.status(r) || {};
  // saringan status Basket (6 Nov 2026: Basket hanya berisi seri yang sudah di-Approve): Basket / SIRENA / Expired; [kunci, nama, warna titik]
  const STATUS_SERI = [['basket', 'Basket Nominasi', 'hijau'], ['sirena', 'SIRENA', 'biru'], ['expired', 'Kedaluwarsa', 'merah']];
  const SEMUA_STATUS = () => Object.fromEntries(STATUS_SERI.map(([k]) => [k, true]));
  const statusSeri = r => { const w = B.warna(r); return w === 'merah' ? 'expired' : isian(r).status === 'sirena' ? 'sirena' : 'basket'; };
  const kelasWarna = r => { const w = B.warna(r); return w ? 'st-' + w : ''; };
  // kolom Status: nama tahap saja, berwarna; catatan / tanggal kirim di tooltip, tautan ke pengajuannya di Approval (hanya pemegang Basket)
  function namaStatus(s) {
    const t = B.tahapSeri(s);
    return !t ? null : t === 'draft' && s.kembali ? 'Dikembalikan' : B.NAMA_TAHAP[t];
  }
  function teksStatus(s) {
    const t = B.tahapSeri(s);
    if (!t) return '-';
    const kembali = t === 'draft' && s.kembali;
    const nada = kembali ? 'balik' : t === 'sirena' ? 'kirim' : t === 'draft' ? 'awal' : '';
    const ket = s.sirena && t === 'sirena' ? s.sirena.nomor + ' · ' + tgl(s.sirena.waktu) : kembali ? s.kembali.catatan : '';
    const isi = `<span class="st-teks ${nada}"${ket ? ` title="${esc(ket)}"` : ''}>${esc(namaStatus(s))}</span>`;
    const id = s.pengajuan || (s.kembali && s.kembali.id);
    return id && s.unit && B.boleh.basket() ? `<a class="mt-link" href="${hrefAju(id)}">${isi}</a>` : isi;
  }
  // hasil analisa (Browse) satu seri: HS penetapan, tarif akhir, pungutan lain. Analis 1 tidak melihat analisa draft analis lain.
  // Di Daftar Analisa, seri yang di-Reject menampilkan analisa yang dulu diajukan (dari jejak pengajuan)
  // jejak Reject milik pengguna aktif; hanya berisi selama tabel Daftar Analisa yang dihitung (dasarBrowse), kosong di Browse biasa
  let tolakKerja = new Map();
  const tolakR = r => (!B.status(r) && tolakKerja.get(r.kunci)) || null;
  const anTampil = r => B.analisaTampil(r) || (tolakR(r) || {}).isi || null;
  const an = r => anTampil(r) || {};
  const pot = r => { const a = anTampil(r); return a ? B.potensi(r, a) : null; };
  const KP = {
    hsTetap: { key: 'hsTetap', label: 'HS Penetapan', saring: 'teks', lebar: 120, nilai: r => an(r).hs || null, isi: r => t(an(r).hs) },
    trfTetap: { key: 'trfTetap', label: 'Tarif BM Penetapan', tipe: 'angka', saring: 'teks', lebar: 140, nilai: r => an(r).bm ?? null, isi: r => (an(r).bm == null ? '-' : an(r).bm + '%') + (an(r).lain && an(r).lain.length ? ` <span class="ada-tip" title="${esc(an(r).lain.map(x => x.jenis + ' ' + x.tarif + '%').join(', '))}">+${an(r).lain.length}</span>` : '') },
    ppnTetap: { key: 'ppnTetap', label: 'Tarif PPN Penetapan', tipe: 'angka', saring: 'teks', lebar: 140, nilai: r => an(r).ppn ?? null, isi: r => (an(r).ppn == null ? '-' : an(r).ppn + '%') },
    pphTetap: { key: 'pphTetap', label: 'Tarif PPh Penetapan', tipe: 'angka', saring: 'teks', lebar: 140, nilai: r => an(r).pph ?? null, isi: r => (an(r).pph == null ? '-' : an(r).pph + '%') },
    potensi: { key: 'potensi', label: 'Potensi', tipe: 'angka', saring: 'teks', lebar: 150, nilai: r => { const p = pot(r); return p ? Math.round(p.selisih.total) : null; },
      isi: r => { const p = pot(r); return p ? `<span title="${esc(`BM ${rupiah(p.selisih.bm)}, PPN ${rupiah(p.selisih.ppn)}, PPh ${rupiah(p.selisih.pph)}`)}">${rupiah(p.selisih.total)}</span>` : '-'; } },
    tema: { key: 'temaBasket', label: 'Tema', saring: 'teks', lebar: 190, nilai: r => isian(r).tema, isi: r => t(isian(r).tema) },
    jenis: { key: 'jenisTema', label: 'Jenis Tema', saring: 'teks', lebar: 190, nilai: r => isian(r).jenis || null, isi: r => t(isian(r).jenis) },
    catatan: { key: 'catatanBasket', label: 'Alasan', saring: 'teks', lebar: 170, nilai: r => isian(r).catatan || null,
      isi: r => { const c = isian(r).catatan; return `<span title="${esc(c || '')}">${t(c && c.length > 60 ? c.slice(0, 60) + '…' : c)}</span>`; } },
    status: { key: 'statusBasket', label: 'Status', saring: 'teks', lebar: 190, nilai: r => namaStatus(isian(r)), isi: r => teksStatus(isian(r)) },
    // Daftar Analisa: tema dan status juga untuk seri yang di-Reject (Rejected, catatan Analis 2 di tooltip)
    temaKerja: { key: 'temaKerja', label: 'Tema', saring: 'teks', lebar: 190, nilai: r => isian(r).tema || (tolakR(r) || {}).tema || null,
      isi: r => t(isian(r).tema || (tolakR(r) || {}).tema) },
    statusKerja: { key: 'statusKerja', label: 'Status', saring: 'teks', lebar: 150, nilai: r => (tolakR(r) ? 'Ditolak' : namaStatus(isian(r))),
      isi: r => { const x = tolakR(r); return x ? `<span class="st-teks gagal" title="${esc(x.catatan + ' · ' + B.namaOleh(x.oleh) + ', ' + tgl(x.waktu))}">Ditolak</span>` : teksStatus(isian(r)); } },
    // pengusul (Analis 1 pemilik draft / pengajuan)
    analis: { key: 'analisBasket', label: 'Analis', saring: 'teks', lebar: 130, nilai: r => (isian(r).oleh ? B.namaOleh(isian(r).oleh) : null), isi: r => t(isian(r).oleh ? B.namaOleh(isian(r).oleh) : '') },
    // sisa hari sampai lewat 2 tahun sejak tanggal dokumen (merah <= 30 hari); tidak berlaku lagi setelah SIRENA
    sisa: { key: 'sisaHari', label: 'Sisa Hari', tipe: 'angka', saring: 'teks', lebar: 105, nilai: r => (isian(r).status === 'sirena' ? null : B.sisaHari(r)),
      isi: r => { const n = isian(r).status === 'sirena' ? null : B.sisaHari(r); return n == null ? '-' : n < 0 ? '<span class="hari-merah">Kedaluwarsa</span>' : `<span class="${n <= B.HARI_PERINGATAN ? 'hari-merah' : ''}">${n}</span>`; } },
    // umur di Basket = hari sejak di-Approve (merah >= 30 hari, sama dengan notifikasi)
    umurBasket: { key: 'umurBasket', label: 'Umur Basket Nominasi', tipe: 'angka', saring: 'teks', lebar: 115, nilai: r => B.umurBasket(r),
      isi: r => { const n = B.umurBasket(r); return n == null ? '-' : `<span class="${n >= B.HARI_BASKET ? 'hari-merah' : ''}">${n}</span>`; } }
  };
  // kolom data non-PIB yang variasinya sedikit: drop list nilai di menu kolom dan Advance Filter (rapat 6 Nov 2026)
  for (const k of [KB.basket, KP.tema, KP.jenis, KP.status, KP.temaKerja, KP.statusKerja, KP.analis]) k.daftar = true;

  // Nama Perusahaan dan NPWP Perusahaan langsung setelah delapan kolom urutan rapat (Excel 3), supaya terlihat tanpa menggeser jauh
  // hasil analisa (HS Penetapan, Tarif Penetapan, Potensi) langsung setelah HS Code dan Tarif pemberitahuan (analisa di Browse, 5 Nov 2026)
  const KOLOM_BAWAAN_BROWSE = [KB.kantor, KB.noPib, KB.tgl, KB.seri, KB.fas, KB.uraian, KB.harga, K.jalur, K.perusahaan, K.npwp,
    K.tipe, K.merk, K.hs, K.trfBm, KP.hsTetap, KP.trfTetap, KP.potensi, K.aju, K.pemasok, K.satuan, K.jmlSatuan, K.bmBayar, K.negara, K.devisa, KB.reInk, KB.rePerluasan, KB.reSka, KB.penetapan, KB.basket];

  // ---------- semua kolom data sumber jenis dokumen aktif + kolom tambahan SKPK ----------
  // Kolom Excel yang sudah terwakili kolom inti / kolom khusus tidak muncul dua kali; sisanya tampil dengan nama Excel, tersembunyi
  // sampai dipilih. Kolom inti tanpa padanan di jenis aktif (mis. Kode Fasilitas di BC 3.0) dan kolom khusus jenis lain tidak dipakai.
  const LABEL_SUMBER = new Set(root.SKPK_SUMBER.kolom.map(c => c.label));
  const excelDari = k => (k.peran ? D.PERAN[k.peran] : k.excel) || null;
  const adaDiSumber = k => (!k.peran && !k.excel) || LABEL_SUMBER.has(excelDari(k));
  function kolomPib({ label, tipe }) {
    const key = 'pib_' + label.toLowerCase().replace(/\W+/g, '_');
    const dasar = { key, label, excel: label };
    return { ...dasar, tipe: tipe === 'angka' ? 'angka' : tipe === 'tanggal' ? 'tanggal' : 'teks', lebar: label === 'Ur Audit' ? 240 : tipe === 'angka' ? 120 : 140, nilai: r => r.m[label] };
  }
  // tipe kolom (operator Advance Filter, perataan) dari isi data bila tidak ditentukan
  function tipeDari(k) {
    if (k.tipe) return k.tipe;
    const v = D.ROWS.slice(0, 400).map(r => (k.nilai ? k.nilai(r) : r[k.key])).filter(x => x != null && x !== '' && x !== '-');
    return v.length && v.every(x => typeof x === 'number') ? 'angka' : v.length && v.every(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x)) ? 'tanggal' : 'teks';
  }
  const KOLOM_BAWAAN_BROWSE_AKTIF = KOLOM_BAWAAN_BROWSE.filter(adaDiSumber);
  const TERWAKILI = new Set(KOLOM_BAWAAN_BROWSE_AKTIF.map(excelDari).filter(Boolean));
  const KOLOM_BROWSE = bergrup(KOLOM_BAWAAN_BROWSE_AKTIF.concat([K.dokumen], root.SKPK_SUMBER.kolom.filter(c => !TERWAKILI.has(c.label)).map(kolomPib)));
  KOLOM_BROWSE.forEach(k => { k.tipe = tipeDari(k); });
  // Daftar Analisa: Tema Analisis dan Status (Draft / Returned / Analis 2 Review / Approved / SIRENA / Rejected, catatan di tooltip)
  // paling kiri; Status Basket tidak perlu
  const KOLOM_DRAFT = bergrup([KP.temaKerja, KP.statusKerja]).map(k => ({ ...k, tipe: 'teks' })).concat(bergrup([KP.sisa]), KOLOM_BROWSE.filter(k => k.key !== KB.basket.key));
  const BAWAAN_DRAFT = [KP.temaKerja.key, KP.statusKerja.key, KP.sisa.key].concat(KOLOM_BAWAAN_BROWSE_AKTIF.map(k => k.key).filter(k => k !== KB.basket.key));
  // Approval (Analis 2 / Admin, rapat 6 Nov 2026): Tema, Analis pengusul, Sisa Hari paling kiri; hasil analisa ikut kolom Browse
  const KOLOM_APPROVAL = bergrup([KP.tema, KP.analis]).map(k => ({ ...k, tipe: 'teks' })).concat(bergrup([KP.sisa]), KOLOM_BROWSE.filter(k => k.key !== KB.basket.key));
  const BAWAAN_APPROVAL = [KP.tema.key, KP.analis.key, KP.sisa.key].concat(KOLOM_BAWAAN_BROWSE_AKTIF.map(k => k.key).filter(k => k !== KB.basket.key));
  const PER_KOLOM_BROWSE = new Map(KOLOM_BROWSE.map(k => [k.key, k]));
  const JML_BAWAAN_BROWSE = KOLOM_BAWAAN_BROWSE_AKTIF.length;
  // Basket tampil ringkas: perusahaan, barang, dokumen, kantor, tanggal, status, HS dan tarif pemberitahuan vs penetapan; sisanya lewat Columns.
  // Basket bisa berisi beberapa jenis dokumen: kolom khusus tetap tersedia (kelompok per jenis di Columns), kosong untuk jenis lain
  // lebar secukupnya supaya nama kolom tidak terpotong
  const LEBAR_BASKET = { temaBasket: 170, perusahaan: 150, uraian: 160, dokumen: 135, noPib: 145, kantorKode: 120, tglDaftar: 150, statusBasket: 110, hs: 95, trfBm: 75, hsTetap: 125, trfTetap: 135 };
  // Tema Analisis paling kiri supaya tiap seri jelas masuk tema apa; lalu dokumen (Kode Kantor, Nomor, Tanggal, Seri), barang,
  // hasil analisa dari Browse, dan Status paling belakang (komentar pengguna 4 Nov 2026)
  // Analis (pengusul) setelah Tema: Basket berisi kiriman banyak Analis 1 (5 Nov 2026)
  // Sisa Hari dan Umur Basket sebelum Status (rapat 6 Nov 2026)
  const KOLOM_BAWAAN_PROFIL = [KP.tema, KP.analis, K.kantor, K.noPib, K.tglDaftar, K.seri, K.uraian, K.perusahaan, K.hs, K.trfBm, KP.hsTetap, KP.trfTetap, KP.potensi, KP.sisa, KP.umurBasket, KP.status];
  // Flag RE (Inkonsistensi, Perluasan, SKA) dipindah ke Browse (slide 1c)
  const KOLOM_PROFIL = [KP.tema, KP.analis, K.uraian, K.tipe, K.merk, K.hs, K.hsSaran, K.trfBm, K.trfSaran, KP.hsTetap, KP.trfTetap, KP.ppnTetap, KP.pphTetap, KP.potensi, KP.sisa, KP.umurBasket, KP.status, K.skep, K.perusahaan, K.npwp, K.kantor, K.noPib,
    K.dokumen, K.aju, K.tglDaftar, K.waktuRekam, K.pemasok, K.seri, K.jmlSatuan, K.satuan, K.bmBayar, K.negara, K.devisa, K.jalur,
    KP.jenis, KP.catatan,
    { key: 'umur', label: 'Umur Dokumen', saring: 'teks', lebar: 130, isi: r => (r.umur == null ? '-' : r.umur + ' hari') },
    flagKolom('p2', 'Flag P2', 140), flagKolom('analisis', 'Flag Analisis', 140), flagKolom('reassessment', 'Flag RE Nilai Pabean', 170),
    ketKolom('ketDnda', 'Ket. DNDA', 130), flagKolom('multi', 'Flag Multiparameter'), ketKolom('ketAudit', 'Ket. Periode Audit'),
    ketKolom('ketPenul', 'Ket. Penul'), ketKolom('ketNotul', 'Ket. Notul', 130)].map(k => ({ ...k, lebar: LEBAR_BASKET[k.key] || k.lebar, grup: grupDari(k) }));

  // ================= Browse Data PIB =================
  // ---------- Advance Filter (meniru Advanced filter To-Be) ----------
  // Tiap baris kondisi = satu kolom (semua kolom PIB + tambahan), operator sesuai tipe kolom, nilai kedua untuk "di antara".
  // DAN dihitung lebih dulu daripada ATAU. Teks: * = karakter apa saja, ? = satu karakter; huruf besar/kecil diabaikan.
  // Regex = tombol ikon per kondisi di luar kotak isian (5 Nov 2026), hanya untuk kolom teks: regex membaca teks, sedangkan angka dan
  // tanggal sudah punya operator sendiri (>, between, before / after) dan isi mentahnya berbeda dari yang tampil. Operator tetap berlaku
  // sehingga user cukup menulis inti pola (contains = di mana saja, equals = ^(...)$, begins / ends with = ^(...) / (...)$, "does not" =
  // kebalikannya; pembalikan sulit ditulis sebagai regex murni). Pola tidak sah = kotak nilai dan tombol merah.
  const OP = {
    teks: { mengandung: 'berisi', tidakMengandung: 'tidak berisi', sama: 'sama dengan', tidakSama: 'tidak sama dengan', awal: 'diawali', tidakAwal: 'tidak diawali',
      akhir: 'diakhiri', tidakAkhir: 'tidak diakhiri', kosong: 'kosong', isi: 'tidak kosong' },
    // operator angka tetap simbol (keputusan pengguna 7 Nov 2026, Daftar Istilah no. 243)
    angka: { sama: '=', tidakSama: '≠', lebih: '>', lebihSama: '≥', kurang: '<', kurangSama: '≤', antara: 'between', kosong: 'kosong', isi: 'tidak kosong' },
    tanggal: { sama: 'pada', tidakSama: 'bukan pada', sebelum: 'sebelum', sesudah: 'sesudah', antara: 'antara', kosong: 'kosong', isi: 'tidak kosong' }
  };
  // nilai DAN/ATAU disimpan dan tampil apa adanya
  const GABUNG = { DAN: 'DAN', ATAU: 'ATAU' };
  const OP_AWAL = { teks: 'mengandung', angka: 'lebih', tanggal: 'sesudah' };
  const TANPA_NILAI = new Set(['kosong', 'isi']);
  const kondisiBaru = (kolom = 'uraian', gabung = 'DAN') => ({ kolom, op: OP_AWAL[(PER_KOLOM_BROWSE.get(kolom) || {}).tipe || 'teks'], v1: '', v2: '', gabung });
  // pola regex dari nilai + operator; galat bila regex tidak sah
  const MODE_TEKS = { sama: 'penuh', tidakSama: 'penuh', awal: 'awal', tidakAwal: 'awal', akhir: 'akhir', tidakAkhir: 'akhir' };
  const polaRegex = (v, op) => {
    const m = MODE_TEKS[op] || 'bebas';
    return new RegExp(m === 'penuh' ? '^(?:' + v + ')$' : m === 'awal' ? '^(?:' + v + ')' : m === 'akhir' ? '(?:' + v + ')$' : v, 'i');
  };
  const regexSah = v => { try { new RegExp(v); return true; } catch { return false; } };

  // kolom Advance Filter yang punya drop list nilai: daftar: true, atau teks dengan <= batas nilai unik (diperiksa sekali per kolom)
  const daftarAf = new Map();
  function punyaDaftarAf(k) {
    if (k.daftar != null) return !!k.daftar;
    if (!daftarAf.has(k.key)) daftarAf.set(k.key, root.nilaiUnikSkpk(D.ROWS, r => (k.nilai ? k.nilai(r) : r[k.key]), root.BATAS_DAFTAR_SKPK) != null);
    return daftarAf.get(k.key);
  }
  // Advance Filter dan checkbox flag RE diingat peramban (sesi:browse2); tabelnya mengingat sendiri (tabel:browse)
  // bersih = cleansing: { notul, penul, audit, expired, basket, sirena } yang dicentang disembunyikan dari Browse
  const awalBrowse = () => ({ baris: [kondisiBaru()], aktif: null, re: { semua: true, inkonsistensi: false, perluasan: false, ska: false }, bersih: {} });
  const kondisiSah = b => Array.isArray(b) && b.length > 0 && b.every(c => c && PER_KOLOM_BROWSE.has(c.kolom) && OP[PER_KOLOM_BROWSE.get(c.kolom).tipe][c.op] && 'v1' in c);
  const tersimpan = simpanan.baca('sesi:browse2', {});
  // sesi lama: operator "matches regex" -> contains + regex; sakelar Regex global -> regex di tiap kondisi
  const rxLama = (b, global) => { if (Array.isArray(b)) for (const c of b) if (c) { if (c.op === 'regex') Object.assign(c, { op: 'mengandung', regex: true }); else if (global) c.regex = true; } };
  rxLama(tersimpan.baris, tersimpan.regex);
  if (tersimpan.aktif) rxLama(tersimpan.aktif.baris, tersimpan.aktif.regex);
  delete tersimpan.regex;
  const browse = Object.assign(awalBrowse(), tersimpan);
  if (!kondisiSah(browse.baris)) browse.baris = [kondisiBaru()];
  if (browse.aktif && !kondisiSah(browse.aktif.baris)) browse.aktif = null;
  // sesi lama: bersih = true / false (hanya seri yang sudah ditetapkan)
  if (!browse.bersih || typeof browse.bersih !== 'object') browse.bersih = browse.bersih === true ? { notul: true, penul: true, audit: true } : {};
  const simpanBrowse = () => simpanan.tulis('sesi:browse2', browse);
  const aturBrowse = k => { const re = browse.re; Object.assign(browse, k); Object.assign(re, k.re); browse.re = re; simpanBrowse(); };

  const polaWildcard = (p, mode) => {
    const inti = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(mode === 'penuh' ? '^' + inti + '$' : mode === 'awal' ? '^' + inti : mode === 'akhir' ? inti + '$' : inti, 'i');
  };
  const keAngka = root.keAngkaSkpk;
  // baris kondisi -> kondisi siap uji; baris tanpa nilai dilewati, ketat = galat bila nilainya tidak terbaca
  function siapkanKondisi(baris, ketat) {
    const out = [];
    for (let i = 0; i < baris.length; i++) {
      const c = baris[i];
      const k = PER_KOLOM_BROWSE.get(c.kolom);
      if (!k) continue;
      const j = k.tipe;
      const tanpa = TANPA_NILAI.has(c.op);
      const v1 = String(c.v1 || '').trim(), v2 = String(c.v2 || '').trim();
      if (!tanpa && !v1 && !v2) continue;
      const x = { k, op: c.op, gabung: out.length ? c.gabung : 'DAN', v1, v2, regex: j === 'teks' && !!c.regex };
      if (!tanpa) {
        const baca = v => (j === 'angka' ? keAngka(v) : j === 'tanggal' ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null) : v || null);
        x.a = baca(v1);
        x.b = c.op === 'antara' ? baca(v2) : null;
        if (x.a == null || (c.op === 'antara' && x.b == null)) {
          if (ketat) return { galat: `Isi ${j === 'angka' ? 'angka' : j === 'tanggal' ? 'tanggal' : 'nilai'} untuk kondisi ${i + 1} (${k.label}).` };
          continue;
        }
        // teks: satu nilai per baris (daftar tempelan / centang drop list) = salah satu cocok; operator berlaku untuk tiap nilai
        // ("does not ..." = tidak cocok dengan satupun). Angka berpemisah (NPWP) juga dicocokkan per digit, apa pun pemisahnya
        if (j === 'teks') {
          const mode = MODE_TEKS[c.op] || 'bebas';
          try {
            x.uji = root.pisahDaftarSkpk(v1).map(v => {
              if (x.regex) { const re = polaRegex(v, c.op); return s => re.test(s); }
              const re = polaWildcard(v, mode), d = root.digitSajaSkpk(v), reD = d ? polaWildcard(d, mode) : null;
              return s => re.test(s) || (!!reD && reD.test(s.replace(/\D/g, '')));
            });
          } catch { if (ketat) return { galat: `Regex tidak valid di kondisi ${i + 1} (${k.label}).` }; continue; }
        }
      }
      out.push(x);
    }
    return { kondisi: out };
  }
  function ujiKondisi(r, c) {
    const v = c.k.nilai ? c.k.nilai(r) : r[c.k.key];
    const kosong = v == null || v === '' || v === '-';
    if (c.op === 'kosong') return kosong;
    if (c.op === 'isi') return !kosong;
    if (c.k.tipe === 'teks') {
      const s = kosong ? '' : String(v);
      const cocok = c.uji.some(f => f(s));
      return /^tidak/.test(c.op) ? !cocok : cocok;
    }
    if (kosong) return c.op === 'tidakSama';
    const x = c.k.tipe === 'angka' ? (typeof v === 'number' ? v : keAngka(v)) : String(v).slice(0, 10);
    if (x == null) return c.op === 'tidakSama';
    const a = c.a, b = c.b;
    switch (c.op) {
      case 'sama': return x === a;
      case 'tidakSama': return x !== a;
      case 'lebih': case 'sesudah': return x > a;
      case 'lebihSama': return x >= a;
      case 'kurang': case 'sebelum': return x < a;
      case 'kurangSama': return x <= a;
      case 'antara': return a <= b ? x >= a && x <= b : x >= b && x <= a;
    }
    return true;
  }
  // DAN didahulukan: kondisi dipotong menjadi kelompok di tiap ATAU, baris lolos bila salah satu kelompok lolos semua
  function saringKondisi(rows, kondisi) {
    if (!kondisi.length) return rows;
    const grup = [[]];
    for (const c of kondisi) { if (c.gabung === 'ATAU' && grup[grup.length - 1].length) grup.push([]); grup[grup.length - 1].push(c); }
    return rows.filter(r => grup.some(g => g.every(c => ujiKondisi(r, c))));
  }

  // chip flag RE di atas tabel (slide 1f): All = semua baris; chip flag = hanya baris ber-flag itu (beberapa chip = salah satunya).
  // Tiap chip memuat jumlah baris (setelah Advance Filter); nama lengkap di tooltip
  // satu ikon bendera di kanan kepala tabel (seperti Cleansing): dropdown bercentang; tanpa centang = semua baris (semua: true)
  const RE = [['inkonsistensi', 'Inkonsistensi', 'merah'], ['perluasan', 'Perluasan', 'kuning'], ['ska', 'SKA', 'ungu']];
  const FLAG_RE = RE.map(([k]) => k);
  const pilihRe = browse.re;
  if (!pilihRe.semua && !FLAG_RE.some(k => pilihRe[k])) pilihRe.semua = true;
  if (pilihRe.semua) for (const k of FLAG_RE) pilihRe[k] = false;
  const lolosRe = r => pilihRe.semua || FLAG_RE.some(k => pilihRe[k] && r.flag[k]);
  // cleansing: baris yang masuk salah satu kategori tercentang disembunyikan. Warna titik = warna baris (B.warna)
  const BERSIH = [
    ['notul', 'Notul', 'SPTNP', 'abu'], ['penul', 'Penul', 'SPKTNP', 'abu'], ['audit', 'Audit', 'LHA', 'abu'],
    ['expired', 'Kedaluwarsa', 'Lewat 2 tahun dari tanggal dokumen', 'merah'], ['basket', 'Basket Nominasi', 'Sudah disetujui, belum dikirim ke SIRENA', 'kuning'], ['sirena', 'SIRENA', 'Sudah dikirim ke SIRENA', 'hijau']
  ];
  const NAMA_BERSIH = Object.fromEntries(BERSIH.map(([k, l]) => [k, l]));
  function kenaBersih(r, k) {
    if (k === 'expired') return B.kadaluarsa(r);
    if (k === 'basket' || k === 'sirena') { const s = B.status(r); return !!s && (s.status === 'sirena') === (k === 'sirena'); }
    return B.sumberTetap(r).includes(k);
  }
  const bersihAktif = () => BERSIH.map(([k]) => k).filter(k => browse.bersih[k]);
  // lihatBersih: null = biasa; kategori = hanya baris yang dibuang kategori itu; 'semua' = semua yang dibuang (tidak diingat)
  let lihatBersih = null;
  function lolosBersih(r) {
    if (lihatBersih) {
      const ks = lihatBersih === 'semua' ? bersihAktif() : [lihatBersih];
      return ks.some(k => kenaBersih(r, k));
    }
    return !bersihAktif().some(k => kenaBersih(r, k));
  }
  // mode Daftar Analisa (Analis 1 / Admin) = workspace analis: semua seri yang pernah ia analisa (Admin: semua analis), apa pun tahapnya
  // (Draft, Returned, Analis 2 Review, Approved, SIRENA), ditambah seri pengajuannya yang di-Reject Analis 2 (hanya baca, selama belum
  // diambil analis lain). Yang bisa diubah / dikirim / dilepas hanya Draft dan Returned. Cleansing dan Flag RE tidak berlaku,
  // Advance Filter tetap. Diingat di sesi:browse2 (draft), tidak ikut Reset
  const modeDraft = () => B.boleh.ajukan() && !!browse.draft;
  // mode Approval (Analis 2 / Admin) = tahap transit sebelum Basket: seri kiriman semua Analis 1 yang menunggu keputusan.
  // Approve (masuk Basket, final), Return, Reject per seri / terpilih / satu tema (saring kolom Tema lalu pilih semua)
  const modeApproval = () => B.boleh.tinjau() && !!browse.approval && !modeDraft();
  const diKerjaSaya = r => { const s = B.status(r); return s ? s.unit && s.milikSaya && !s.manual : tolakKerja.has(r.kunci); };
  const dasarBrowse = () => {
    if (modeApproval()) { tolakKerja = new Map(); return D.ROWS.filter(bisaPutus); }
    if (!modeDraft()) { tolakKerja = new Map(); return D.ROWS.filter(r => lolosBersih(r) && lolosRe(r)); }
    tolakKerja = B.ditolakSaya();
    return D.ROWS.filter(diKerjaSaya);
  };

  function dataBrowse() {
    const rows = dasarBrowse();
    return browse.aktif ? saringKondisi(rows, siapkanKondisi(browse.aktif.baris, false).kondisi) : rows;
  }

  // export Excel dari kolom tampil (catatan rapat no. 11)
  function unduhXlsx(nama, kolom, rows, judul) {
    const E = root.SkpkEkspor;
    const kols = kolom.map((k, i) => {
      const contoh = rows.map(r => (k.nilai ? k.nilai(r) : r[k.key])).find(v => v != null);
      return { key: 'c' + i, label: k.label, tipe: k.tipe === 'tanggal' || /^tgl|tanggal|waktu/i.test(k.key) ? 'tanggal' : typeof contoh === 'number' && !/seri/i.test(k.key) ? 'angka' : 'teks', lebar: k.lebar };
    });
    const isi = rows.map(r => Object.fromEntries(kolom.map((k, i) => [kols[i].key, k.nilai ? k.nilai(r) : r[k.key]])));
    E.unduh(E.xlsx(kols, isi, { sheet: judul, namaMeta: 'Keterangan', meta: [['Sumber', 'SKPK v2 - ' + judul], ['Jumlah baris', rows.length], ['Waktu export', new Date().toLocaleString('id-ID')]] }), nama, E.TIPE.xlsx);
  }

  // jenis dokumen: dropdown seperti To-Be; jenis yang datanya belum ada memberi toast dan pilihan kembali.
  // BC 2.3 tidak dipakai; PPFTZ-01 TLDDP belum ada di mesin (dokumen.js salinan To-Be), namanya dari sini
  const JENIS_DOK = ['bc20', 'bc25', 'bc28', 'bc30', 'ppftz01'];
  const DOK_TAMBAHAN = { ppftz01: { label: 'PPFTZ-01 TLDDP', nama: 'Pemberitahuan Pabean FTZ: pengeluaran ke Tempat Lain Dalam Daerah Pabean' } };
  function pilihDokumen() {
    const S = root.SKPK_DOKUMEN;
    if (!S) return '';
    return `<select class="sel pilih-dok" id="pilihDok" aria-label="Jenis Dokumen">${JENIS_DOK.map(k => {
      const d = S.SEMUA.find(x => x.kode === k) || DOK_TAMBAHAN[k] || { label: k, nama: '' };
      return `<option value="${k}"${k === S.AKTIF ? ' selected' : ''}${S.ADA.includes(k) ? '' : ' data-kosong="1"'} title="${esc(d.nama)}">${esc(d.label)}</option>`;
    }).join('')}</select>`;
  }
  // bagian yang bisa dilipat (mini dashboard, Advance Filter); keadaannya diingat peramban
  const lipat = simpanan.baca('lipat', {});
  // bagian yang bisa dilipat diberi caret tipis di kiri (seperti collapse di Word); terlipat = tinggal garis tipis dengan caret
  const lipBlok = (k, judul, isi) => `<div class="lip${lipat[k] ? ' tutup' : ''}"><button class="lip-caret" data-lipat="${k}" aria-controls="lip-${k}" aria-expanded="${!lipat[k]}" title="${judul}" aria-label="${judul}">${IKON.turun}</button>
    <div class="lipatan${lipat[k] ? ' tutup' : ''}" id="lip-${k}"><div>${isi}</div></div></div>`;
  function pasangLipat(el) {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-lipat]');
      if (!b) return;
      const k = b.dataset.lipat, tutup = !lipat[k];
      lipat[k] = tutup;
      simpanan.tulis('lipat', lipat);
      b.setAttribute('aria-expanded', String(!tutup));
      $('#lip-' + k).classList.toggle('tutup', tutup);
      b.parentNode.classList.toggle('tutup', tutup);
    });
  }

  // bar melayang di tengah bawah layar selama ada baris tercentang: jumlah, tombol aksi, batalkan pilihan (#btnBatalPilih)
  const htmlBarPilih = tombol => `<div class="bar-pilih" id="barPilih" role="toolbar" aria-label="Pilihan" hidden>
      <span class="bar-pilih-n"></span>${tombol}
      <button class="bar-pilih-x" id="btnBatalPilih" title="Batal Pilih" aria-label="Batal Pilih">×</button></div>`;
  function aturBarPilih(n) {
    const bar = $('#barPilih');
    if (!bar) return;
    bar.hidden = !n;
    $('.bar-pilih-n', bar).innerHTML = `<b>${n.toLocaleString('id-ID')}</b> dipilih`;
  }

  // periode Browse dihitung dari hari halaman dibuka: 2 tahun lalu s/d H-30 (batas yang sama dengan Expired di basket.js)
  const isoLokal = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  const periodeMulai = () => { const x = new Date(); x.setFullYear(x.getFullYear() - 2); return isoLokal(x); };
  const periodeAkhir = () => { const x = new Date(); x.setDate(x.getDate() - 30); return isoLokal(x); };
  function halBrowse() {
    const draft = modeDraft(), appr = modeApproval();
    if (draft || appr) lihatBersih = null;
    const tombolBar = appr
      ? `<button class="biru" id="btnSetuju" title="Setujui"><span class="ik">${IKON.centang}</span></button>
        <button id="btnBalik" title="Kembalikan"><span class="ik">${IKON.urung}</span></button>
        <button id="btnTolak" title="Tolak"><span class="ik">${IKON.sampah}</span></button>`
      : draft
      ? `<button class="biru" id="btnHs" aria-haspopup="dialog" title="Penetapan HS"><span class="ik">${IKON.pena}</span></button>
        <button class="biru" id="btnKirim" title="Kirim ke Approval"><span class="ik">${IKON.kirim}</span></button>
        <button id="btnLepas" title="Hapus dari draft"><span class="ik">${IKON.sampah}</span></button>`
      : B.boleh.analisa() ? `<button class="biru" id="btnHs" aria-haspopup="dialog" title="Penetapan HS"><span class="ik">${IKON.pena}</span></button>` : '';
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu kartu-atas" id="kartuBrowse">
          <div class="bp-kepala">${tombolKembali()}${pilihDokumen()}
            <div class="periode"><span class="ik">${IKON.kalender}</span>Periode Data: <b>${tgl(periodeMulai())} s.d. ${tgl(periodeAkhir())} (2 tahun terakhir s.d. H-30)</b></div>
            <div class="bp-lipat">${htmlAkun()}</div>
          </div>
          ${lipBlok('dasbor', 'Dashboard', '<div class="bp-isi stat-ringkas" id="statBrowse"></div>')}
          ${lipBlok('af', 'Advanced Filter', `<div class="bp-isi af" role="group" aria-label="Advanced Filter">
            <div class="af-utama">
              <div class="af-daftar" id="afBaris"></div>
              <div class="af-tombol">
                <button class="btn btn-garis biru btn-ikon" id="afTambah" title="Tambah kondisi" aria-label="Tambah kondisi"><span class="ik">${IKON.tambah}</span></button>
                <button class="btn btn-garis btn-ikon" id="afReset" title="Reset" aria-label="Reset"><span class="ik">${IKON.segar}</span></button>
                <button class="btn btn-biru btn-ikon btn-titik" id="afCari" title="Cari" aria-label="Cari"><span class="ik">${IKON.cari}</span></button>
              </div></div>
            <p class="af-galat" id="afGalat" role="alert" hidden></p>
          </div>`)}
        </section>
        <section class="kartu kartu-tabel">
          <div class="kartu-kepala ringkas">
            <span id="chipLihat"></span>
            ${B.boleh.ajukan() ? `<button class="btn btn-garis biru btn-ikon btn-bersih${draft ? ' aktif' : ''}" id="btnDraft" aria-pressed="${draft}" title="${draft ? 'Kembali ke semua data' : 'Daftar Analisis'}" aria-label="Daftar Analisis"><span class="ik">${IKON.penanda}</span></button>` : ''}
            ${B.boleh.tinjau() ? `<button class="btn btn-garis biru btn-ikon btn-bersih${appr ? ' aktif' : ''}" id="btnApproval" aria-pressed="${appr}" title="${appr ? 'Kembali ke semua data' : 'Approval'}" aria-label="Approval"><span class="ik">${IKON.alur}</span><b class="kp-badge" data-hitung="approval" hidden></b></button>` : ''}
            <a class="btn btn-garis biru btn-ikon btn-bersih" href="${HREF_HISTORY}" title="Riwayat Penetapan" aria-label="Riwayat Penetapan"><span class="ik">${IKON.riwayat}</span><b class="kp-badge" data-hitung="impor-history" hidden></b></a>
            <a class="btn btn-garis biru btn-ikon btn-bersih" href="${HREF_MANUAL}" title="Import DNOA" aria-label="Import DNOA"><span class="ik">${IKON.dokKirim}</span><b class="kp-badge" data-hitung="impor-manual" hidden></b></a>
            <button class="btn btn-garis biru btn-ikon btn-bersih" id="btnRe" aria-haspopup="dialog" aria-expanded="false"${draft || appr ? ' hidden' : ''}><span class="ik">${IKON.bendera}</span></button>
            <button class="btn btn-garis biru btn-ikon btn-bersih" id="btnBersih" aria-haspopup="dialog" aria-expanded="false"${draft || appr ? ' hidden' : ''}><span class="ik">${IKON.sapu}</span></button>
            <button class="btn btn-garis biru btn-ikon" id="afExport" title="Export"><span class="ik">${IKON.unduh}</span></button></div>
          <div class="kartu-isi" id="tblBrowse"></div>
        </section>
        ${htmlBarPilih(tombolBar)}
      </div>`;

    isiStat($('#statBrowse'), dataBrowse());

    // --- flag RE: tombol menyala selama ada flag dicentang. Tanpa jumlah baris per flag: menghitungnya berarti menyaring ulang
    //     seluruh data tiap kali dropdown dibuka / diubah (permintaan 5 Nov 2026: hapus hitungan yang memberatkan) ---
    const flagAktif = () => (pilihRe.semua ? [] : FLAG_RE.filter(k => pilihRe[k]));
    let popRe = null;
    function isiPopRe(el) {
      const aktif = flagAktif();
      el.innerHTML = `
        <div class="pb-baris pb-kepala"><label><input type="checkbox" data-semua ${aktif.length === FLAG_RE.length ? 'checked' : ''}><b>Flag RE</b></label></div>
        ${RE.map(([k, l, w]) => `<div class="pb-baris" title="Flag RE ${l}"><label><input type="checkbox" data-k="${k}" ${aktif.includes(k) ? 'checked' : ''}><i class="pb-titik ${w}"></i>${l}</label></div>`).join('')}`;
      el.querySelector('[data-semua]').indeterminate = aktif.length > 0 && aktif.length < FLAG_RE.length;
    }
    function gambarRe() {
      const b = $('#btnRe');
      const aktif = flagAktif();
      b.classList.toggle('aktif', aktif.length > 0);
      b.title = aktif.length ? 'Flag RE: ' + RE.filter(([k]) => aktif.includes(k)).map(([, l]) => l).join(', ') : 'Flag RE';
      b.setAttribute('aria-label', b.title);
      if (popRe && popRe.isConnected) isiPopRe(popRe);
    }
    gambarRe();

    // --- advance filter ---
    // titik di tombol lipat Advance Filter selama ada saringan aktif
    const tandaAf = () => $('[data-lipat="af"]').classList.toggle('aktif', !!browse.aktif);
    tandaAf();
    const wadahAf = $('#afBaris');
    const grupKolom = (judul, ks, pilih) => `<optgroup label="${judul}">${ks.map(k => `<option value="${esc(k.key)}" ${k.key === pilih ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}</optgroup>`;
    const opsiKolom = pilih => grupKolom('Kolom utama', KOLOM_BROWSE.slice(0, JML_BAWAAN_BROWSE), pilih) + grupKolom('Kolom lain', KOLOM_BROWSE.slice(JML_BAWAAN_BROWSE), pilih);
    function gambarAf(fokus) {
      wadahAf.innerHTML = browse.baris.map((c, i) => {
        const k = PER_KOLOM_BROWSE.get(c.kolom);
        const j = k.tipe;
        const tanpa = TANPA_NILAI.has(c.op);
        const atribut = j === 'tanggal' ? 'type="date"' : j === 'angka' ? 'type="text" inputmode="decimal"' : 'type="text"';
        const kotak = (f, label) => `<input class="inp" ${atribut} data-i="${i}" data-f="${f}" value="${esc(c[f])}" aria-label="${label} ${i + 1}" autocomplete="off">`;
        // kolom teks: tombol regex di luar kotak nilai (sebelah tombol hapus); nyala = huruf monospace, pola tidak sah = merah.
        // Kolom angka / tanggal dan operator tanpa nilai: tempat tombol dibiarkan kosong supaya baris tetap sejajar
        const bisaRx = j === 'teks' && !tanpa;
        const rx = bisaRx && !!c.regex;
        const salah = rx && root.pisahDaftarSkpk(c.v1).some(v => !regexSah(v));
        // kotak bertumpuk (dipasang di bawah): satu nilai diketik biasa; tempel daftar / centang drop list = chip
        const kotakTeks = () => `<div class="inp af-tag${rx ? ' rx' : ''}${salah ? ' galat' : ''}" data-i="${i}" data-f="v1"></div>`;
        const tombolRx = bisaRx ? `<button type="button" class="btn btn-garis biru btn-ikon af-rx${salah ? ' galat' : ''}" data-regex="${i}" aria-pressed="${rx}" title="Regex" aria-label="Regex, kondisi ${i + 1}"><span class="ik">${IKON.regex}</span></button>`
          : '<span class="af-rx-sela" aria-hidden="true"></span>';
        return (i ? `<div class="af-gabung" role="radiogroup" aria-label="Penghubung ${i + 1}">${['DAN', 'ATAU'].map(g => `<label class="${c.gabung === g ? 'aktif' : ''}"><input type="radio" name="afGabung${i}" value="${g}" data-i="${i}" data-f="gabung" ${c.gabung === g ? 'checked' : ''}>${GABUNG[g]}</label>`).join('')}</div>` : '') +
          `<div class="af-kondisi">
            <select class="sel" data-i="${i}" data-f="kolom" aria-label="Kolom ${i + 1}">${opsiKolom(c.kolom)}</select>
            <select class="sel" data-i="${i}" data-f="op" aria-label="Operator ${i + 1}">${Object.entries(OP[j]).map(([v, l]) => `<option value="${v}" ${v === c.op ? 'selected' : ''}>${l}</option>`).join('')}</select>
            ${tanpa ? '<span class="inp" style="flex:1;visibility:hidden"></span>' : j === 'teks' ? kotakTeks() : kotak('v1', 'Nilai')}
            ${c.op === 'antara' ? `<span class="af-sd">dan</span>${kotak('v2', 'Batas atas')}` : ''}
            ${tombolRx}
            <button class="btn btn-garis btn-ikon" data-hapus="${i}" title="Hapus kondisi" aria-label="Hapus kondisi ${i + 1}" ${browse.baris.length === 1 ? 'disabled' : ''}><span class="ik">${IKON.kurang}</span></button>
          </div>`;
      }).join('');
      // kotak nilai teks: tempel daftar (NPWP, uraian, perusahaan; satu per baris) = chip, salah satu cocok. Kolom yang variasinya
      // sedikit punya drop list bercentang (sama dengan menu kolom): centang pertama mengubah operator teks bebas menjadi equals
      browse.baris.forEach((c, i) => {
        const box = wadahAf.querySelector(`.af-tag[data-i="${i}"]`);
        if (!box) return;
        const k = PER_KOLOM_BROWSE.get(c.kolom);
        root.pasangKotakDaftar(box, {
          nilai: c.v1, label: 'Nilai ' + (i + 1),
          daftar: !c.regex && punyaDaftarAf(k) ? () => root.nilaiUnikSkpk(dasarBrowse(), r => (k.nilai ? k.nilai(r) : r[k.key])) : null,
          sah: c.regex ? regexSah : null,
          pilihPertama: () => {
            if (c.op === 'sama' || c.op === 'tidakSama') return;
            c.op = 'sama';
            const s = wadahAf.querySelector(`[data-i="${i}"][data-f="op"]`);
            if (s) s.value = 'sama';
          },
          ubah: v => {
            c.v1 = v;
            if (c.regex) {
              const salah = root.pisahDaftarSkpk(v).some(x => !regexSah(x));
              box.classList.toggle('galat', salah);
              const b = wadahAf.querySelector(`[data-regex="${i}"]`);
              if (b) b.classList.toggle('galat', salah);
            }
            simpanBrowse();
            pratinjauAf();
          }
        });
      });
      if (fokus != null) {
        const el = wadahAf.querySelector(`[data-i="${fokus}"][data-f="v1"]`) || wadahAf.querySelector(`[data-i="${fokus}"][data-f="op"]`);
        if (el) (el.querySelector('input') || el).focus();
      }
      pratinjauAf();
    }
    // titik di Search selama isi form berbeda dari saringan yang sedang berlaku. Tanpa jumlah data cocok: menghitungnya
    // menyaring ulang seluruh data di tiap ketikan (permintaan 5 Nov 2026)
    function pratinjauAf() {
      $('#afGalat').hidden = true;
      const { kondisi } = siapkanKondisi(browse.baris, false);
      const jejak = ks => JSON.stringify(ks.map(x => [x.k.key, x.op, x.gabung, x.v1, x.v2, x.regex]));
      const belum = jejak(kondisi) !== jejak(browse.aktif ? siapkanKondisi(browse.aktif.baris, false).kondisi : []);
      $('#afCari').classList.toggle('aktif', belum);
      $('#afCari').title = belum ? 'Cari (belum diterapkan)' : 'Cari';
    }
    wadahAf.addEventListener('input', e => {
      const f = e.target.dataset.f;
      if (f !== 'v1' && f !== 'v2') return;
      const c = browse.baris[e.target.dataset.i];
      c[f] = e.target.value;
      simpanBrowse();
      pratinjauAf();
    });
    wadahAf.addEventListener('change', e => {
      const t = e.target;
      const c = browse.baris[t.dataset.i];
      if (!c) return;
      if (t.dataset.f === 'kolom') {
        const tipeLama = PER_KOLOM_BROWSE.get(c.kolom).tipe, tipeBaru = PER_KOLOM_BROWSE.get(t.value).tipe;
        c.kolom = t.value;
        if (tipeLama !== tipeBaru) Object.assign(c, { op: OP_AWAL[tipeBaru], v1: '', v2: '' });
        gambarAf(t.dataset.i);
      } else if (t.dataset.f === 'op') {
        const ulang = (c.op === 'antara') !== (t.value === 'antara') || TANPA_NILAI.has(c.op) !== TANPA_NILAI.has(t.value);
        c.op = t.value;
        if (ulang) gambarAf(t.dataset.i); else pratinjauAf();
      } else if (t.dataset.f === 'gabung') {
        c.gabung = t.value;
        gambarAf();
      }
      simpanBrowse();
    });
    wadahAf.addEventListener('click', e => {
      const rb = e.target.closest('[data-regex]');
      if (rb) {
        const i = Number(rb.dataset.regex);
        browse.baris[i].regex = !browse.baris[i].regex;
        simpanBrowse();
        gambarAf(i);
        return;
      }
      const h = e.target.closest('[data-hapus]');
      if (!h || h.disabled) return;
      browse.baris.splice(Number(h.dataset.hapus), 1);
      browse.baris[0].gabung = 'DAN';
      gambarAf();
      simpanBrowse();
    });
    wadahAf.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.inp, input.tg-tag-inp')) { e.preventDefault(); $('#afCari').click(); } });
    $('#afTambah').onclick = () => {
      const akhir = browse.baris[browse.baris.length - 1];
      browse.baris.push(kondisiBaru(akhir ? akhir.kolom : 'uraian'));
      gambarAf(browse.baris.length - 1);
      simpanBrowse();
    };
    gambarAf();

    // --- Penetapan HS + simpan ke tema (catatan rapat no. 1, 5, 6; slide 2) = satu popup dari bar melayang ---
    // tabel belum ada saat render pertama memanggil cekAn
    let tabel = null;
    const cekAn = () => aturBarPilih(tabel ? tabel.terpilih().length : 0);
    pasangLipat($('#kartuBrowse'));

    const idTabel = draft ? 'browse-kerja' : appr ? 'browse-approval' : 'browse';
    tabel = root.buatTabel($('#tblBrowse'), {
      id: idTabel,
      ingat: true,
      kolom: draft ? KOLOM_DRAFT : appr ? KOLOM_APPROVAL : KOLOM_BROWSE,
      kolomBawaan: draft ? BAWAAN_DRAFT : appr ? BAWAAN_APPROVAL : KOLOM_BAWAAN_BROWSE_AKTIF.map(k => k.key),
      data: dataBrowse,
      centang: true,
      stripRingkas: true,
      kelasBaris: kelasWarna,
      // mode Daftar Analisa: dobel-klik = detail seri (dokumen pendukung, progres); seri yang di-Reject tidak punya detail lagi
      ...(draft || appr ? { dobelKlik: r => { if (!tolakR(r)) location.hash = '#/smart-pcc/penelitian-skpk/detail-skpk/' + r.id; } } : {}),
      setelahRender: () => cekAn(),
      aksi: () => `<button class="btn-aksi biru" data-aksi="trx" title="Data transaksional">${IKON.dok}</button><button class="btn-aksi kuning" data-aksi="perusahaan" title="Profil Perusahaan">${IKON.gedung}</button>`,
      klikAksi(nama, r) {
        if (nama === 'trx') location.hash = '#/smart-pcc/browse-pib/transaksional/' + r.id;
        else modalPerusahaan(r);
      }
    });

    beritaPulih(!!browse.aktif || !pilihRe.semua || bersihAktif().length > 0 || tabel.adaKeadaan(), () => {
      aturBrowse(awalBrowse());
      lihatBersih = null;
      lupakanTabel(idTabel);
      if ($('#tblBrowse')) halBrowse();
    });

    $('#afCari').onclick = () => {
      const h = siapkanKondisi(browse.baris, true);
      if (h.galat) { $('#afGalat').textContent = h.galat; $('#afGalat').hidden = false; return; }
      browse.aktif = h.kondisi.length ? { baris: browse.baris.map(c => ({ ...c })) } : null;
      simpanBrowse();
      tandaAf();
      gambarRe();
      tabel.render();
      isiStat($('#statBrowse'), dataBrowse());
      pratinjauAf();
    };
    // Reset = kembali murni ke awal (6 Nov 2026): Advance Filter, Flag RE, Cleansing (termasuk tampilan baris yang dibuang),
    // saringan kolom, urutan, halaman, dan centang. Susunan kolom (pin, lebar) dan mode Daftar Analisa / Approval tetap.
    // Halaman digambar ulang supaya semua tombol ikut kembali; Urungkan di toast mengembalikan semuanya
    $('#afReset').onclick = () => {
      const sebelum = { browse: JSON.parse(JSON.stringify(browse)), tabel: tabel.keadaan(), lihat: lihatBersih };
      aturBrowse(awalBrowse());
      lihatBersih = null;
      tabel.reset();
      tabel.kosongkanPilihan();
      halBrowse();
      toast('info', 'Filter Direset', 'Semua filter, flag, cleansing, dan urutan dihapus.', { teks: 'Undo', fn: () => {
        aturBrowse(sebelum.browse);
        lihatBersih = sebelum.lihat;
        simpanan.tulis('tabel:' + idTabel, sebelum.tabel);
        if ($('#tblBrowse')) halBrowse();
      } });
    };

    $('#afExport').onclick = () => {
      const rows = tabel.terfilter();
      const kolom = tabel.kolomTampil();
      unduhXlsx('browse.xlsx', kolom, rows, 'Browse');
      toast('ok', 'Export Selesai', `${rows.length.toLocaleString('id-ID')} baris × ${kolom.length} kolom ke Excel.`);
    };

    const dok = $('#pilihDok');
    if (dok) dok.onchange = () => {
      const o = dok.selectedOptions[0];
      if (!o.dataset.kosong) return root.SKPK_DOKUMEN.pilih(dok.value);
      dok.value = root.SKPK_DOKUMEN.AKTIF;
      toast('info', o.textContent, 'Data belum tersedia.');
    };

    $('#btnRe').onclick = e => {
      const el = bukaPop(e.currentTarget, 'pop-bersih', '');
      popRe = el;
      if (!el) return;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Flag RE');
      isiPopRe(el);
      el.onchange = ev => {
        const t = ev.target;
        if (t.dataset.semua != null) for (const k of FLAG_RE) pilihRe[k] = t.checked;
        else if (t.dataset.k) pilihRe[t.dataset.k] = t.checked;
        else return;
        pilihRe.semua = !FLAG_RE.some(k => pilihRe[k]);
        simpanBrowse();
        gambarRe();
        tabel.render();
        isiStat($('#statBrowse'), dataBrowse());
        pratinjauAf();
      };
    };

    // --- cleansing: dropdown berisi kategori bercentang (Notul, Penul, Audit, Expired, Basket, SIRENA) ---
    // ikon mata per kategori = lihat baris yang dibuang kategori itu; chip di kiri tombol = keluar dari tampilan itu.
    // Tanpa jumlah baris per kategori (menghitungnya = memeriksa ulang seluruh data tiap dropdown dibuka / diubah)
    function gambarBersih() {
      const b = $('#btnBersih');
      const aktif = bersihAktif();
      b.classList.toggle('aktif', aktif.length > 0);
      b.title = aktif.length ? 'Cleansing: ' + aktif.map(k => NAMA_BERSIH[k]).join(', ') : 'Cleansing';
      b.setAttribute('aria-label', b.title);
      const c = $('#chipLihat');
      if (draft) { c.innerHTML = `<button type="button" class="chip-lihat" title="Kembali ke semua data" aria-label="Keluar: Daftar Analisis"><span class="ik">${IKON.penanda}</span>Daftar Analisis<span class="ik">${IKON.silang}</span></button>`; return; }
      if (appr) { c.innerHTML = `<button type="button" class="chip-lihat" title="Kembali ke semua data" aria-label="Keluar: Approval"><span class="ik">${IKON.alur}</span>Approval<span class="ik">${IKON.silang}</span></button>`; return; }
      if (!lihatBersih) { c.innerHTML = ''; return; }
      const nama = lihatBersih === 'semua' ? 'Dikecualikan' : NAMA_BERSIH[lihatBersih];
      c.innerHTML = `<button type="button" class="chip-lihat" title="Kembali ke data hasil Cleansing" aria-label="Keluar: ${nama}"><span class="ik">${IKON.mata}</span>${nama}<span class="ik">${IKON.silang}</span></button>`;
    }
    function segarBersih() {
      simpanBrowse();
      tabel.lepasPilihan(id => !lolosBersih(D.PER_ID.get(id)));
      tabel.render();
      gambarBersih();
      gambarRe();
      isiStat($('#statBrowse'), dataBrowse());
      pratinjauAf();
    }
    function isiPopBersih(el) {
      const aktif = bersihAktif();
      const mata = (k, label) => `<button type="button" class="pb-mata${lihatBersih === k ? ' aktif' : ''}" data-lihat="${k}" title="Lihat ${label}" aria-label="Lihat ${label}" aria-pressed="${lihatBersih === k}"><span class="ik">${IKON.mata}</span></button>`;
      const semuaCentang = aktif.length === BERSIH.length;
      el.innerHTML = `
        <div class="pb-baris pb-kepala"><label><input type="checkbox" data-semua ${semuaCentang ? 'checked' : ''}><b>Cleansing</b></label>${mata('semua', 'semua yang dikecualikan')}</div>
        ${BERSIH.map(([k, l, tip, w]) => `<div class="pb-baris" title="${esc(tip)}"><label><input type="checkbox" data-k="${k}" ${browse.bersih[k] ? 'checked' : ''}><i class="pb-titik ${w}"></i>${l}</label>${mata(k, l)}</div>`).join('')}`;
      const s = el.querySelector('[data-semua]');
      s.indeterminate = aktif.length > 0 && !semuaCentang;
    }
    gambarBersih();
    $('#btnBersih').onclick = e => {
      const el = bukaPop(e.currentTarget, 'pop-bersih', '');
      if (!el) return;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Cleansing');
      isiPopBersih(el);
      el.onchange = ev => {
        const t = ev.target;
        if (t.dataset.semua != null) for (const [k] of BERSIH) browse.bersih[k] = t.checked;
        else if (t.dataset.k) browse.bersih[t.dataset.k] = t.checked;
        else return;
        segarBersih();
        isiPopBersih(el);
      };
      el.onclick = ev => {
        const m = ev.target.closest('[data-lihat]');
        if (!m) return;
        lihatBersih = lihatBersih === m.dataset.lihat ? null : m.dataset.lihat;
        segarBersih();
        isiPopBersih(el);
      };
    };
    // mode Daftar Analisa: tombol penanda / chip = masuk / keluar; halaman digambar ulang karena kolom dan isi tabelnya berbeda
    const gantiDraft = () => { browse.draft = !draft; browse.approval = false; simpanBrowse(); tutupPop(); halBrowse(); gambarAkun(); };
    const gantiApproval = () => { browse.approval = !appr; browse.draft = false; simpanBrowse(); tutupPop(); halBrowse(); gambarAkun(); };
    if ($('#btnDraft')) $('#btnDraft').onclick = gantiDraft;
    if ($('#btnApproval')) $('#btnApproval').onclick = gantiApproval;
    $('#chipLihat').onclick = e => {
      if (!e.target.closest('.chip-lihat')) return;
      if (draft) return gantiDraft();
      if (appr) return gantiApproval();
      lihatBersih = null;
      tutupPop();
      segarBersih();
    };

    const terpilih = () => tabel.terpilih().map(id => D.PER_ID.get(id)).filter(Boolean);
    const segarTabel = () => { if (!$('#tblBrowse')) return; tabel.render(); isiStat($('#statBrowse'), dataBrowse()); };
    // analisa (HS penetapan, tarif, potensi) dan tema dalam satu popup; seri yang tersimpan dilepas centangnya (Analis 2 tidak menganalisa)
    if ($('#btnHs')) $('#btnHs').onclick = () => {
      bukaPenetapanHs(terpilih(), simpan => {
        if (!$('#tblBrowse')) return;
        const id = new Set(simpan.map(r => r.id));
        if (!tabel.lepasPilihan(x => id.has(x))) tabel.render();
      });
    };
    // mode Daftar Analisa: Kirim ke Basket (satu tema = satu pengajuan, Undo di toast) dan lepas dari draft (analisa dibuang, Undo di toast)
    if ($('#btnKirim')) $('#btnKirim').onclick = () => ajukanSeri(terpilih(), () => { tabel.kosongkanPilihan(); segarTabel(); });
    // mode Approval: keputusan untuk seri terpilih (judul popup = nama tema bila semuanya satu tema)
    const judulPilih = rows => { const ts = new Set(rows.map(r => isian(r).tema)); return ts.size === 1 ? Array.from(ts)[0] : 'Seri Terpilih'; };
    const putus = aksi => () => { const rows = terpilih(); putusSeri(aksi, rows, judulPilih(rows), () => { tabel.kosongkanPilihan(); segarTabel(); }); };
    if ($('#btnSetuju')) $('#btnSetuju').onclick = putus('setujui');
    if ($('#btnBalik')) $('#btnBalik').onclick = putus('kembalikan');
    if ($('#btnTolak')) $('#btnTolak').onclick = putus('tolak');
    if ($('#btnLepas')) $('#btnLepas').onclick = () => {
      const pilih = terpilih(), terpilihN = pilih.length;
      const h = B.keluarkan(pilih);
      const n = Object.keys(h.hapus).length;
      if (!n) return toast('galat', 'Tidak Bisa Menghapus', 'Hanya seri Draft / Dikembalikan yang bisa dihapus.');
      tabel.kosongkanPilihan();
      segarTabel();
      const lewat = terpilihN - n;
      toast('ok', 'Dihapus', `${n} seri keluar dari draft` + (lewat > 0 ? ` (${lewat} dilewati, bukan Draft)` : '') + '.', { teks: 'Undo', fn: () => { B.pulihkanTema(h.hapus); segarTabel(); } });
    };
    $('#btnBatalPilih').onclick = () => tabel.kosongkanPilihan();
    cekAn();
    // halaman bisa digambar ulang tanpa router (mode Daftar Analisa, pulihkan saringan): isi lagi lonceng dan avatar di kepala kartu
    gambarAkun();
  }

  function modalPerusahaan(r) {
    const rows = D.ROWS.filter(x => x.m['Npwp9'] === r.m['Npwp9']);
    const st = D.statistik(rows);
    const merah = rows.filter(x => (x.jalurKode || '').startsWith('M')).length;
    const baris = [['Nama Perusahaan', r.perusahaan], ['NPWP Perusahaan', r.npwp], ['Jumlah Dokumen', st.pib.toLocaleString('id-ID')], ['Jumlah Seri Barang', st.seri.toLocaleString('id-ID')],
      ['HS Code Terbanyak', st.hs], ['Kode Kantor', r.kantorKode], ['Seri Jalur Merah', merah.toLocaleString('id-ID')], ['Total Nilai Devisa', st.devisa.toLocaleString('id-ID', { maximumFractionDigits: 2 })]];
    modal('Profil Perusahaan', `<div class="daftar-id">${baris.map(([a, b]) => `<span>${a}</span><b>${t(b)}</b>`).join('')}</div>`);
  }

  // ================= Data Transaksional =================
  const PER_AJU = new Map();
  for (const r of D.ROWS) { if (!PER_AJU.has(r.aju)) PER_AJU.set(r.aju, []); PER_AJU.get(r.aju).push(r); }

  function halTransaksional(id) {
    const r = D.PER_ID.get(id);
    if (!r) return tidakAda('#/smart-pcc/browse-pib');
    const m = r.m;
    const barang = PER_AJU.get(r.aju).slice().sort((a, b) => a.seri - b.seri);
    const st = { tab: 'header', sub: 'data', pihak: 'importir' };
    const ro = (v, kelas = '') => `<div class="isi-ro ${kelas}">${t(v)}</div>`;
    const dua = (a, b) => `<div class="dua">${ro(a)}${ro(b)}</div>`;
    const cif = barang.reduce((s, x) => s + (x.m['CIF'] || 0), 0);
    // HS dan tarif ditetapkan: isian basket bila ada, selain itu HS Rekomendasi mesin, selain itu pemberitahuan
    const tetap = x => { const s = B.analisaTampil(x); return s && s.hs ? { hs: s.hs, bm: s.bm } : { hs: x.hsSaran || x.hs, bm: x.hsSaran ? x.trfSaran : x.trfBm }; };

    const PIHAK = {
      importir: [['No.ID', m['Npwp Imp']], ['Nama', m['Nm Imp']], ['Alamat', '-']],
      penjual: [['Nama', m['Nm Pemasok']], ['Negara', m['Neg Pemasok']], ['Alamat', '-']],
      pemusatan: [['No.ID', '-'], ['Nama', '-'], ['Alamat', '-']],
      pemilik: [['No.ID', m['Npwp Ind']], ['Nama', m['Nm Ind']], ['Alamat', '-']],
      pengirim: [['Nama', m['Nm Pengirim']], ['Negara', m['Neg Pengirim']], ['Alamat', '-']]
    };

    function isiHeader() {
      const jalur = r.jalurKode || '';
      return `<div class="trx-grid">
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="panel"><div class="panel-isi isian">
              <span>Nomor / Tanggal Daftar</span><div class="dua garis">${ro(r.noPib)}<span>/</span>${ro(tgl(r.tglDaftar))}</div>
              <span>Nomor Pengajuan</span>${ro(r.aju)}
              <span>Kantor Pelayanan BC</span><div class="dua" style="grid-template-columns:90px 1fr">${ro(r.kantorKode)}${ro((r.kantor || '').split(' - ')[1])}</div>
              <span>Jenis Dokumen</span>${ro('BC 2.0', 'tengah')}
              <span>Cara Pembayaran</span>${ro(D.BAYAR[m['Jns Bayar']] || 'BIASA/TUNAI', 'tengah')}
              <span>Jenis Impor</span>${ro('UNTUK DIPAKAI', 'tengah')}
              <span>Jalur</span><div><span class="jalur-badge ${jalur.startsWith('M') ? 'm' : ''}">${t(r.jalur)}</span></div>
            </div></div>
          <div class="panel"><div class="panel-isi isian">
              <span>Invoice</span>${dua('-', '-')}
              <span>L/C</span>${dua('-', '-')}
              <span>BL/AWB</span>${dua('-', '-')}
              <span>BC 1.1</span>${dua(m['No Bc11'], tgl(m['Tgl Bc11']))}
              <span>Pos</span>${dua(m['No Pos Bc11'], m['No Sub Pos Bc11'])}
              <span>Skep. Fasilitas</span>${dua(r.skepKode || '-', r.skep ? r.skep.split(' - ')[1] : '-')}
            </div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="panel"><div class="panel-isi">
              <div class="tab-pil" id="tabPihak">${Object.keys(PIHAK).map(k => `<button data-pihak="${k}" class="${k === st.pihak ? 'aktif' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
              <div class="daftar-id">${PIHAK[st.pihak].map(([a, b]) => `<span>${a}</span><span>${t(b)}</span>`).join('')}</div>
            </div></div>
          <div class="panel"><div class="panel-isi isian empat">
              <span>Valuta</span><div class="dua" style="grid-template-columns:52px 1fr">${ro(m['Kd Val'])}${ro(D.VALUTA[m['Kd Val']] || m['Kd Val'])}</div>
              <span>NDPBM</span>${ro(angka(m['Ndpbm']))}
              <span>Kode Incoterm</span>${ro(m['Kode Incoterm'])}
              <span>Nilai Incoterm</span>${ro(angka(cif))}
              <span>Freight</span>${ro(angka(m['Freight']))}
              <span>Asuransi</span>${ro(angka(m['Asuransi']))}
              <span>Biaya Tambahan</span>${ro('0')}
              <span>Biaya Pengurang</span>${ro('0')}
              <span>Nilai VD</span>${ro('0')}
              <span></span><span></span>
              <span>Nilai Pabean</span>${ro(rupiah(cif * (m['Ndpbm'] || 1)))}
            </div></div>
        </div>
      </div>`;
    }

    function gambar() {
      const tabAtas = `<div class="tab-atas">${tombolKembali()}
          <button data-tab="header" class="${st.tab === 'header' ? 'aktif' : ''}">Header</button>
          <button data-tab="audit" class="${st.tab === 'audit' ? 'aktif' : ''}">Analisis Audit</button>
        </div>`;
      let isi;
      if (st.tab === 'audit') {
        isi = `<div style="padding:18px 0">${r.ketAudit ? `<div class="isi-ro">${t(r.ketAudit)}</div>` : '<div class="analisis-kosong">Tidak ada data analisis audit</div>'}</div>`;
      } else {
        const sub = `<div class="tab-kotak">
            <button data-sub="data" class="${st.sub === 'data' ? 'aktif' : ''}"><span class="ik">${IKON.dok}</span>Data Header</button>
            <button data-sub="barang" class="${st.sub === 'barang' ? 'aktif' : ''}"><span class="ik">${IKON.keranjang}</span>Barang</button>
            <button data-sub="resume" class="${st.sub === 'resume' ? 'aktif' : ''}"><span class="ik">${IKON.cekLingkaran}</span>Resume Keputusan</button>
          </div>`;
        isi = sub + (st.sub === 'data' ? isiHeader() : '<div id="trxTabel"></div>');
      }
      view.innerHTML = `<div class="wadah">${tabAtas}${isi}</div>`;
      if (st.tab === 'header' && st.sub === 'barang') {
        root.buatTabel($('#trxTabel'), {
          id: 'trx-barang',
          kolom: [K.seri, K.hs, K.uraian, K.merk, K.tipe, K.jmlSatuan, K.satuan, K.negara, K.trfBm, K.bmBayar, K.devisa].map(k => ({ ...k, saring: false })),
          data: () => barang
        });
      } else if (st.tab === 'header' && st.sub === 'resume') {
        root.buatTabel($('#trxTabel'), {
          id: 'trx-resume',
          kolom: [
            { key: 'seri', label: 'Seri Barang', lebar: 90 }, { key: 'hs', label: 'HS Diberitahukan', lebar: 120 }, { key: 'hsTetap', label: 'HS Ditetapkan', lebar: 120, isi: x => t(tetap(x).hs) },
            { key: 'trfBm', label: 'Tarif BM Diberitahukan', lebar: 140 }, { key: 'trfTetap', label: 'Tarif BM Ditetapkan', lebar: 130, isi: x => t(tetap(x).bm) },
            { key: 'kep', label: 'Keputusan', lebar: 120, isi: x => (x.hs === tetap(x).hs ? '<span class="flag n">SESUAI</span>' : '<span class="flag y">PERUBAHAN</span>') }
          ],
          data: () => barang
        });
      }
    }

    view.onclick = e => {
      const b = e.target.closest('[data-tab],[data-sub],[data-pihak]');
      if (!b) return;
      if (b.dataset.tab) st.tab = b.dataset.tab;
      if (b.dataset.sub) st.sub = b.dataset.sub;
      if (b.dataset.pihak) st.pihak = b.dataset.pihak;
      gambar();
    };
    gambar();
  }

  // ---------- form Penetapan HS bersama: popup cepat (banyak seri) dan halaman detail (satu seri) ----------
  // Teks Indonesia (permintaan pengguna). Fitur sama di keduanya: HS Penetapan (terisi saran bila seragam), tarif BM / PPN / PPh
  // otomatis dari HS Penetapan + Kode Fasilitas tiap seri (ikon rantai; diketik = berlaku untuk semua seri, ikon putar = kembali
  // otomatis; kosong bila hasil otomatis berbeda antarseri), Pungutan Lain (BMAD, BMTP, ...), Alasan, dan dokumen pendukung.
  const TARIF_HS = [['bm', 'Tarif', 'Tarif BM Penetapan'], ['ppn', 'PPN', 'Tarif PPN Penetapan'], ['pph', 'PPh', 'Tarif PPh Penetapan']];
  const JENIS_LAIN = ['BMAD', 'BMTP', 'BMI', 'BMP', 'PPnBM'];
  const angkaTarif = v => { const x = String(v ?? '').trim().replace(',', '.'); return x === '' ? null : Number(x); };
  const tarifSah = v => { const x = angkaTarif(v); return x != null && x >= 0 && x <= 100; };
  // keadaan mentah form -> isian analisa (tarif null = otomatis per seri) dan sah-nya (HS 8 digit, tarif 0-100, pungutan bertarif, alasan)
  const isiDariForm = s => {
    const isi = { hs: String(s.hs || '').replace(/\D/g, ''), alasan: String(s.alasan || '').trim(), lain: (s.lain || []).map(x => ({ jenis: x.jenis, tarif: angkaTarif(x.tarif) })) };
    for (const [k] of TARIF_HS) isi[k] = s.tarif[k] == null ? null : angkaTarif(s.tarif[k]);
    return isi;
  };
  const hsDigit = v => String(v || '').replace(/\D/g, '');
  // isian yang terisi sah: HS kosong atau 8 digit, tarif kosong atau 0-100, pungutan lain bertarif (syarat Simpan; kosong boleh)
  const formIsiSah = s => (!hsDigit(s.hs) || /^\d{8}$/.test(hsDigit(s.hs))) && TARIF_HS.every(([k]) => s.tarif[k] == null || !String(s.tarif[k]).trim() || tarifSah(s.tarif[k]))
    && (s.lain || []).every(x => tarifSah(x.tarif));
  // lengkap untuk Kirim: isian sah, HS 8 digit, alasan terisi (dokumen tidak wajib)
  const formHsSah = s => formIsiSah(s) && /^\d{8}$/.test(hsDigit(s.hs)) && !!String(s.alasan || '').trim();
  // isian yang belum ada / belum sah, untuk tooltip
  const formKurang = s => [!/^\d{8}$/.test(hsDigit(s.hs)) && 'HS Penetapan 8 digit', !String(s.alasan || '').trim() && 'Alasan',
    !TARIF_HS.every(([k]) => s.tarif[k] == null || !String(s.tarif[k]).trim() || tarifSah(s.tarif[k])) && 'tarif 0-100',
    !(s.lain || []).every(x => tarifSah(x.tarif)) && 'tarif Pungutan Lain'].filter(Boolean);
  // kunci = hanya baca (seri sudah diajukan); unggah = satu dokumen kecil di dalam form (popup cepat)
  const htmlFormHs = (kunci, unggah) => `
    <span>HS Penetapan</span><input class="inp" id="hpHs" inputmode="numeric" placeholder="8 digit" autocomplete="off" aria-label="HS Penetapan"${kunci ? ' disabled' : ''}>
    ${TARIF_HS.map(([k, , nama]) => `<span>${nama} (%)</span><div class="hp-tarif"><input class="inp" id="hp-${k}" data-tarif="${k}" inputmode="decimal" autocomplete="off" aria-label="${nama}"${kunci ? ' disabled' : ''}>${kunci ? '' : `<button type="button" class="hp-auto" data-auto="${k}"></button>`}</div>`).join('')}
    <span>Pungutan Lain</span><div class="hp-lain"><div id="hpLain"></div>${kunci ? '' : `<button type="button" class="btn btn-garis biru btn-ikon" id="hpTambahLain" title="Tambah pungutan (BMAD, BMTP, …)" aria-label="Tambah pungutan"><span class="ik">${IKON.tambah}</span></button>`}</div>
    <span>Alasan</span><textarea class="inp" id="hpAlasan" rows="3" aria-label="Alasan"${kunci ? ' disabled' : ''}></textarea>
    ${unggah ? `<span>Dokumen</span><div class="hp-dok"><button type="button" class="btn btn-garis biru btn-ikon" id="hpUnggah" title="Unggah dokumen pendukung" aria-label="Unggah dokumen pendukung"><span class="ik">${IKON.unggah}</span></button><span id="hpDokNama"></span></div>` : ''}`;
  // o = { rows() -> seri yang ditetapkan, awal (isian tersimpan, untuk detail), kunci, saatTarif(k, ketik, hs), saatCek(sah) }
  function pasangFormHs(md, o) {
    const q = s => md.querySelector(s);
    const awal = o.awal || {};
    const manual = {};
    const lain = (awal.lain || []).map(x => ({ jenis: x.jenis, tarif: x.tarif == null ? '' : String(x.tarif) }));
    let hsDiketik = !!awal.hs, file = null;
    const hsKini = () => q('#hpHs').value.replace(/\D/g, '');
    // HS Penetapan: hanya angka, mentok 8 digit; merah bila terisi kurang dari 8 digit
    const tandaHs = () => { const n = hsKini().length; q('#hpHs').classList.toggle('salah', n > 0 && n < 8); };
    q('#hpHs').value = awal.hs || '';
    tandaHs();
    q('#hpAlasan').value = awal.alasan || '';
    // tarif tersimpan yang berbeda dari hasil otomatis = diketik sendiri
    const autoAwal = awal.hs && o.rows().length === 1 ? B.tarifOtomatis(o.rows()[0], awal.hs) : null;
    for (const [k] of TARIF_HS) if (awal[k] != null && (o.kunci || !autoAwal || autoAwal[k] !== awal[k])) { manual[k] = true; q('#hp-' + k).value = awal[k]; }

    const gambarLain = () => {
      q('#hpLain').innerHTML = o.kunci ? (lain.length ? lain.map(x => `<span>${esc(x.jenis)} ${esc(x.tarif)}%</span>`).join('') : '-')
        : lain.map((x, i) => `<div class="hp-lain-baris">
            <select class="sel" data-lain="${i}" data-f="jenis" aria-label="Pungutan ${i + 1}">${JENIS_LAIN.map(j => `<option${j === x.jenis ? ' selected' : ''}>${j}</option>`).join('')}</select>
            <input class="inp" data-lain="${i}" data-f="tarif" inputmode="decimal" autocomplete="off" value="${esc(x.tarif)}" placeholder="%" aria-label="Tarif pungutan ${i + 1}">
            <button type="button" class="btn btn-garis btn-ikon" data-hapus-lain="${i}" title="Hapus" aria-label="Hapus pungutan ${i + 1}"><span class="ik">${IKON.kurang}</span></button></div>`).join('');
    };
    gambarLain();
    if (o.kunci) return { segar() {}, isi: () => null, file: () => null, lepasFile() {} };

    // HS terisi otomatis bila seri yang dipilih punya satu HS saran / penetapan yang sama, selama belum diketik sendiri
    const saranHs = () => {
      if (hsDiketik) return;
      const saran = Array.from(new Set(o.rows().map(r => an(r).hs || r.hsSaran).filter(Boolean)));
      q('#hpHs').value = saran.length === 1 ? saran[0] : '';
      tandaHs();
    };
    const gambarTarif = () => {
      const hs = hsKini();
      const auto = o.rows().map(r => B.tarifOtomatis(r, hs));
      for (const [k] of TARIF_HS) {
        const inp = q('#hp-' + k), b = q(`[data-auto="${k}"]`);
        if (!manual[k]) {
          const nilai = Array.from(new Set(auto.filter(Boolean).map(a => a[k])));
          inp.value = nilai.length === 1 ? nilai[0] : '';
        }
        inp.classList.toggle('otomatis', !manual[k]);
        b.innerHTML = `<span class="ik">${manual[k] ? IKON.segar : IKON.rantai}</span>`;
        b.title = manual[k] ? 'Kembali ke otomatis' : 'Otomatis dari HS Penetapan dan Kode Fasilitas';
        b.setAttribute('aria-label', b.title);
        b.classList.toggle('manual', !!manual[k]);
        if (o.saatTarif) o.saatTarif(k, manual[k] ? angkaTarif(inp.value) : null, hs);
      }
    };
    // sah = ada seri, HS 8 digit, tarif 0-100 (kosong = otomatis per seri), pungutan lain bertarif, alasan terisi
    const cek = () => {
      const tarifOk = TARIF_HS.every(([k]) => { const v = q('#hp-' + k).value; return v.trim() === '' || tarifSah(v); });
      o.saatCek(!!(o.rows().length && /^\d{8}$/.test(hsKini()) && tarifOk && lain.every(x => tarifSah(x.tarif)) && q('#hpAlasan').value.trim()));
    };
    const gambarFile = () => {
      const el = q('#hpDokNama');
      if (el) el.innerHTML = file ? `<span class="hp-dok-chip" title="${esc(file.name + ' · ' + ukuranFile(file.size))}">${esc(file.name)}<button type="button" data-lepas-dok title="Hapus" aria-label="Hapus dokumen"><span class="ik">${IKON.silang}</span></button></span>` : '';
    };

    q('#hpHs').addEventListener('input', () => {
      const el = q('#hpHs'), v = hsKini().slice(0, 8);
      if (el.value !== v) el.value = v;
      hsDiketik = true;
      tandaHs();
      gambarTarif();
    });
    md.addEventListener('input', e => {
      const t = e.target;
      if (t.type === 'checkbox') return;
      if (t.dataset.tarif) { manual[t.dataset.tarif] = true; gambarTarif(); }
      if (t.dataset.lain != null) lain[t.dataset.lain][t.dataset.f] = t.value;
      cek();
    });
    md.addEventListener('change', e => { if (e.target.dataset.lain != null) lain[e.target.dataset.lain][e.target.dataset.f] = e.target.value; });
    md.addEventListener('click', e => {
      const a = e.target.closest('[data-auto]');
      if (a) {
        if (manual[a.dataset.auto]) { manual[a.dataset.auto] = false; gambarTarif(); cek(); } else q('#hp-' + a.dataset.auto).focus();
        return;
      }
      const h = e.target.closest('[data-hapus-lain]');
      if (h) { lain.splice(Number(h.dataset.hapusLain), 1); gambarLain(); cek(); return; }
      if (e.target.closest('[data-lepas-dok]')) { file = null; gambarFile(); }
    });
    q('#hpTambahLain').onclick = () => {
      const ada = new Set(lain.map(x => x.jenis));
      lain.push({ jenis: JENIS_LAIN.find(j => !ada.has(j)) || JENIS_LAIN[0], tarif: '' });
      gambarLain();
      q(`[data-lain="${lain.length - 1}"][data-f="tarif"]`).focus();
      cek();
    };
    if (q('#hpUnggah')) q('#hpUnggah').onclick = () => pilihFile('', f => { file = f; gambarFile(); });

    // keadaan mentah form (teks apa adanya) supaya bisa disimpan per seri lalu dimuat lagi (popup: edit seri satu per satu)
    const keadaan = () => ({ hs: q('#hpHs').value, hsDiketik, alasan: q('#hpAlasan').value, lain: lain.map(x => ({ ...x })),
      tarif: Object.fromEntries(TARIF_HS.map(([k]) => [k, manual[k] ? q('#hp-' + k).value : null])) });
    return {
      segar() { saranHs(); gambarTarif(); cek(); },
      isi: () => isiDariForm(keadaan()),
      keadaan,
      muat(s) {
        q('#hpHs').value = s.hs || '';
        hsDiketik = !!s.hsDiketik;
        tandaHs();
        q('#hpAlasan').value = s.alasan || '';
        lain.splice(0, lain.length, ...(s.lain || []).map(x => ({ ...x })));
        for (const [k] of TARIF_HS) { manual[k] = s.tarif[k] != null; q('#hp-' + k).value = manual[k] ? s.tarif[k] : ''; }
        gambarLain();
        saranHs();
        gambarTarif();
        cek();
      },
      file: () => file,
      lepasFile() { file = null; gambarFile(); }
    };
  }
  // dokumen dari form cepat: satu file untuk tiap seri yang disimpan; nama dokumen = nama file
  const unggahKeSeri = (rows, file) => Promise.all(rows.map(r => L.tambah(r.kunci, file, { nama: file.name.replace(/\.[^.]+$/, ''), oleh: B.penggunaKini().id })))
    .catch(() => toast('galat', 'Gagal Mengunggah', file.name));

  // Penetapan HS + Save to theme dalam satu popup di Browse (5 Nov 2026; dulu analisa di Basket lalu dua langkah terpisah di Browse).
  // Kiri: seri terpilih dengan HS Penetapan, Tema, Kode Fasilitas (nama di tooltip), pratinjau tarif BM / PPN / PPh dan Potensi per seri,
  // total potensi seri tercentang; seri yang sudah ditetapkan (SPTNP / SPKTNP / LHA) diberi label (penetapan ulang boleh).
  // Kanan: Nama Tema, Jenis Tema, lalu form Penetapan HS bersama (htmlFormHs / pasangFormHs, sama dengan halaman detail) plus satu dokumen.
  // Edit per seri (6 Nov 2026, revisi keempat):
  //  - Satu konsep pilihan: kotak centang = seri yang sedang DIEDIT form. Popup dibuka dengan semua seri tercentang (pilihan Browse).
  //    Klik di mana saja pada baris = centang / lepas; Shift+klik = rentang. Tanpa centang = form terkunci.
  //  - Tiap seri menyimpan isiannya sendiri (HS, tarif, pungutan lain, alasan, Nama / Jenis Tema). Bila seri tercentang isiannya berbeda,
  //    kolom itu kosong (tanpa keterangan) dan hanya kolom yang diubah yang ditimpa.
  //  - Simpan / Kirim = seri yang DICENTANG (jumlahnya di tombol), dikelompokkan per tema + analisa, jadi satu penetapan bisa
  //    menghasilkan beberapa tema dan beberapa HS. Simpan (7 Nov 2026): cukup Tema + Jenis Tema, isian lain boleh kosong (yang terisi
  //    harus sah). Kirim: semua isian wajib kecuali dokumen. Tombol aktif bila semua seri tercentang memenuhi syaratnya; seri yang
  //    belum memenuhi diberi titik merah. Kirim = Simpan lalu langsung kirim ke Approval (satu tema = satu pengajuan; Undo di toast
  //    hanya membatalkan kirim, seri tetap di draft). Seri yang sudah di draft sendiri (mis. Returned) hanya diperbarui analisanya. Seri yang sedang diajukan,
  //    milik unit lain, atau expired tidak ikut. Popup tetap terbuka selama masih ada seri tersisa.
  // Teks popup berbahasa Indonesia (permintaan pengguna).
  function bukaPenetapanHs(pilihan, selesai) {
    let rows = pilihan.filter(B.bisaAnalisa);
    const exp = pilihan.filter(B.kadaluarsa).length, kunci = pilihan.length - rows.length - exp;
    const lewat = [exp && `${exp} kedaluwarsa`, kunci && `${kunci} draft analis lain / sudah di Basket Nominasi / milik unit lain`].filter(Boolean).join(', ');
    if (!rows.length) return toast('galat', 'Tidak Bisa Menetapkan HS', `Seri terpilih tidak bisa dianalisis: ${lewat}.`);
    let pakai = rows.map(() => true);
    const dipakai = () => rows.filter((r, i) => pakai[i]);
    const sasaran = dipakai;
    let jangkar = null; // baris terakhir yang diklik, untuk Shift+klik
    const bisaKirim = B.boleh.ajukan();
    // seri yang sudah di draft sendiri: hanya analisanya yang diperbarui, tetap di temanya
    const diBasket = r => { const s = B.status(r); return !!(s && s.milikSaya && s.status === 'draft'); };
    const jenisTetap = r => Array.from(new Set((r.penetapan || []).map(p => p.jenis))).join(', ') || (B.ditetapkan(r) ? 'Ditetapkan' : '');
    const htmlSeri = (r, i) => {
      const tetap = an(r).hs;
      const f = B.normFas(r.kodeFas);
      const jt = jenisTetap(r), s = B.status(r);
      return `<tr data-s="${i}"><td><input type="checkbox" data-s="${i}"${pakai[i] ? ' checked' : ''} aria-label="Nomor Dokumen ${esc(r.noPib)} Seri Barang ${esc(r.seri)}"></td>
        <td>${esc(r.noPib)}</td><td class="kanan">${esc(r.seri)}<i class="hp-beda" hidden></i></td>
        <td${tetap ? ` title="${esc('HS Penetapan tersimpan ' + D.fmtHs(tetap))}"` : ''}>${esc(D.fmtHs(r.hs) || '-')}${tetap ? '<i class="hp-titik"></i>' : ''}</td>
        <td class="hp-hst" data-hst></td><td data-tema></td>
        <td title="${esc(f ? (r.kodeFasNama || '').split('; ').join('\n') : 'Tanpa fasilitas')}">${esc(f || '-')}</td>
        <td class="hp-ur" title="${esc(r.uraian || '')}">${s ? `<span class="hp-label kuning" title="${esc('Di draft, tema ' + s.tema)}">Draft</span>` : ''}${jt ? `<span class="hp-label" title="${esc(r.penetapanTeks || 'Sudah ditetapkan')}">${esc(jt)}</span>` : ''}${esc(r.uraian || '-')}</td>
        ${TARIF_HS.map(([k]) => `<td class="kanan hp-trf" data-trf="${k}"></td>`).join('')}<td class="kanan hp-pot" data-pot></td></tr>`;
    };

    // isian per seri { tema, jenis, form (keadaan mentah pasangFormHs) }. Seri yang sudah dianalisa (draft sendiri, mis. Returned)
    // dimulai dari analisa dan temanya
    const KOSONG = () => ({ tema: '', jenis: '', form: { hs: '', hsDiketik: false, alasan: '', lain: [], tarif: { bm: null, ppn: null, pph: null } } });
    const isian = new Map();
    for (const r of rows) {
      const a = an(r), s = B.status(r) || {};
      // draft sendiri yang disimpan tanpa HS tetap dimuat dengan tema dan isiannya
      if (!a.hs && !s.tema) continue;
      const auto = B.tarifOtomatis(r, a.hs) || {};
      isian.set(r, { tema: s.tema || '', jenis: s.jenis || '', form: {
        hs: a.hs || '', hsDiketik: !!a.hs, alasan: a.alasan || '', lain: (a.lain || []).map(x => ({ jenis: x.jenis, tarif: x.tarif == null ? '' : String(x.tarif) })),
        tarif: Object.fromEntries(TARIF_HS.map(([k]) => [k, a[k] != null && a[k] !== auto[k] ? String(a[k]) : null])) } });
    }
    const isianSeri = r => isian.get(r) || KOSONG();
    // Tema / Jenis Tema wajib untuk seri yang belum di draft; seri yang sudah di draft sendiri tetap di temanya.
    // Simpan: Tema + Jenis Tema dan isian yang terisi sah. Kirim: lengkap (HS 8 digit, alasan), dokumen tidak wajib
    const temaAda = r => { const s = isianSeri(r); return diBasket(r) || (!!s.tema && !!s.jenis); };
    const bolehSimpan = r => temaAda(r) && formIsiSah(isianSeri(r).form);
    const bolehKirim = r => temaAda(r) && formHsSah(isianSeri(r).form);
    const kurangSeri = r => { const s = isianSeri(r); return [!diBasket(r) && !s.tema && 'Tema', !diBasket(r) && !s.jenis && 'Jenis Tema', ...formKurang(s.form)].filter(Boolean); };

    modal('Penetapan HS', `
      <div class="hp-wadah">
        <div class="hp-daftar">
          <div class="hp-gulir">
            <table class="hp-tabel">
              <thead><tr><th><input type="checkbox" id="hpSemua" aria-label="Pilih semua"></th><th>Nomor Dokumen</th><th class="kanan">Seri Barang</th><th>HS Code</th><th>HS Penetapan</th><th>Tema</th><th>Kode Fasilitas</th><th>Uraian Barang</th>
                ${TARIF_HS.map(([, l, nama]) => `<th class="kanan" title="${nama} (%)">${l}</th>`).join('')}<th class="kanan" title="Potensi (penetapan − pemberitahuan)">Potensi</th></tr></thead>
              <tbody id="hpList">${rows.map(htmlSeri).join('')}</tbody>
            </table>
          </div>
          <div class="hp-n" aria-live="polite"><span id="hpN"></span><b id="hpTotal"></b></div>
          <p class="hp-catat" id="hpCatat"${lewat ? '' : ' hidden'}>${lewat ? `Tidak ikut: ${esc(lewat)}.` : ''}</p>
        </div>
        <div class="isian">
          <span>Tema</span><button type="button" class="sel pilih" id="hpTema" aria-label="Tema"></button>
          <span>Jenis Tema</span><button type="button" class="sel pilih" id="hpJenis" aria-label="Jenis Tema"></button>
          <span class="hp-sela"></span><span class="hp-sela"></span>
          ${htmlFormHs(false, true)}
        </div>
      </div>`, [
      { teks: 'Batal', kelas: 'btn-garis' },
      // Enter di isian = Simpan (bukan Kirim), supaya tidak terkirim tanpa sengaja
      { teks: 'Simpan', kelas: bisaKirim ? 'btn-garis biru' : 'btn-biru', utama: true, aksi: () => proses(false) },
      ...(bisaKirim ? [{ teks: 'Kirim', kelas: 'btn-biru', aksi: () => proses(true) }] : [])
    ]);
    const md = $('#lapisan .modal');
    md.classList.add('modal-lebar');
    const simpan = $('.modal-kaki [data-i="1"]', md);
    const kirim = $('.modal-kaki [data-i="2"]', md);

    // Simpan seri tercentang ke draft; kirim = lalu langsung kirim ke Approval. false = popup tetap terbuka (masih ada seri tersisa)
    function proses(kirimJuga) {
      const pilih = dipakai();
      if (!pilih.length || !pilih.every(kirimJuga ? bolehKirim : bolehSimpan)) return false;
      // kelompokkan seri menurut isiannya: satu kelompok = satu tema + satu analisa
      const kel = new Map();
      for (const r of pilih) {
        const s = isianSeri(r), isi = isiDariForm(s.form);
        const k = JSON.stringify([s.tema, s.jenis, isi]);
        if (!kel.has(k)) kel.set(k, { tema: s.tema, jenis: s.jenis, isi, rows: [] });
        kel.get(k).rows.push(r);
      }
      let masuk = 0, ubah = 0;
      const temaMasuk = new Set(), hs = new Set();
      for (const g of kel.values()) {
        const baru = g.rows.filter(r => !diBasket(r));
        B.isiAnalisa(g.rows, g.isi);
        if (baru.length) { masuk += B.tambah(baru, g.tema, g.jenis, g.isi.alasan).masuk; temaMasuk.add(g.tema); }
        ubah += g.rows.length - baru.length;
        hs.add(D.fmtHs(g.isi.hs));
      }
      const file = form.file();
      if (file) { unggahKeSeri(pilih, file); form.lepasFile(); }
      const total = pilih.reduce((n, r) => n + ((B.potensi(r) || {}).selisih || { total: 0 }).total, 0);
      const hsAda = Array.from(hs).filter(Boolean);
      const ringkas = (hsAda.length ? `HS ${hsAda.join(', ')}, total potensi ${rupiah(total)}.` : 'HS Penetapan belum diisi.') + (file ? ` Dokumen: ${file.name}.` : '');
      const daftar = kirimJuga ? B.ajukan(pilih, '') : [];
      if (kirimJuga) gambarAkun();
      selesai(pilih);
      if (daftar.length) {
        const n = daftar.reduce((x, a) => x + a.seri.length, 0);
        toast('ok', 'Terkirim ke Approval', `${n} seri` + (daftar.length > 1 ? ` · ${daftar.length} tema` : ' · ' + daftar[0].tema) + `. ${ringkas}`, { teks: 'Undo', fn: () => {
          // Undo hanya membatalkan kirim: seri kembali ke draft dengan analisanya
          if (!daftar.map(a => B.urungkan(a.id)).every(Boolean)) toast('galat', 'Tidak Bisa Undo', 'Analis 2 sudah memproses pengajuan ini.');
          jalankan();
        } });
      } else {
        toast(kirimJuga ? 'galat' : 'ok', kirimJuga ? 'Tersimpan, Belum Terkirim' : 'Tersimpan',
          [masuk && `${masuk} seri masuk draft tema ${Array.from(temaMasuk).join(', ')}`, ubah && `${ubah} seri di draft diperbarui`].filter(Boolean).join(', ') + `. ${ringkas}`);
      }
      // buang seri yang tersimpan; sisa seri (tidak dicentang) tetap dengan isiannya lalu semuanya dicentang
      const sisa = rows.filter(r => !pilih.includes(r));
      if (!sisa.length) return;
      const lama = new Map(rows.map((r, i) => [r, pakai[i]]));
      pilih.forEach(r => isian.delete(r));
      rows = sisa;
      pakai = rows.map(r => lama.get(r));
      if (!pakai.some(Boolean)) pakai.fill(true);
      jangkar = null;
      $('#hpList').innerHTML = rows.map(htmlSeri).join('');
      muatSasaran();
      return false;
    }
    const rapi = v => String(v || '').trim().replace(/\s+/g, ' ');
    const temaKini = () => ({ tema: rapi($('#hpTema').value), jenis: rapi($('#hpJenis').value) });

    // isian gabungan seri sasaran: kolom yang sama di semua seri tampil, yang berbeda kosong
    let dimuat = null, memuat = false;
    const campur = {};
    const sama = (xs, f) => xs.every(x => JSON.stringify(f(x)) === JSON.stringify(f(xs[0])));
    function gabung(rs) {
      const xs = rs.length ? rs.map(isianSeri) : [KOSONG()];
      const g = KOSONG();
      const ambil = (nama, f, set) => { campur[nama] = !sama(xs, f); if (!campur[nama]) set(f(xs[0])); };
      ambil('tema', x => x.tema, v => { g.tema = v; });
      ambil('jenis', x => x.jenis, v => { g.jenis = v; });
      ambil('hs', x => x.form.hs, v => { g.form.hs = v; g.form.hsDiketik = xs[0].form.hsDiketik; });
      if (campur.hs) g.form.hsDiketik = true; // HS berbeda: jangan diisi saran
      ambil('alasan', x => x.form.alasan, v => { g.form.alasan = v; });
      ambil('lain', x => x.form.lain, v => { g.form.lain = v.map(y => ({ ...y })); });
      for (const [k] of TARIF_HS) ambil(k, x => x.form.tarif[k], v => { g.form.tarif[k] = v; });
      return g;
    }
    // kolom yang berubah sejak dimuat ditulis ke semua seri sasaran (kolom lain tetap milik seri masing-masing)
    const BIDANG = [['tema', s => s.tema, (t, s) => { t.tema = s.tema; }], ['jenis', s => s.jenis, (t, s) => { t.jenis = s.jenis; }],
      ['hs', s => s.form.hs, (t, s) => { t.form.hs = s.form.hs; t.form.hsDiketik = true; }], ['alasan', s => s.form.alasan, (t, s) => { t.form.alasan = s.form.alasan; }],
      ['lain', s => s.form.lain, (t, s) => { t.form.lain = s.form.lain.map(y => ({ ...y })); }],
      ...TARIF_HS.map(([k]) => [k, s => s.form.tarif[k], (t, s) => { t.form.tarif[k] = s.form.tarif[k]; }])];
    function catat() {
      const rs = sasaran();
      if (memuat || !rs.length || !dimuat) return;
      const kini = { ...temaKini(), form: form.keadaan() };
      const ganti = BIDANG.filter(([, f]) => JSON.stringify(f(kini)) !== JSON.stringify(f(dimuat)));
      if (!ganti.length) return;
      for (const r of rs) {
        const t = isian.get(r) || KOSONG();
        t.form = { ...t.form, tarif: { ...t.form.tarif } };
        for (const [, , set] of ganti) set(t, kini);
        isian.set(r, t);
      }
      dimuat = kini;
    }
    // form mengikuti sasaran: tanpa sasaran (tidak ada centang dan sorotan) = form terkunci; saran HS untuk seri kosong langsung tercatat
    function muatSasaran() {
      const rs = sasaran();
      const g = gabung(rs);
      memuat = true;
      tema.atur(g.tema);
      jenis.atur(g.jenis);
      form.muat(g.form);
      memuat = false;
      dimuat = g;
      catat();
      dimuat = { ...temaKini(), form: form.keadaan() };
      md.querySelectorAll('.isian input, .isian textarea, .isian select, .isian button').forEach(el => {
        if (!el.closest('.hp-dok')) el.disabled = !rs.length;
      });
      segarSemua();
    }

    // tabel kiri, total, catatan, dan tombol Simpan dari isian tiap seri (tarif kosong = otomatis seri itu)
    function segarSemua() {
      let total = 0, adaHs = false;
      const adaCentang = pakai.some(Boolean);
      const pilih = dipakai();
      // titik merah hanya setelah mulai diisi (ada seri tercentang yang sudah bertema), supaya popup baru tidak penuh tanda
      const mulai = pilih.some(temaAda);
      $('#hpList').querySelectorAll('tr[data-s]').forEach(tr => {
        const i = +tr.dataset.s, r = rows[i];
        const s = isianSeri(r), isi = isiDariForm(s.form);
        const sah = /^\d{8}$/.test(isi.hs);
        const a = sah ? B.tarifOtomatis(r, isi.hs) : null;
        $('input', tr).checked = pakai[i];
        tr.classList.toggle('lepas', adaCentang && !pakai[i]); // redup hanya bila ada yang dicentang
        // titik merah = seri tercentang yang belum bisa disimpan (atau dikirim); tooltip = isian yang kurang
        const kurang = pakai[i] && mulai && (!bolehSimpan(r) || (kirim && !bolehKirim(r))) ? kurangSeri(r) : [];
        const tb = $('.hp-beda', tr);
        tb.hidden = !kurang.length;
        tb.title = kurang.length ? (bolehSimpan(r) ? 'Belum bisa dikirim, belum diisi: ' : 'Belum bisa disimpan, belum diisi: ') + kurang.join(', ') : '';
        $('[data-hst]', tr).textContent = sah ? D.fmtHs(isi.hs) : '-';
        const tm = $('[data-tema]', tr);
        tm.textContent = s.tema || (diBasket(r) ? B.status(r).tema : '-');
        tm.title = s.jenis ? `${tm.textContent} (${s.jenis})` : tm.textContent;
        for (const [k] of TARIF_HS) {
          const td = $(`[data-trf="${k}"]`, tr);
          const v = isi[k] ?? (a ? a[k] : null);
          td.textContent = v == null || Number.isNaN(v) ? '-' : v;
          td.classList.toggle('otomatis', isi[k] == null);
        }
        const lain = sah ? isi.lain.filter(x => x.tarif != null && !Number.isNaN(x.tarif)) : [];
        const p = a ? B.potensi(r, { hs: isi.hs, bm: isi.bm ?? a.bm, ppn: isi.ppn ?? a.ppn, pph: isi.pph ?? a.pph, lain }) : null;
        const v = p && Number.isFinite(p.selisih.total) ? p.selisih.total : null;
        const td = $('[data-pot]', tr);
        td.textContent = v == null ? '-' : rupiah(v);
        td.classList.toggle('nol', v != null && v <= 0);
        if (v != null) { total += v; adaHs = true; }
      });
      // total potensi = semua seri di popup yang sudah punya HS Penetapan dan tarif (tidak menunggu Alasan / Tema)
      $('#hpTotal').textContent = adaHs ? rupiah(total) : '';
      const n = pilih.length;
      const semua = $('#hpSemua');
      semua.checked = n === rows.length;
      semua.indeterminate = n > 0 && n < rows.length;
      $('#hpN').textContent = `${n} dari ${rows.length} seri dipilih`;
      const label = (el, teks, ok, syarat) => {
        el.disabled = !n || !ok;
        el.textContent = n ? `${teks} ${n} seri` : teks;
        el.title = n && !ok ? syarat : '';
      };
      label(simpan, 'Simpan', pilih.every(bolehSimpan), 'Tema dan Jenis Tema wajib diisi; isian yang terisi harus sah');
      if (kirim) label(kirim, 'Kirim', pilih.every(bolehKirim), 'Semua isian wajib diisi, kecuali dokumen');
      const tetap = pilih.filter(r => B.ditetapkan(r)).length;
      const teks = [lewat && `Tidak ikut: ${lewat}.`, tetap && `${tetap} seri sudah ditetapkan (penetapan ulang).`].filter(Boolean).join(' ');
      $('#hpCatat').textContent = teks;
      $('#hpCatat').hidden = !teks;
    }
    const ubahTema = () => { catat(); segarSemua(); };
    const labelTema = (v, nama) => esc(v || nama);

    const jenis = pasangPilih($('#hpJenis'), { nilai: '', label: v => labelTema(v, 'Jenis Tema'), baru: true, lebar: 260,
      daftar: () => B.daftarJenis().map(v => ({ v })), pilih: ubahTema });
    const tema = pasangPilih($('#hpTema'), { nilai: '', label: v => labelTema(v, 'Tema'), baru: true, lebar: 260,
      daftar: () => { const bisa = B.temaBisaHapus(); return B.daftarTema().map(v => ({ v, hapus: bisa.has(v) })); },
      // memilih tema yang sudah ada mengisi jenisnya bila Jenis Tema masih kosong
      pilih: v => {
        const ada = B.baris().map(r => B.status(r)).find(s => s.tema === v && s.jenis);
        if (ada && !$('#hpJenis').value) jenis.atur(ada.jenis);
        ubahTema();
      },
      hapus: (v, segarkanDaftar) => hapusTema(v, () => { selesai([]); segarkanDaftar(); }) });

    // saran HS dan tarif otomatis dari seri sasaran
    const form = pasangFormHs(md, { rows: sasaran, saatCek: () => { catat(); segarSemua(); } });

    // Area centang (kotak + selnya) = tambah / kurangi centang, untuk memilih beberapa; Shift = rentang dari klik terakhir.
    // Bagian lain baris = fokus ke seri itu saja (seri lain dilepas), seperti memilih file; Ctrl+klik = tambah / kurangi, Shift = rentang saja.
    // Form selalu ikut seri tercentang.
    $('#hpList').addEventListener('mousedown', e => { if (e.shiftKey || e.ctrlKey || e.metaKey) e.preventDefault(); }); // tidak menyorot teks
    $('#hpList').addEventListener('click', e => {
      const tr = e.target.closest('tr[data-s]');
      if (!tr) return;
      const i = +tr.dataset.s;
      const cb = $('input', tr);
      const rentang = (a, b, v) => { for (let k = Math.min(a, b); k <= Math.max(a, b); k++) pakai[k] = v; };
      if (e.target.closest('td:first-child') || e.ctrlKey || e.metaKey) {
        const nilai = e.target === cb ? cb.checked : !pakai[i];
        if (e.shiftKey && jangkar != null) rentang(jangkar, i, nilai);
        else pakai[i] = nilai;
      } else {
        const a = e.shiftKey && jangkar != null ? jangkar : i;
        pakai.fill(false);
        rentang(a, i, true);
      }
      if (!e.shiftKey) jangkar = i;
      muatSasaran();
    });
    $('#hpSemua').onchange = e => {
      pakai.fill(e.target.checked);
      jangkar = null;
      muatSasaran();
    };
    muatSasaran();
    $('#hpSemua').focus();
  }

  // ================= Basket =================
  function halProfil() {
    // Basket = ruang Analis 2 / Admin (Analis 1 tidak membuka menu ini; arahan atasan 5 Nov 2026). Sejak rapat 6 Nov 2026 isinya
    // hanya seri yang sudah di-Approve di tahap Approval (Browse): final, tanpa Return / Reject / fitur kembalikan; tinggal
    // Send to SIRENA (bar melayang, konfirmasi). Kolom Sisa Hari (batas 2 tahun) dan Umur Basket (sejak Approve).
    // Baris diwarnai per status seri dan sekaligus saringan (Basket / SIRENA / Expired)
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu kartu-atas" id="kartuProfil">
          <div class="bp-kepala">${tombolKembali()}
            <button class="sel pilih pk-tema" id="pkTema" aria-label="Tema"></button>
            <div class="bp-lipat">${htmlAkun()}</div>
          </div>
          ${lipBlok('pkDasbor', 'Dashboard', '<div class="bp-isi stat-ringkas" id="statProfil"></div>')}
        </section>
        <section class="kartu kartu-tabel">
          <div class="kartu-kepala ringkas">
            <button class="btn btn-garis biru btn-ikon btn-bersih" id="pkStatus" aria-haspopup="dialog" aria-expanded="false"><span class="ik">${IKON.corong}</span></button>
            <button class="btn btn-garis biru btn-ikon" id="pkReset" title="Reset"><span class="ik">${IKON.segar}</span></button>
            <button class="btn btn-garis biru btn-ikon" id="pkExport" title="Export"><span class="ik">${IKON.unduh}</span></button></div>
          <div class="kartu-isi" id="tblProfil"></div>
        </section>
        ${htmlBarPilih(`<button class="biru" id="pkKirim" title="Kirim ke SIRENA"><span class="ik">${IKON.kirim}</span></button>`)}
      </div>`;
    pasangLipat($('#kartuProfil'));

    // isi tabel = seri unit yang sudah di-Approve (Basket), termasuk yang sudah di SIRENA; filter Tema di atas tabel (slide 2.2a)
    let tema = simpanan.baca('sesi:profil-tema', '');
    if (!B.daftarTema(true).includes(tema)) tema = '';
    // filter tema: dropdown dengan cari (tanpa ikon hapus: Basket final)
    const pilihTema = pasangPilih($('#pkTema'), { nilai: tema, label: v => esc(v || 'Semua Tema'), lebar: 260,
      daftar: () => [{ v: '' }].concat(B.daftarTema(true).map(v => ({ v }))),
      pilih: v => { aturTema(v); segarkan(); } });
    const aturTema = v => { tema = v; simpanan.tulis('sesi:profil-tema', v); if ($('#pkTema')) pilihTema.atur(v); };
    // saringan status (semua menyala bawaan), diingat peramban
    let saringSt = { ...SEMUA_STATUS(), ...simpanan.baca('sesi:profil-status', {}) };
    const aturStatus = v => { saringSt = v; simpanan.tulis('sesi:profil-status', v); };
    const semuaStatus = () => STATUS_SERI.every(([k]) => saringSt[k]);
    const dataTema = () => B.baris().filter(r => { const st = isian(r).status; return (st === 'setuju' || st === 'sirena') && !isian(r).manual && (!tema || isian(r).tema === tema); });
    const dataProfil = () => dataTema().filter(r => saringSt[statusSeri(r)]);
    // saringan status = satu ikon corong + dropdown bercentang (seperti Browse): dicentang = tampil; ikon biru penuh bila ada yang
    // dimatikan. Tanpa jumlah per status (sama dengan Flag RE / Cleansing di Browse)
    let popSt = null;
    function isiPopStatus(el) {
      const nyala = STATUS_SERI.filter(([k]) => saringSt[k]).length;
      el.innerHTML = `
        <div class="pb-baris pb-kepala"><label><input type="checkbox" data-semua ${nyala === STATUS_SERI.length ? 'checked' : ''}><b>Status</b></label></div>
        ${STATUS_SERI.map(([k, l, w]) => `<div class="pb-baris"><label><input type="checkbox" data-st="${k}" ${saringSt[k] ? 'checked' : ''}><i class="pb-titik ${w}"></i>${l}</label></div>`).join('')}`;
      el.querySelector('[data-semua]').indeterminate = nyala > 0 && nyala < STATUS_SERI.length;
    }
    const gambarStatus = () => {
      const b = $('#pkStatus');
      if (!b) return;
      const mati = !semuaStatus();
      b.classList.toggle('aktif', mati);
      const tampil = STATUS_SERI.filter(([k]) => saringSt[k]).map(([, l]) => l);
      b.title = mati ? 'Status: ' + (tampil.join(', ') || 'tidak ada') : 'Status';
      b.setAttribute('aria-label', b.title);
      if (popSt && popSt.isConnected) isiPopStatus(popSt);
    };
    isiStat($('#statProfil'), dataProfil());

    // tabel belum ada saat render pertama memanggil setelahRender
    let tabel = null;
    tabel = root.buatTabel($('#tblProfil'), {
      // id dinaikkan tiap kolom bawaan berubah (profil -> basket -> ... -> basket5) supaya pilihan kolom lama tidak menutupi yang baru
      id: 'basket5',
      ingat: true,
      kolom: KOLOM_PROFIL,
      kolomBawaan: KOLOM_BAWAAN_PROFIL.map(k => k.key),
      lebarAksi: 72,
      data: dataProfil,
      centang: true,
      stripRingkas: true,
      setelahRender: () => { aturBarPilih(tabel ? tabel.terpilih().length : 0); gambarStatus(); },
      kelasBaris: kelasWarna,
      dobelKlik: r => { location.hash = '#/smart-pcc/penelitian-skpk/detail-skpk/' + r.id; },
      aksi: () => `<button class="btn-aksi biru" data-aksi="detail" title="Detail">${IKON.dok}</button>`,
      klikAksi(nama, r) { location.hash = '#/smart-pcc/penelitian-skpk/detail-skpk/' + r.id; }
    });

    aturBarPilih(tabel.terpilih().length);
    $('#btnBatalPilih').onclick = () => tabel.kosongkanPilihan();

    const segarkan = () => { tabel.render(); isiStat($('#statProfil'), dataProfil()); };
    const terpilih = () => tabel.terpilih().map(id => D.PER_ID.get(id));

    beritaPulih(!!tema || !semuaStatus() || tabel.adaKeadaan(), () => { aturTema(''); aturStatus(SEMUA_STATUS()); lupakanTabel('basket5'); if ($('#tblProfil')) halProfil(); });

    $('#pkStatus').onclick = e => {
      const el = popSt = bukaPop(e.currentTarget, 'pop-bersih', '');
      if (!el) return;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Status');
      isiPopStatus(el);
      el.onchange = ev => {
        const t = ev.target;
        if (t.dataset.semua != null) aturStatus(Object.fromEntries(STATUS_SERI.map(([k]) => [k, t.checked])));
        else if (t.dataset.st) aturStatus({ ...saringSt, [t.dataset.st]: t.checked });
        else return;
        segarkan();
      };
    };
    $('#pkReset').onclick = () => {
      const sebelum = { tema, status: saringSt, tabel: tabel.keadaan() };
      aturTema('');
      aturStatus(SEMUA_STATUS());
      tabel.reset();
      isiStat($('#statProfil'), dataProfil());
      toast('info', 'Filter Direset', 'Filter tema, status, dan kolom dihapus.', { teks: 'Undo', fn: () => {
        if (!$('#tblProfil')) return;
        aturTema(sebelum.tema);
        aturStatus(sebelum.status);
        tabel.pulihkan(sebelum.tabel);
        isiStat($('#statProfil'), dataProfil());
      } });
    };
    $('#pkExport').onclick = () => {
      const rows = tabel.terfilter();
      unduhXlsx('basket-nominasi.xlsx', tabel.kolomTampil(), rows, 'Basket Nominasi');
      toast('ok', 'Export Selesai', `${rows.length.toLocaleString('id-ID')} baris ke Excel.`);
    };

    // Send to SIRENA seri tercentang yang masih di Basket (yang sudah di SIRENA dilewati); satu tema = satu nomor SRN
    $('#pkKirim').onclick = () => kirimSeri(terpilih(), () => {
      if (!$('#tblProfil')) return;
      tabel.kosongkanPilihan();
      segarkan();
    });
  }

  // ================= Approval (pengajuan) =================
  // halaman pengajuan (bagian Browse sejak 6 Nov 2026; dibuka dari kolom Status / Daftar Analisa): kiri daftar pengajuan, kanan bilah
  // progres + keputusan Analis 2 untuk semua seri yang masih menunggu + tabel seri dengan status per seri.
  // Saringan tahap = dropdown (titik warna + nama + jumlah)
  const SARING_AP = [['review', 'Approval'], ['setuju', 'Basket Nominasi'], ['sirena', 'SIRENA'], ['kembali', 'Dikembalikan'], ['tolak', 'Ditolak']];
  const NAMA_AP = Object.fromEntries(SARING_AP);
  const cocokSaring = (a, f) => !f || a.status === f;
  const nadaAju = a => (a.status === 'tolak' ? 'gagal' : a.status === 'kembali' ? 'balik' : a.status === 'sirena' ? 'kirim' : '');
  // status di daftar: titik warna + nama tahap (tanpa ruas progres)
  const miniAju = a => `<span class="mt ${nadaAju(a)}${a.status === 'setuju' ? ' setuju' : ''}"><i></i>${esc(B.NAMA_STATUS[a.status])}</span>`;
  // tombol keputusan Analis 2 / Admin: Approve / Return / Reject selama ada seri menunggu (stat = status pengajuan atau tahap seri);
  // Send to SIRENA hanya untuk seri di Basket (halaman detail)
  const btnAp = (aksi, kelas, ik, teks) => `<button class="btn ${kelas}" data-ap="${aksi}"><span class="ik">${ik}</span>${teks}</button>`;
  function tombolKeputusan(stat, sirena) {
    if (!B.boleh.tinjau()) return '';
    if (stat === 'review') return btnAp('tolak', 'btn-garis ap-tolak', IKON.silang, 'Tolak') + btnAp('kembalikan', 'btn-garis', IKON.urung, 'Kembalikan') + btnAp('setujui', 'btn-biru', IKON.centang, 'Setujui');
    if (stat === 'setuju' && sirena) return btnAp('kirim', 'btn-biru', IKON.kirim, 'Kirim');
    return '';
  }
  const tombolAju = a => (a ? tombolKeputusan(a.status, false) : '');
  // catatan Analis 2: setiap Return dan Reject (juga sebagian: "n series returned / rejected")
  function htmlAlasan(a) {
    if (!a) return '';
    const kotak = (e, nada, awal) => `<div class="ap-alasan ${nada}" title="${esc(B.namaOleh(e.oleh) + ' · ' + waktuPenuh(e.waktu))}">${avatarHtml(e.oleh, 'kecil')}<span>${awal}${esc(e.catatan)}</span></div>`;
    const ev = a.riwayat.filter(e => (e.aksi === 'kembalikan' || e.aksi === 'tolak') && e.catatan);
    const satu = ev.length === 1 && !a.seri.length;
    return ev.map(e => kotak(e, e.aksi === 'tolak' ? 'gagal' : 'balik', satu ? '' : `<b>${(e.seri || []).length} seri ${e.aksi === 'tolak' ? 'ditolak' : 'dikembalikan'}:</b> `)).join('');
  }

  function detailAju(a) {
    let total = 0;
    // semua seri pengajuan: yang masih di alur, lalu yang dikembalikan / ditolak (status per seri; total Potensi tanpa keduanya)
    const ada = new Set();
    const semua = a.seri.concat(a.dikembalikan || [], a.ditolak || []).filter(x => !ada.has(x.kunci) && ada.add(x.kunci));
    const seri = semua.map(x => {
      const r = D.PER_KUNCI.get(x.kunci);
      if (!r) return '';
      const p = B.potensi(r, x);
      const st = B.statusSeriAju(a, x.kunci);
      if (p && st !== 'kembali' && st !== 'tolak') total += p.selisih.total;
      return `<tr data-detail="${r.id}"><td>${esc(r.noPib)}</td><td class="kanan">${esc(r.seri)}</td><td class="ap-ur" title="${esc(r.uraian || '')}">${t(r.uraian)}</td>
        <td>${t(r.hs)}</td><td><b>${t(x.hs)}</b></td><td class="kanan">${x.bm == null ? '-' : x.bm + '%'}</td><td class="kanan">${p ? rupiah(p.selisih.total) : '-'}</td>
        <td>${miniAju({ status: st })}</td></tr>`;
    }).join('');
    const aksi = tombolAju(a);
    return `
      <div class="ap-kepala">
        <h2 title="${esc(a.id)}">${esc(a.tema)}</h2>
        ${aksi ? `<div class="ap-aksi">${aksi}</div>` : ''}
      </div>
      ${htmlLangkah(B.langkahAju(a))}
      ${htmlAlasan(a)}
      <div class="ap-seri"><table class="ap-tabel">
        <thead><tr><th>Nomor Dokumen</th><th class="kanan">Seri Barang</th><th>Uraian Barang</th><th>HS Code</th><th>HS Penetapan</th><th class="kanan">Tarif BM Penetapan</th><th class="kanan">Potensi</th><th>Status</th></tr></thead>
        <tbody>${seri}</tbody>
        <tfoot><tr><td colspan="6"></td><td class="kanan"><b>${rupiah(total)}</b></td><td></td></tr></tfoot>
      </table></div>`;
  }

  function halApproval(m) {
    let pilihId = m && m[1] ? decodeURIComponent(m[1]) : null;
    if (pilihId && !B.ambilAju(pilihId)) return tidakAda('#/smart-pcc/penelitian-skpk/approval');
    let f = simpanan.baca('sesi:approval-saring', '');
    if (!SARING_AP.some(([k]) => k === f)) f = '';
    // pengajuan yang dibuka lewat tautan (notifikasi, kolom Status) selalu terlihat di daftar
    if (pilihId && !cocokSaring(B.ambilAju(pilihId), f)) f = '';
    // hash ikut pengajuan terpilih tanpa memicu router (tanpa animasi pindah halaman)
    const aturHash = () => {
      const jalan = pilihId ? hrefAju(pilihId) : '#/smart-pcc/penelitian-skpk/approval';
      if (location.hash !== jalan) history.replaceState(null, '', jalan);
      gantiJejak(jalan);
      jalanLalu = jalan.slice(1);
    };
    const kosong = `<div class="ap-kosong"><span class="ik">${IKON.alur}</span></div>`;
    function gambar() {
      const semua = B.daftarAju();
      const tunggu = new Set(B.tugas().map(a => a.id));
      const daftar = semua.filter(a => cocokSaring(a, f)).sort((x, y) => tunggu.has(y.id) - tunggu.has(x.id));
      if (!pilihId || !daftar.some(a => a.id === pilihId)) pilihId = daftar.length ? daftar[0].id : null;
      view.innerHTML = `
        <div class="wadah">
          <section class="kartu kartu-atas"><div class="bp-kepala">
            ${tombolKembali()}
            <button class="sel pilih ap-tahap" id="apTahap" aria-label="Status"></button>
            <div class="bp-lipat">${htmlAkun()}</div>
          </div></section>
          <section class="kartu ap">
            <div class="ap-daftar">${daftar.length ? daftar.map(a => `<button class="ap-item${a.id === pilihId ? ' aktif' : ''}" data-id="${esc(a.id)}"${a.id === pilihId ? ' aria-current="true"' : ''}>
              <span class="ap-item-1"><b>${esc(a.tema)}</b>${tunggu.has(a.id) ? '<i class="ap-tunggu" title="Menunggu Anda"></i>' : ''}</span>
              <span class="ap-item-2">${miniAju(a)}<span class="ap-umur" title="${esc(waktuPenuh(B.waktuAkhir(a)))}">${esc(B.namaOleh(a.oleh))} · ${umur(B.waktuAkhir(a))}</span></span></button>`).join('') : kosong}</div>
            <div class="ap-kanan" id="apDetail">${pilihId ? detailAju(B.ambilAju(pilihId)) : kosong}</div>
          </section>
        </div>`;
      pasangPilih($('#apTahap'), { nilai: f, cari: false, lebar: 200,
        label: v => (v ? `<i class="pp-titik ch-${v}"></i>${esc(NAMA_AP[v])}` : 'Semua Status'),
        daftar: () => [{ v: '', n: semua.length }].concat(SARING_AP.map(([k]) => ({ v: k, n: semua.filter(a => cocokSaring(a, k)).length }))),
        pilih: v => { if (v === f) return; f = v; simpanan.tulis('sesi:approval-saring', f); pilihId = null; gambar(); } });
      gambarAkun();
      aturHash();
    }
    gambar();

    view.onclick = e => {
      const it = e.target.closest('.ap-item');
      if (it) {
        if (it.dataset.id === pilihId) return;
        pilihId = it.dataset.id;
        view.querySelectorAll('.ap-item').forEach(x => { const ya = x === it; x.classList.toggle('aktif', ya); if (ya) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
        const d = $('#apDetail');
        d.innerHTML = detailAju(B.ambilAju(pilihId));
        d.scrollTop = 0;
        d.classList.remove('masuk'); void d.offsetWidth; d.classList.add('masuk');
        aturHash();
        return;
      }
      const tr = e.target.closest('[data-detail]');
      if (tr) { location.hash = '#/smart-pcc/penelitian-skpk/detail-skpk/' + tr.dataset.detail; return; }
      const b = e.target.closest('[data-ap]');
      if (b) aksiAju(B.ambilAju(pilihId), b.dataset.ap, gambar);
    };
  }

  // ================= Basket Detail =================
  // dibuka dengan dobel-klik baris Basket / Browse mode Daftar Analisa (atau tombol biru): bilah progres seri, Penetapan HS satu seri (teks
  // Indonesia seperti popup Penetapan HS), data pokok, dan aksi sesuai peran (Send to Approval / Approve / Return / Reject / Send to SIRENA).
  // Analis 1 hanya membuka seri miliknya sendiri; Analis 2 / Admin semua seri unit
  function halDetail(id) {
    const r = D.PER_ID.get(id);
    const junior = !B.boleh.basket();
    if (!r) return tidakAda(junior ? BERANDA : BASKET);
    const s = B.status(r);
    if (junior && !(s && s.unit && s.milikSaya)) { location.replace(BERANDA); return; }
    const milik = !!(s && s.unit && (s.milikSaya || B.boleh.basket()));
    const a = milik && s.pengajuan ? B.ambilAju(s.pengajuan) : null;
    // dokumen pendukung dan Kirim ke Basket hanya selama seri masih di draft pemiliknya
    const ubah = milik && s.milikSaya && s.status === 'draft';
    const p = milik ? B.potensi(r) : null;
    const DATA = [['Kode Dokumen', r.dokumen], ['HS Code', r.hs], ['Tarif', r.trfBm], ['Kode Fasilitas', r.kodeFas], ['Nama Perusahaan', r.perusahaan], ['NPWP Perusahaan', r.npwp], ['Potensi', p ? rupiah(p.selisih.total) : null]];
    const aksi = (ubah && B.analisaLengkap(s) && B.boleh.ajukan() ? `<button class="btn btn-biru" data-dt="ajukan"><span class="ik">${IKON.kirim}</span>Kirim</button>` : '') +
      (milik && s.unit ? tombolKeputusan(B.tahapSeri(s), true) : '');
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu kartu-atas"><div class="bp-kepala">
          ${tombolKembali()}
          <div class="dt-judul"><b>${esc(r.noPib)} · ${esc(r.seri)}</b><span title="${esc(r.uraian || '')}">${t(r.uraian)}</span></div>
          <div class="bp-lipat">${aksi ? `<div class="ap-aksi">${aksi}</div>` : ''}${htmlAkun()}</div>
        </div></section>
        <section class="kartu dt">
          ${milik ? htmlLangkah(B.langkahSeri(s)) : ''}
          ${htmlAlasan(a || (milik && s.kembali ? B.ambilAju(s.kembali.id) : null))}
          <div class="dt-isi">
            ${milik ? `<div class="dt-form isian">${htmlFormHs(true, false)}</div>` : ''}
            <dl class="dt-data">${DATA.map(([l, v]) => `<dt>${l}</dt><dd>${t(v)}</dd>`).join('')}</dl>
          </div>
          ${milik ? `<div class="dt-dok">
            <div class="dt-dok-kepala"><b>Dokumen Pendukung</b><span class="dt-dok-n" id="dtDokN"></span>
              ${ubah ? `<button class="btn btn-garis biru btn-ikon" id="dtUnggah" title="Unggah" aria-label="Unggah"><span class="ik">${IKON.unggah}</span></button>` : ''}</div>
            <div class="dt-dok-daftar" id="dtDok"></div>
          </div>` : ''}
        </section>
      </div>`;
    gambarAkun();

    // hasil analisa dari Browse, hanya baca (form sama dengan popup Penetapan HS); perbaikan lewat Penetapan HS di Browse
    if (milik) pasangFormHs($('.dt-form'), { rows: () => [r], awal: s, kunci: true });
    if (milik) {
      gambarDokumen(r, ubah);
      if (ubah) $('#dtUnggah').onclick = () => modalUnggah(r, () => gambarDokumen(r, ubah));
    }
    view.onclick = e => {
      const hp = e.target.closest('[data-dok-hapus]');
      if (hp) {
        modal('Hapus Dokumen', `<p>${esc(hp.dataset.nama)}</p>`, [{ teks: 'Batal', kelas: 'btn-garis' },
          { teks: 'Hapus', kelas: 'btn-merah', aksi: () => { L.hapus(hp.dataset.dokHapus).then(() => gambarDokumen(r, ubah)); } }]);
        return;
      }
      const dk = e.target.closest('[data-dok]');
      if (dk) { L.lihat(dk.dataset.dok).catch(() => toast('galat', 'Gagal Membuka', 'File tidak ditemukan')); return; }
      const b = e.target.closest('[data-dt], [data-ap]');
      if (!b) return;
      if (b.dataset.dt === 'ajukan') ajukanSeri([r], () => halDetail(id));
      // keputusan di halaman detail hanya untuk seri ini
      else if (b.dataset.ap === 'kirim') kirimSeri([r], () => jalankan());
      else putusSeri(b.dataset.ap, [r], s.tema, () => jalankan());
    };
  }

  // ---------- dokumen pendukung seri (Basket Detail) ----------
  const L = root.SkpkLampiran;
  const ukuranFile = n => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
  const ekstensi = nama => { const m = /\.([a-z0-9]{1,5})$/i.exec(nama || ''); return m ? m[1].toUpperCase() : 'FILE'; };
  function gambarDokumen(r, ubah) {
    L.daftar(r.kunci).then(d => {
      const el = $('#dtDok');
      if (!el) return;
      $('#dtDokN').textContent = d.length ? d.length : '';
      el.innerHTML = d.map(x => `<div class="dok" data-dok="${esc(x.id)}" role="button" tabindex="0" title="${esc([x.namaFile, ukuranFile(x.ukuran), waktuPenuh(x.waktu)].join(' · '))}">
          <span class="dok-ik e-${esc(ekstensi(x.namaFile).toLowerCase())}">${esc(ekstensi(x.namaFile))}</span>
          <span class="dok-nama">${esc(x.nama)}</span><span class="dok-no">${t(x.nomor)}</span><span class="dok-ket"${x.ket ? ` title="${esc(x.ket)}"` : ''}>${t(x.ket)}</span>
          ${ubah ? `<button class="pop-ikon dok-hapus" data-dok-hapus="${esc(x.id)}" data-nama="${esc(x.nama)}" title="Hapus" aria-label="Hapus"><span class="ik">${IKON.sampah}</span></button>` : ''}</div>`).join('');
    }).catch(() => {});
  }
  // popup upload: file (semua jenis, pilih atau seret), nama dokumen, nomor dokumen, keterangan
  function modalUnggah(r, selesai) {
    let file = null;
    modal('Unggah Dokumen', `<div class="isian dok-form">
        <span>File</span><label class="dok-file" id="dkZona"><input type="file" id="dkInput" hidden><span class="ik">${IKON.unggahAwan}</span><span id="dkFile"></span></label>
        <span>Nama Dokumen</span><input class="inp" id="dkNama" maxlength="150" autocomplete="off">
        <span>Nomor Dokumen</span><input class="inp" id="dkNomor" maxlength="80" autocomplete="off">
        <span>Keterangan</span><textarea class="inp" id="dkKet" rows="3" maxlength="1000"></textarea>
      </div>`, [{ teks: 'Batal', kelas: 'btn-garis' }, { teks: 'Unggah', kelas: 'btn-biru', aksi: () => {
        if (!file || !$('#dkNama').value.trim()) return false;
        const btn = $('#lapisan .modal-kaki [data-i="1"]');
        btn.disabled = true;
        const nama = $('#dkNama').value.trim();
        L.tambah(r.kunci, file, { nama, nomor: $('#dkNomor').value.trim(), ket: $('#dkKet').value.trim(), oleh: B.penggunaKini().id })
          .then(() => { $('#lapisan .modal .tutup').click(); toast('ok', 'Terunggah', nama); selesai(); })
          .catch(() => { btn.disabled = false; toast('galat', 'Gagal Mengunggah', file.name); });
        return false;
      } }]);
    const btn = $('#lapisan .modal-kaki [data-i="1"]');
    const cek = () => { btn.disabled = !(file && $('#dkNama').value.trim()); };
    const pakai = f => {
      if (!f) return;
      file = f;
      $('#dkFile').textContent = f.name + ' · ' + ukuranFile(f.size);
      $('#dkZona').classList.add('ada');
      if (!$('#dkNama').value.trim()) $('#dkNama').value = f.name.replace(/\.[^.]+$/, '');
      cek();
    };
    $('#dkInput').onchange = e => pakai(e.target.files[0]);
    const z = $('#dkZona');
    z.ondragover = e => { e.preventDefault(); z.classList.add('seret'); };
    z.ondragleave = () => z.classList.remove('seret');
    z.ondrop = e => { e.preventDefault(); z.classList.remove('seret'); pakai(e.dataTransfer.files[0]); };
    $('#dkNama').oninput = cek;
    cek();
  }

  // ================= Data History dan SIRENA Manual (halaman transit di Browse, revisi 6 Nov 2026) =================
  // Dua halaman tabel di Browse (ikon di kepala tabel Browse), masing-masing dengan Import:
  //   Data History  = temuan Notul (otomatis dari database), Audit (LHA), dan Penul (LHPU); LHA / LHPU diimport Analis 1
  //   SIRENA Manual = seri yang sudah jadi DNOA / dikirim ke SIRENA di luar SKPK (masa transisi)
  // Import harus sesuai template dan lolos periksa (satu baris error = file ditolak), lalu masuk Approval: Analis 2 / Admin
  // Approve / Reject satu file utuh lewat popup konfirmasi; Admin juga bisa Delete (bypass).
  const I = root.SkpkImpor;
  const ST_IMPOR = { Sistem: '', Disetujui: 'hijau', Approval: 'kuning', Ditolak: 'merah' };
  const NAMA_TEMUAN = { audit: 'Audit (LHA)', penul: 'Penelitian Ulang (LHPU)' };
  const idTabelImpor = h => (h === 'history' ? 'history2' : 'sirena-manual');
  // saring tabel halaman transit ke satu file import (dari notifikasi)
  const saringImpor = (h, id) => simpanan.tulis('tabel:' + idTabelImpor(h), { ...(simpanan.baca('tabel:' + idTabelImpor(h), null) || {}), saring: { impor: '=' + id }, hal: 1, pilih: [] });
  // toast yang ditunda sampai halaman dimuat ulang (Approve / Delete Audit / Penul: mesin flag dihitung saat halaman dimuat)
  try {
    const tunda = JSON.parse(sessionStorage.getItem('skpk-v2:toast') || 'null');
    sessionStorage.removeItem('skpk-v2:toast');
    if (tunda) setTimeout(() => toast(tunda[0], tunda[1], tunda[2]), 300);
  } catch { /* abaikan */ }

  const kolStatusImpor = { key: 'status', label: 'Status', tipe: 'teks', daftar: true, lebar: 120, nilai: x => x.status,
    isi: x => `<span class="imp-st" title="${esc(x.ketStatus || '')}">${ST_IMPOR[x.status] ? `<i class="pb-titik ${ST_IMPOR[x.status]}"></i>` : ''}${esc(x.status)}</span>` };
  const kolImpor = { key: 'impor', label: 'Import', tipe: 'teks', daftar: true, lebar: 170, nilai: x => x.impor || null, isi: x => (x.impor ? `<span title="${esc(x.file || '')}">${esc(x.impor)}</span>` : '-') };
  const ketStatus = a => {
    const e = a.riwayat[a.riwayat.length - 1];
    return [a.file, 'Diunggah oleh ' + B.namaOleh(a.oleh) + ', ' + waktuPenuh(a.waktu), e.aksi !== 'ajukan' ? I.NAMA_STATUS[a.status] + ' oleh ' + B.namaOleh(e.oleh) + ', ' + waktuPenuh(e.waktu) + (e.catatan ? ': ' + e.catatan : '') : ''].filter(Boolean).join('\n');
  };
  // file import yang tampil: Approval dan Rejected (Approved Audit / Penul sudah di riwayat mesin; Deleted tidak tampil)
  const imporTampil = jenis => I.daftar(jenis).filter(a => a.status === 'review' || a.status === 'tolak' || (a.status === 'setuju' && jenis.includes('sirena')));

  function halHistory() { halTransit('history'); }
  function halManual() { halTransit('manual'); }

  function halTransit(h) {
    const hist = h === 'history';
    const jenis = hist ? ['audit', 'penul'] : ['sirena'];
    const tinjau = I.boleh.tinjau();
    const idTabel = idTabelImpor(h);
    view.innerHTML = `
      <div class="wadah">
        <section class="kartu kartu-tabel">
          <div class="kartu-kepala ringkas">${tombolKembali()}
            <button class="btn btn-garis biru btn-ikon" id="trReset" title="Reset" aria-label="Reset"><span class="ik">${IKON.segar}</span></button>
            ${I.boleh.impor() ? `<button class="btn btn-garis biru btn-ikon" id="trImport" title="Import" aria-label="Import" aria-haspopup="dialog"><span class="ik">${IKON.unggah}</span></button>` : ''}
            <button class="btn btn-garis biru btn-ikon" id="trExport" title="Export" aria-label="Export"><span class="ik">${IKON.unduh}</span></button>
            ${htmlAkun()}</div>
          <div class="kartu-isi" id="tblTransit"></div>
        </section>
        ${tinjau ? htmlBarPilih(`<button class="biru" id="trSetuju" title="Setujui"><span class="ik">${IKON.centang}</span></button>
          <button id="trTolak" title="Tolak"><span class="ik">${IKON.xLingkaran}</span></button>
          ${I.boleh.hapus() ? `<button id="trHapus" title="Hapus"><span class="ik">${IKON.sampah}</span></button>` : ''}`) : ''}
      </div>`;
    gambarAkun();

    // baris tabel; id angka tetap selama isi tidak berubah (centang memakai id)
    let rows = [];
    const hitung = () => { rows = hist ? barisHistory() : barisManual(); };
    hitung();
    const kolom = hist ? [
      kolStatusImpor,
      { key: 'jenis', label: 'Jenis Penetapan', tipe: 'teks', daftar: true, lebar: 150 },
      { key: 'npwp', label: 'NPWP Perusahaan', tipe: 'teks', lebar: 160 },
      { key: 'st', label: 'Nomor ST', tipe: 'teks', lebar: 160 },
      { key: 'lha', label: 'Nomor LHA / LHPU', tipe: 'teks', lebar: 170 },
      { key: 'awal', label: 'Tanggal Awal Periode', tipe: 'tanggal', lebar: 160, isi: x => tgl(x.awal) },
      { key: 'akhir', label: 'Tanggal Akhir Periode', tipe: 'tanggal', lebar: 160, isi: x => tgl(x.akhir) },
      { key: 'dokumen', label: 'Kode Dokumen', tipe: 'teks', lebar: 130 },
      { key: 'kantor', label: 'Kode Kantor', tipe: 'teks', lebar: 190 },
      { key: 'noDaftar', label: 'Nomor Dokumen', tipe: 'teks', lebar: 130 },
      { key: 'tglDaftar', label: 'Tanggal Dokumen', tipe: 'tanggal', lebar: 140, isi: x => tgl(x.tglDaftar) },
      { key: 'seri', label: 'Seri Barang', tipe: 'angka', lebar: 110 },
      { key: 'temuan', label: 'Uraian Temuan', tipe: 'teks', lebar: 260, isi: x => `<span title="${esc(x.temuan || '')}">${t(x.temuan && x.temuan.length > 80 ? x.temuan.slice(0, 80) + '…' : x.temuan)}</span>` },
      kolImpor
    ] : [
      kolStatusImpor, kolImpor,
      { key: 'kantor', label: 'Kode Kantor', tipe: 'teks', lebar: 120, nilai: x => x.r.kantorKode },
      { key: 'noDaftar', label: 'Nomor Dokumen', tipe: 'teks', lebar: 140, nilai: x => x.r.noPib },
      { key: 'tglDaftar', label: 'Tanggal Dokumen', tipe: 'tanggal', lebar: 140, nilai: x => x.r.tglDaftar, isi: x => tgl(x.r.tglDaftar) },
      { key: 'seri', label: 'Seri Barang', tipe: 'angka', lebar: 110, nilai: x => x.r.seri },
      { key: 'uraian', label: 'Uraian Barang', tipe: 'teks', lebar: 200, nilai: x => x.r.uraian },
      { key: 'perusahaan', label: 'Nama Perusahaan', tipe: 'teks', lebar: 180, nilai: x => x.r.perusahaan },
      { key: 'hs', label: 'HS Code', tipe: 'teks', lebar: 110, nilai: x => x.r.hs },
      { key: 'hsTetap', label: 'HS Penetapan', tipe: 'teks', lebar: 120, nilai: x => x.x.hsTetap },
      { key: 'trfTetap', label: 'Tarif BM Penetapan', tipe: 'angka', lebar: 140, nilai: x => x.x.bm, isi: x => x.x.bm + '%' },
      { key: 'potensi', label: 'Potensi', tipe: 'angka', lebar: 150, nilai: x => (x.pot ? Math.round(x.pot.selisih.total) : null), isi: x => (x.pot ? rupiah(x.pot.selisih.total) : '-') },
      { key: 'tema', label: 'Tema', tipe: 'teks', daftar: true, lebar: 190, nilai: x => x.x.tema },
      { key: 'dnoa', label: 'Nomor DNOA', tipe: 'teks', lebar: 150, nilai: x => x.x.dnoa },
      { key: 'tglDnoa', label: 'Tanggal DNOA', tipe: 'tanggal', lebar: 130, nilai: x => x.x.tglDnoa, isi: x => tgl(x.x.tglDnoa) },
      { key: 'sirena', label: 'Nomor SIRENA', tipe: 'teks', lebar: 150, nilai: x => x.x.sirena || null },
      { key: 'tglSirena', label: 'Tanggal SIRENA', tipe: 'tanggal', lebar: 130, nilai: x => x.x.tglSirena || null, isi: x => tgl(x.x.tglSirena) }
    ];
    let tabel = null;
    tabel = root.buatTabel($('#tblTransit'), {
      id: idTabel,
      ingat: true,
      nomor: true,
      kolom,
      data: () => rows,
      centang: tinjau,
      stripRingkas: true,
      kelasBaris: x => (x.status === 'Approval' ? 'st-kuning' : x.status === 'Ditolak' ? 'st-merah' : ''),
      setelahRender: () => aturBarPilih(tabel ? tabel.terpilih().length : 0)
    });
    beritaPulih(tabel.adaKeadaan(), () => tabel.pulihkan({}));
    const segarkan = () => { hitung(); tabel.kosongkanPilihan(); gambarAkun(); };

    $('#trReset').onclick = () => {
      const sebelum = tabel.keadaan();
      tabel.reset();
      toast('info', 'Filter Direset', 'Filter kolom dihapus.', { teks: 'Undo', fn: () => { if ($('#tblTransit')) tabel.pulihkan(sebelum); } });
    };
    $('#trExport').onclick = () => {
      const rs = tabel.terfilter();
      unduhXlsx(hist ? 'riwayat-penetapan.xlsx' : 'import-dnoa.xlsx', tabel.kolomTampil(), rs, hist ? 'Riwayat Penetapan' : 'Import DNOA');
      toast('ok', 'Export Selesai', `${rs.length.toLocaleString('id-ID')} baris ke Excel.`);
    };
    if ($('#trImport')) $('#trImport').onclick = () => modalImpor(jenis, segarkan);
    if (tinjau) {
      $('#btnBatalPilih').onclick = () => tabel.kosongkanPilihan();
      const fileTerpilih = () => {
        const pilih = new Set(tabel.terpilih());
        return Array.from(new Set(rows.filter(x => pilih.has(x.id) && x.impor).map(x => x.impor)));
      };
      $('#trSetuju').onclick = () => putusImpor('setujui', fileTerpilih(), h, segarkan);
      $('#trTolak').onclick = () => putusImpor('tolak', fileTerpilih(), h, segarkan);
      if ($('#trHapus')) $('#trHapus').onclick = () => putusImpor('hapus', fileTerpilih(), h, segarkan);
    }
  }

  // Data History: riwayat mesin (notul, contoh, import yang sudah Approved) + import yang masih Approval / Rejected
  function barisHistory() {
    // import yang masih Approval / Rejected di atas, lalu riwayat mesin
    const out = [];
    let id = 1e6;
    for (const a of imporTampil(['audit', 'penul'])) {
      const ref = I.JENIS[a.jenis].ref;
      for (const x of a.baris) {
        const r = D.PER_KUNCI.get(x.kunci);
        out.push({
          id: id++, jenis: NAMA_TEMUAN[a.jenis], npwp: r ? r.npwp : null, st: x.noSt, lha: x.noLha, awal: x.awal || null, akhir: x.akhir || null, dokumen: D.DOK.label,
          kantor: r ? r.kantor : x.kantor, noDaftar: x.nomor, tglDaftar: x.tanggal, seri: x.seri,
          temuan: `${ref} ${x.noLha}: HS ${D.fmtHs(r ? r.hs : x.hs) || '-'} ditetapkan menjadi ${D.fmtHs(x.hsTetap)}, tarif BM ${x.bm}%` + (x.ket ? '. ' + x.ket : ''),
          rowId: r ? r.id : null, status: I.NAMA_STATUS[a.status], impor: a.id, file: a.file, ketStatus: ketStatus(a)
        });
      }
    }
    return out.concat(D.HISTORY.map(x => (x.impor ? { ...x, ketStatus: (() => { const a = I.ambil(x.impor); return a ? ketStatus(a) : x.file; })() } : x)));
  }
  // SIRENA Manual: semua file yang tampil; titik kuning di Status = seri itu menimpa Draft / Approval / Basket (pemegang di tooltip)
  function barisManual() {
    const out = [];
    let id = 1;
    for (const a of imporTampil(['sirena'])) {
      for (const x of a.baris) {
        const r = D.PER_KUNCI.get(x.kunci);
        if (!r) continue;
        const s = B.status(r);
        const lama = a.status === 'setuju' ? (s && s.manual && s.manual.ditimpa) : a.status === 'review' && s && s.status !== 'sirena' ? { status: s.status, oleh: s.oleh, tema: s.tema } : null;
        const ket = ketStatus(a) + (lama ? '\nMenimpa: ' + ({ draft: 'Draft', ajukan: 'Approval', setuju: 'Basket Nominasi' }[lama.status] || lama.status) + ' - ' + B.namaOleh(lama.oleh) + ' · ' + lama.tema : '');
        out.push({ id: id++, r, x, impor: a.id, file: a.file, status: I.NAMA_STATUS[a.status], ketStatus: ket, timpa: !!lama,
          pot: B.potensi(r, { hs: x.hsTetap, bm: x.bm, ppn: x.ppn ?? null, pph: x.pph ?? null, lain: [] }) });
      }
    }
    return out;
  }

  // ---------- popup Import: jenis, template, file, hasil periksa, Send to Approval ----------
  function modalImpor(jenisList, selesai) {
    const E = root.SkpkEkspor;
    let jenis = jenisList[0], hasil = null, namaFile = '';
    modal('Import', `<div class="imp">
        <div class="imp-atas">
          ${jenisList.length > 1 ? `<div class="imp-jenis" role="radiogroup" aria-label="Jenis">${jenisList.map(j => `<button type="button" role="radio" data-jenis="${j}">${esc(I.JENIS[j].nama)} (${esc(I.JENIS[j].ref)})</button>`).join('')}</div>` : `<b class="imp-nama">${esc(I.JENIS[jenis].nama)}</b>`}
          <button type="button" class="btn btn-garis biru btn-ikon" id="impTemplate" title="Unduh Template" aria-label="Unduh Template"><span class="ik">${IKON.unduh}</span></button>
        </div>
        <label class="dok-file" id="impZona"><input type="file" id="impInput" accept=".xlsx,.csv" hidden><span class="ik">${IKON.unggahAwan}</span><span id="impFile"></span></label>
        <div id="impHasil" aria-live="polite"></div>
      </div>`, [
      { teks: 'Batal', kelas: 'btn-garis' },
      { teks: 'Kirim', kelas: 'btn-biru', utama: true, aksi: () => {
        if (!hasil || hasil.galat.length || !hasil.baris.length) return false;
        const a = I.ajukan(jenis, namaFile, hasil.baris);
        if (!a) { toast('galat', 'Import Gagal', 'Import tidak bisa disimpan.'); return false; }
        selesai();
        toast('ok', 'Terkirim ke Approval', `${a.id} · ${a.baris.length} baris`);
      } }
    ]);
    const kirim = $('#lapisan .modal-kaki [data-i="1"]');
    const gambarJenis = () => document.querySelectorAll('#lapisan [data-jenis]').forEach(b => { const on = b.dataset.jenis === jenis; b.classList.toggle('aktif', on); b.setAttribute('aria-checked', String(on)); });
    const atur = () => { kirim.disabled = !(hasil && !hasil.galat.length && hasil.baris.length); };
    function gambarHasil() {
      const el = $('#impHasil');
      if (!hasil) { el.innerHTML = ''; return atur(); }
      if (hasil.galat.length) {
        const g = hasil.galat;
        el.innerHTML = `<div class="imp-galat"><div class="imp-galat-kepala"><span class="ik">${IKON.xLingkaran}</span><b>File ditolak</b><span>${g.length} error</span>
            <button type="button" class="btn btn-garis btn-ikon" id="impLaporan" title="Unduh Error" aria-label="Unduh Error"><span class="ik">${IKON.unduh}</span></button></div>
          <ol class="imp-galat-daftar">${g.slice(0, 200).map(x => `<li>${x.baris ? `<b>Baris ${x.baris}</b>` : ''}${x.kolom ? `<span class="imp-kol">${esc(x.kolom)}</span>` : ''}${x.nilai ? `<span class="imp-nilai">${esc(x.nilai)}</span>` : ''}<span>${esc(x.pesan)}</span></li>`).join('')}</ol></div>`;
        $('#impLaporan').onclick = () => {
          const kols = [{ key: 'baris', label: 'Baris', tipe: 'angka' }, { key: 'kolom', label: 'Kolom', tipe: 'teks', lebar: 180 }, { key: 'nilai', label: 'Nilai', tipe: 'teks', lebar: 180 }, { key: 'pesan', label: 'Error', tipe: 'teks', lebar: 420 }];
          E.unduh(E.xlsx(kols, g, { sheet: 'Error', namaMeta: 'File', meta: [['File', namaFile], ['Jenis', I.JENIS[jenis].nama], ['Jumlah error', g.length]] }), namaFile.replace(/\.[^.]+$/, '') + '-error.xlsx', E.TIPE.xlsx);
        };
      } else el.innerHTML = `<div class="imp-ok"><span class="ik">${IKON.cekLingkaran}</span><b>${hasil.baris.length}</b> baris siap</div>`;
      atur();
    }
    async function pakai(f) {
      if (!f) return;
      namaFile = f.name;
      $('#impFile').textContent = f.name;
      $('#impZona').classList.add('ada');
      hasil = null;
      $('#impHasil').innerHTML = '<div class="imp-ok">…</div>';
      atur();
      hasil = await I.periksa(jenis, f);
      gambarHasil();
    }
    let fileKini = null;
    const inp = $('#impInput'), z = $('#impZona');
    inp.onchange = () => { fileKini = inp.files[0]; pakai(fileKini); inp.value = ''; };
    z.ondragover = e => { e.preventDefault(); z.classList.add('seret'); };
    z.ondragleave = () => z.classList.remove('seret');
    z.ondrop = e => { e.preventDefault(); z.classList.remove('seret'); fileKini = e.dataTransfer.files[0]; pakai(fileKini); };
    document.querySelectorAll('#lapisan [data-jenis]').forEach(b => { b.onclick = () => {
      jenis = b.dataset.jenis;
      gambarJenis();
      if (fileKini) pakai(fileKini);
    }; });
    $('#impTemplate').onclick = () => E.unduh(I.templateXlsx(jenis), 'template-' + I.JENIS[jenis].nama.toLowerCase().replace(/\W+/g, '-') + '.xlsx', E.TIPE.xlsx);
    gambarJenis();
    atur();
  }

  // ---------- keputusan import: Approve / Reject (Analis 2 / Admin), Delete (Admin) satu file utuh, dengan popup konfirmasi ----------
  function putusImpor(aksi, ids, h, selesai) {
    const P = {
      setujui: { judul: 'Setujui', tombol: 'btn-biru', selesai: 'Disetujui', boleh: a => a.status === 'review',
        pesan: h === 'manual' ? 'Seri menjadi SIRENA dan menimpa Draft, Approval, dan Basket Nominasi. Tidak bisa dikembalikan.' : 'Temuan masuk ke Riwayat Penetapan.' },
      tolak: { judul: 'Tolak', tombol: 'btn-merah', selesai: 'Ditolak', catatan: true, boleh: a => a.status === 'review', pesan: 'Seluruh file ditolak.' },
      hapus: { judul: 'Hapus', tombol: 'btn-merah', selesai: 'Dihapus', catatan: true, boleh: a => a.status === 'review' || a.status === 'setuju', pesan: 'Import dihapus (Admin).' }
    }[aksi];
    const as = ids.map(I.ambil).filter(a => a && P.boleh(a));
    if (!as.length) return toast('galat', 'Tidak Bisa Diproses', aksi === 'hapus' ? 'Pilih import.' : 'Pilih import yang menunggu Approval.');
    const lewat = ids.length - as.length;
    modal(P.judul, `<ul class="imp-daftar">${as.map(a => `<li><b>${esc(a.id)}</b><span>${esc(a.file)}</span><span>${a.baris.length} baris · ${esc(B.namaOleh(a.oleh))}</span></li>`).join('')}</ul>
      <p class="ap-peringatan"><span class="ik">${IKON.segitiga}</span>${P.pesan}</p>
      ${P.catatan ? '<textarea class="inp ap-catatan-isi" id="apCatatan" rows="3" aria-label="Catatan"></textarea>' : ''}`, [
      { teks: 'Batal', kelas: 'btn-garis' },
      { teks: P.judul, kelas: P.tombol, aksi: () => {
        const el = $('#apCatatan');
        const c = el ? el.value.trim() : '';
        if (P.catatan && !c) { el.classList.add('galat'); el.focus(); return false; }
        let n = 0, muatUlang = false;
        for (const a of as) {
          const hsl = I[aksi](a.id, c);
          if (hsl) { n++; if (hsl.muatUlang) muatUlang = true; }
        }
        if (!n) { toast('galat', 'Gagal', 'Import ini sudah berubah.'); return; }
        const pesan = `${n} file` + (lewat ? ` (${lewat} dilewati)` : '');
        if (muatUlang) {
          selesai(); // centang dilepas dulu supaya tidak "dipulihkan" setelah muat ulang
          try { sessionStorage.setItem('skpk-v2:toast', JSON.stringify(['ok', P.selesai, pesan])); } catch { /* abaikan */ }
          location.reload();
          return;
        }
        selesai();
        toast('ok', P.selesai, pesan);
      } }
    ]);
    setTimeout(() => { const c = $('#apCatatan'); if (c) { c.focus(); c.oninput = () => c.classList.remove('galat'); } });
  }

  function tidakAda(balik) {
    view.innerHTML = `<div class="wadah"><div class="analisis-kosong">Data tidak ditemukan. <a href="${balik}" style="color:var(--biru)">Kembali</a></div></div>`;
  }

  // ---------- router ----------
  const RUTE = [
    [/^\/smart-pcc\/browse-pib$/, 'browse-pib', 'BROWSE', halBrowse],
    [/^\/smart-pcc\/browse-pib\/transaksional\/(\d+)$/, 'browse-pib', 'DATA TRANSAKSIONAL', m => halTransaksional(Number(m[1]))],
    [/^\/smart-pcc\/penelitian-skpk$/, 'penelitian-skpk', 'BASKET NOMINASI', halProfil],
    [/^\/smart-pcc\/penelitian-skpk\/detail-skpk\/(\d+)$/, 'penelitian-skpk', 'BASKET NOMINASI', m => halDetail(Number(m[1]))],
    [/^\/smart-pcc\/browse-pib\/data-history$/, 'browse-pib', 'RIWAYAT PENETAPAN', halHistory],
    // Approval = tahap sebelum Basket, bagian dari Browse sejak 6 Nov 2026 (alamat lama tetap)
    [/^\/smart-pcc\/penelitian-skpk\/approval(?:\/([^/]+))?$/, 'browse-pib', 'APPROVAL', halApproval],
    [/^\/smart-pcc\/browse-pib\/sirena-manual$/, 'browse-pib', 'IMPORT DNOA', halManual]
  ];
  let jalanLalu = '';
  function jalankan() {
    const jalan = location.hash.replace(/^#/, '') || '/';
    // Data History pindah dari Basket ke Browse (6 Nov 2026): alamat lama dialihkan
    if (/^\/smart-pcc\/penelitian-skpk\/data-history$/.test(jalan)) { location.replace(HREF_HISTORY); return; }
    const rute = RUTE.find(([re]) => re.test(jalan));
    if (!rute) { location.replace('#/smart-pcc/browse-pib'); return; }
    let [re, menu, judul, fn] = rute;
    // Analis 1 tidak membuka Basket (Basket, Approval, Data History; arahan atasan 5 Nov 2026): menu disembunyikan, alamatnya
    // dialihkan ke Browse. Detail seri miliknya sendiri tetap bisa dibuka dari Browse mode Daftar Analisa, dengan menu aktif Browse
    const junior = !B.boleh.basket();
    document.querySelectorAll('.sb-daun a[data-menu="penelitian-skpk"], .sb-ikon[data-menu="penelitian-skpk"]').forEach(a => { a.hidden = junior; });
    if (junior && (menu === 'penelitian-skpk' || fn === halApproval)) {
      if (fn !== RUTE[3][3]) { location.replace(BERANDA); return; }
      menu = 'browse-pib';
      judul = 'BROWSE';
    }
    // detail seri yang belum masuk Basket (Draft / Approval) = bagian Browse
    if (fn === RUTE[3][3]) {
      const r = D.PER_ID.get(Number(jalan.match(re)[1]));
      const tp = r && B.tahapSeri(B.status(r));
      if (tp !== 'setuju' && tp !== 'sirena') { menu = 'browse-pib'; judul = 'BROWSE'; }
    }
    catatJejak(location.hash);
    $('#judulHal').textContent = judul;
    document.title = judul.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace('Sirena', 'SIRENA').replace('Dnoa', 'DNOA') + ' · SKPK';
    // Browse, Basket, dan Approval muat satu layar: yang bergulir hanya tabel / daftar
    document.body.classList.toggle('satu-layar', fn === halBrowse || fn === halProfil || fn === halApproval || fn === halHistory || fn === halManual);
    document.querySelectorAll('.sb-daun a, .sb-ikon[data-menu]').forEach(a => {
      const aktif = a.dataset.menu === menu;
      a.classList.toggle('aktif', aktif);
      if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    // pindah halaman: isi dan judul masuk dengan animasi singkat (dimatikan oleh prefers-reduced-motion)
    if (!muatPertama && jalanLalu !== jalan) for (const el of [view, $('#judulHal')]) { el.classList.remove('masuk-hal'); void el.offsetWidth; el.classList.add('masuk-hal'); }
    jalanLalu = jalan;
    view.onclick = null;
    fn(jalan.match(re));
    gambarAkun();
    muatPertama = false;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', jalankan);
  jalankan();
})(window);
