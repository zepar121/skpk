/*
 * Tabel bersama SKPK v2, meniru tabel prototipe To-Be (..\website-skpk): judul ringkas dengan menu kolom, sel aktif dan
 * pilihan rentang ala Excel, salin (Ctrl+C), ringkasan Sum/Average di status bar (hanya baris di halaman yang tampil), pin kolom, ubah lebar,
 * paginasi dengan nomor halaman yang bisa diketik, dan virtual scrolling. Kolom yang tampil dan urutannya tetap (kolomBawaan):
 * tanpa pemilih kolom dan tanpa seret judul untuk memindah kolom (permintaan 5 Nov 2026); pin tetap lewat menu kolom.
 * Sengaja TIDAK meniru: dropdown saringan khas Excel (daftar nilai dicentang) dan ikon "buka detail" di kiri baris.
 * Menu kolom ringkas (6 Nov 2026): kotak Search paling atas, lalu satu baris tombol ikon Sort naik / turun (tooltip ikut tipe: A to Z /
 * Smallest to Largest / Oldest to Newest), Custom Sort, Pin, Autofit. Kolom yang variasinya sedikit (daftar: true, atau teks dengan
 * <= BATAS_DAFTAR nilai unik) punya drop list nilai yang baru muncul saat kotak Search diklik / diketik; centang beberapa nilai = "=nilai"
 * (sama persis), salah satu cocok. Kotak Search juga menerima tempelan daftar (satu nilai per baris, mis. kolom NPWP dari Excel): tiap
 * baris menjadi chip, bukan satu teks panjang. Saringan banyak nilai disimpan sebagai teks berpemisah baris baru.
 * Seluruh teks tampilan berbahasa Inggris; nama kolom ditampilkan persis seperti label di config.
 *
 * buatTabel(wadah, {
 *   kolom: [{ key, label, lebar, tipe?: 'teks'|'angka'|'tanggal', nilai?: r => nilai mentah, isi?: r => html,
 *             saring?: false (tanpa kotak cari), daftar?: true | false (drop list nilai; bawaan: otomatis) }],
 *   kolomBawaan: [key],          // kolom yang tampil, urut (bawaan: semua); kolom lain tetap terbaca (mis. untuk Advance Filter)
 *   data: () => rows,            // dipanggil ulang tiap render
 *   aksi: r => html, klikAksi: (nama, r, el) => {},
 *   centang: true, nomor: true,  // kotak centang / nomor urut di kiri (selalu menempel)
 *   stripRingkas: true,          // strip pilihan hanya muncul untuk tawaran "pilih semua hasil saringan"
 *   beku: n,                     // bawaan: n kolom pertama di-pin
 *   ringkas: rows => html,       // ringkasan di status bar (mis. jumlah PIB, NPWP, nilai)
 *   id: 'browse', ingat: true,   // kunci localStorage; ingat = saringan, urutan, halaman, centang ikut diingat
 *   setelahRender: total => {},
 *   kelasBaris: r => 'kelas',     // kelas tambahan per baris (mis. warna status)
 *   dobelKlik: r => {}            // dobel-klik baris = buka detail
 * }) -> { render, reset, terpilih, terfilter, kosongkanPilihan, lepasPilihan, keadaan, pulihkan, adaKeadaan, kolomTampil,
 *         terhubung }
 */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const simpan = {
    baca(k) { try { const v = localStorage.getItem('skpk-asli:' + k); return v ? JSON.parse(v) : null; } catch { return null; } },
    tulis(k, v) { try { localStorage.setItem('skpk-asli:' + k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };
  const UKURAN = [50, 100, 250, 500, 0]; // 0 = semua
  const LEBAR_MIN = 50, LEBAR_MAKS = 900;
  const TINGGI = 36;      // tinggi baris (px), tetap supaya virtual scrolling cukup menghitung
  const VIRTUAL = 120;    // di atas jumlah baris ini hanya baris di sekitar layar yang digambar
  const LEBAR_CEK = 40, LEBAR_NO = 52;
  const urutTeks = new Intl.Collator('id', { numeric: true, sensitivity: 'base' }).compare;
  const fmtAngka = n => n.toLocaleString('id-ID', { maximumFractionDigits: 4 });

  // angka dari teks ketikan: "1.000.000", "2,5", "Rp 5000", "10%"
  function keAngka(s) {
    if (typeof s === 'number') return Number.isFinite(s) ? s : null;
    let t = String(s == null ? '' : s).replace(/\s/g, '').replace(/^rp\.?/i, '').replace(/%$/, '');
    if (!t) return null;
    t = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  // kotak cari kolom: >5, >=5, <5, <=5, =5, 10..20 (angka), * dan ? (wildcard), selain itu "mengandung"
  // banyak nilai (satu per baris: tempelan daftar atau centang drop list) = salah satu cocok
  function buatUji(q) {
    const daftar = pisahDaftar(q);
    if (daftar.length > 1) { const uji = daftar.map(buatUji1); return x => uji.some(u => u(x)); }
    return buatUji1(daftar[0] || '');
  }
  function buatUji1(q) {
    const s = q.trim().toLowerCase();
    const rentang = s.match(/^(.+?)\.\.(.+)$/);
    if (rentang && keAngka(rentang[1]) != null && keAngka(rentang[2]) != null) {
      const a = keAngka(rentang[1]), b = keAngka(rentang[2]);
      return x => { const n = keAngka(x); return n != null && n >= Math.min(a, b) && n <= Math.max(a, b); };
    }
    const banding = s.match(/^(>=|<=|>|<|=)\s*(.+)$/);
    if (banding && keAngka(banding[2]) != null) {
      const v = keAngka(banding[2]), op = banding[1];
      return x => {
        const n = keAngka(x);
        if (n == null) return false;
        return op === '>' ? n > v : op === '>=' ? n >= v : op === '<' ? n < v : op === '<=' ? n <= v : n === v;
      };
    }
    // =teks = sama persis (pilihan dari drop list nilai); huruf besar/kecil diabaikan
    if (s[0] === '=' && s.length > 1) {
      const v = s.slice(1).trim();
      return x => String(x).trim().toLowerCase() === v;
    }
    if (/[*?]/.test(s)) {
      const re = new RegExp(s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
      return x => re.test(String(x));
    }
    // angka berpemisah (NPWP 01.234.567.8-901.000, nomor dokumen): cocok juga bila digitnya sama, apa pun pemisahnya
    const dig = digitSaja(s);
    if (dig) return x => { const t = String(x); return t.toLowerCase().includes(s) || t.replace(/\D/g, '').includes(dig); };
    return x => String(x).toLowerCase().includes(s);
  }
  // tanggal yyyy-mm-dd juga dicari dalam bentuk tampilnya (dd-mm-yyyy)
  const teksTanggal = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) + ' ' + v.slice(8, 10) + '-' + v.slice(5, 7) + '-' + v.slice(0, 4) : v);

  const svg = d => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IK = {
    bawah: svg('<path d="M4.5 6.5L8 10l3.5-3.5"/>'),
    saring: svg('<path d="M2.5 3.5h11L9.5 8.5v4l-3 1.5V8.5z"/>'),
    naik: svg('<path d="M8 13V3M4.5 6.5L8 3l3.5 3.5"/>'),
    turun: svg('<path d="M8 3v10M4.5 9.5L8 13l3.5-3.5"/>'),
    az: svg('<path d="M3 12V7.5a1.5 1.5 0 0 1 3 0V12M3 9.5h3M9 4h3.5L9 9h3.5M11 11v2.5M9.5 12.5L11 14l1.5-1.5"/>'),
    za: svg('<path d="M9 4h3.5L9 9h3.5M3 12V7.5a1.5 1.5 0 0 1 3 0V12M3 9.5h3M11 11v2.5M9.5 12.5L11 14l1.5-1.5"/>'),
    kustom: svg('<path d="M2.5 4h6M2.5 8h4.5M2.5 12h3"/><path d="M12 3v10M10 11l2 2 2-2"/>'),
    tambah: svg('<path d="M8 3.5v9M3.5 8h9"/>'),
    atas: svg('<path d="M4.5 9.5L8 6l3.5 3.5"/>'),
    kecilBesar: svg('<path d="M4 3v10M2 11l2 2 2-2M8.5 12.5h1.5M8.5 9h3M8.5 5.5h4.5"/>'),
    besarKecil: svg('<path d="M4 3v10M2 11l2 2 2-2M8.5 12.5h4.5M8.5 9h3M8.5 5.5h1.5"/>'),
    lamaBaru: svg('<rect x="7.5" y="3.5" width="6" height="6" rx="1"/><path d="M7.5 5.5h6M4 3v10M2 11l2 2 2-2M9.5 12.5h4"/>'),
    baruLama: svg('<rect x="7.5" y="6.5" width="6" height="6" rx="1"/><path d="M7.5 8.5h6M4 3v10M2 11l2 2 2-2M9.5 3.5h4"/>'),
    pin: svg('<path d="M6 2.5h4l-.7 3.5 2.2 2.2V9.5h-7V8.2L6.7 6z"/><path d="M8 9.5v4"/>'),
    pas: svg('<path d="M2.5 3v10M13.5 3v10M5 8h6M6.5 6L5 8l1.5 2M9.5 6L11 8l-1.5 2"/>'),
    cari: svg('<circle cx="7" cy="7" r="4.5"/><path d="M13.5 13.5l-3.3-3.3"/>'),
    x: svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
    pegang: svg('<path d="M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01" stroke-width="2.4"/>'),
    cek: svg('<path d="M3.5 8.5l3 3 6-7"/>'),
    awal: svg('<path d="M4.5 4v8M11.5 4.5L8 8l3.5 3.5"/>'),
    mundur: svg('<path d="M10 4.5L6.5 8l3.5 3.5"/>'),
    maju: svg('<path d="M6 4.5L9.5 8 6 11.5"/>'),
    akhir: svg('<path d="M11.5 4v8M4.5 4.5L8 8l-3.5 3.5"/>'),
    kosong: svg('<circle cx="7" cy="7" r="4.5"/><path d="M13.5 13.5l-3.3-3.3M5.5 5.5l3 3M8.5 5.5l-3 3"/>')
  };
  // label urut mengikuti tipe kolom, seperti Excel
  const LABEL_URUT = {
    teks: { naik: ['az', 'Urutkan A ke Z'], turun: ['za', 'Urutkan Z ke A'] },
    angka: { naik: ['kecilBesar', 'Urutkan Terkecil ke Terbesar'], turun: ['besarKecil', 'Urutkan Terbesar ke Terkecil'] },
    tanggal: { naik: ['lamaBaru', 'Urutkan Terlama ke Terbaru'], turun: ['baruLama', 'Urutkan Terbaru ke Terlama'] }
  };
  // tanggal "yyyy-mm-dd..." atau "dd-mm-yyyy" / "dd/mm/yyyy" -> angka yyyymmddhhmmss untuk diurutkan
  function keWaktu(v) {
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) return +(m[1] + m[2] + m[3] + (m[4] || '00') + (m[5] || '00') + (m[6] || '00'));
    m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    return m ? +(m[3] + m[2] + m[1] + '000000') : null;
  }
  const AGREGAT = [['jumlah', 'Jumlah'], ['rata', 'Rata-rata'], ['hitung', 'Hitungan'], ['hitungAngka', 'Hitungan Angka'], ['min', 'Min'], ['maks', 'Maks']];
  const isian = el => el && el.closest && el.closest('input:not([type=checkbox]), select, textarea, [contenteditable]');
  const pesan = (judul, isi) => { if (root.skpkToast) root.skpkToast('info', judul, isi); };

  // satu menu melayang terbuka pada satu waktu (menu kolom, pemilih kolom, ringkasan pilihan)
  let menuAktif = null;
  function tutupMenu() {
    if (!menuAktif) return;
    const m = menuAktif;
    menuAktif = null;
    m.el.remove();
    if (m.jangkar) m.jangkar.setAttribute('aria-expanded', 'false');
    if (m.saatTutup) m.saatTutup();
  }
  function pasangMenu(el, jangkar, opsi = {}) {
    tutupMenu();
    document.body.appendChild(el);
    const r = jangkar.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = opsi.kanan ? r.right - w : r.left;
    x = Math.max(8, Math.min(innerWidth - w - 8, x));
    let y = r.bottom + 4;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    jangkar.setAttribute('aria-expanded', 'true');
    menuAktif = { el, jangkar, saatTutup: opsi.saatTutup };
  }

  // ---------- daftar nilai bertumpuk ----------
  // teks tempelan (kolom Excel, Notepad) dipecah per baris / tab: tiap baris satu nilai, bukan satu teks panjang; urutan dijaga, duplikat dibuang
  const pisahDaftar = t => Array.from(new Set(String(t || '').split(/[\r\n\t]+/).map(v => v.trim()).filter(Boolean)));
  // digit saja bila teks hanya berisi angka dan pemisah (. - / spasi) dengan >= 6 digit; selain itu null
  const digitSaja = t => { const v = String(t).trim(); if (!/^[\d.\-/\s]+$/.test(v)) return null; const d = v.replace(/\D/g, ''); return d.length >= 6 ? d : null; };

  // ---------- drop list nilai (menu kolom dan Advance Filter) ----------
  // nilai unik teks, urut A-Z; null bila lebih dari batas (kolom dianggap terlalu bervariasi)
  const BATAS_DAFTAR = 30;
  function nilaiUnik(rows, ambil, batas) {
    const set = new Set();
    for (const r of rows) {
      const v = ambil(r);
      if (v == null || v === '' || v === '-') continue;
      set.add(String(v));
      if (batas && set.size > batas) return null;
    }
    return Array.from(set).sort(urutTeks);
  }
  // pasang drop list di bawah kotak isian: baru tampil saat kotak diklik atau diketik (bukan saat fokus otomatis), menyempit sesuai
  // ketikan, panah atas / bawah + Enter untuk memilih, Esc menutup daftar saja. ambil() = daftar nilai (dipanggil saat pertama tampil).
  // opsi.wadah = taruh daftar di dalam elemen itu (menu kolom); tanpa wadah = melayang di body (Advance Filter)
  function pasangDaftarNilai(inp, ambil, saatPilih, opsi = {}) {
    let nilai = null, el = null, aktif = -1, cocok = [];
    const buka = () => {
      if (nilai == null) nilai = ambil() || [];
      if (!nilai.length) return;
      if (!el) {
        el = document.createElement('div');
        el.className = 'tg-daftar-nilai' + (opsi.wadah ? '' : ' melayang');
        el.setAttribute('role', 'listbox');
        el.addEventListener('mousedown', e => e.preventDefault()); // fokus tetap di kotak isian
        el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { aktif = +b.dataset.i; pilih(cocok[aktif]); } });
        (opsi.wadah || document.body).appendChild(el);
      }
      el.hidden = false;
      gambar();
    };
    const tutup = () => { if (el) { if (opsi.wadah) el.hidden = true; else { el.remove(); el = null; } } aktif = -1; };
    const tampil = () => !!el && !el.hidden;
    function gambar() {
      const q = inp.value.trim().replace(/^=/, '').toLowerCase();
      cocok = q ? nilai.filter(v => v.toLowerCase().includes(q)) : nilai;
      if (aktif >= cocok.length) aktif = cocok.length - 1;
      const ada = opsi.terpilih ? opsi.terpilih() : null;
      el.innerHTML = cocok.length ? cocok.map((v, i) => `<button type="button" class="tg-dn-i${i === aktif ? ' aktif' : ''}" role="option" data-i="${i}" title="${esc(v)}"${ada ? ` aria-selected="${ada.has(v)}"` : ''}>${ada ? `<i class="tg-dn-cek${ada.has(v) ? ' on' : ''}"></i>` : ''}${esc(v)}</button>`).join('')
        : '<div class="tg-dn-kosong">Tidak ada yang cocok</div>';
      if (!opsi.wadah) {
        const r = inp.getBoundingClientRect();
        el.style.minWidth = r.width + 'px';
        el.style.left = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.left)) + 'px';
        const h = el.offsetHeight;
        el.style.top = (r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
      }
      const b = el.querySelector('.aktif');
      if (b) b.scrollIntoView({ block: 'nearest' });
    }
    // multi (opsi.terpilih ada): pilih = centang / lepas, daftar tetap terbuka
    function pilih(v) {
      if (v == null) return;
      if (opsi.terpilih) { saatPilih(v); if (tampil()) gambar(); return; }
      tutup();
      saatPilih(v);
    }
    inp.addEventListener('mousedown', () => { if (!tampil()) setTimeout(buka); });
    inp.addEventListener('input', () => { aktif = -1; if (tampil()) gambar(); else buka(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!tampil()) return buka();
        aktif = Math.max(0, Math.min(cocok.length - 1, aktif + (e.key === 'ArrowDown' ? 1 : -1)));
        gambar();
      } else if (e.key === 'Enter' && tampil() && aktif >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pilih(cocok[aktif]);
      } else if (e.key === 'Escape' && tampil()) {
        e.stopPropagation();
        tutup();
      }
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) tutup(); }, 120));
    return { tutup, segar: () => { if (tampil()) gambar(); } };
  }

  // Kotak nilai bertumpuk (menu kolom dan Advance Filter). Satu nilai = diketik seperti biasa. Menempel beberapa baris (daftar NPWP,
  // uraian, nama perusahaan) atau mencentang drop list = tiap nilai menjadi chip; saringan = salah satu chip cocok. Selama ada chip,
  // ketikan hanya mempersempit drop list; Enter / keluar dari kotak menambahkannya sebagai chip (kecuali ketikan itu dipakai mencari
  // nilai yang lalu dicentang). Backspace di kotak kosong = hapus chip terakhir. Nilai keluar sebagai teks: tanpa chip = ketikan;
  // dengan chip = chip dipisah baris baru plus "\n" penutup (tanda daftar, walau chip hanya satu).
  // o = { nilai, ubah(teks), label, placeholder, prefiks ('=' = centangan drop list sama persis), daftar?: () => nilai[], wadahDaftar,
  //       pilihPertama?() saat centang pertama, sah?(v) -> chip merah bila false }
  function pasangKotakDaftar(box, o) {
    const pre = o.prefiks || '';
    const awal = String(o.nilai || '');
    let chip = awal.includes('\n') ? pisahDaftar(awal) : [];
    let dariDaftar = false;
    box.classList.add('tg-tag');
    box.innerHTML = `<input type="text" class="tg-tag-inp" autocomplete="off" spellcheck="false" aria-label="${esc(o.label || 'Nilai')}">`;
    const inp = box.querySelector('input');
    inp.value = chip.length ? '' : awal;
    const nilaiKini = () => (chip.length ? chip.join('\n') + '\n' : inp.value);
    const kirim = () => o.ubah(nilaiKini());
    const teksChip = v => (pre && v.startsWith(pre) ? v.slice(pre.length) : v);
    let dl = null;
    function gambar() {
      box.querySelectorAll('.tg-chip, .tg-tag-x').forEach(x => x.remove());
      const frag = document.createDocumentFragment();
      chip.forEach((v, i) => {
        const c = document.createElement('span');
        const t = teksChip(v);
        c.className = 'tg-chip' + (pre && v.startsWith(pre) ? ' persis' : '') + (o.sah && !o.sah(t) ? ' galat' : '');
        c.title = t;
        c.innerHTML = `<span>${esc(t)}</span><button type="button" data-chip="${i}" title="Hapus" aria-label="Hapus ${esc(t)}">${IK.x}</button>`;
        frag.appendChild(c);
      });
      box.insertBefore(frag, inp);
      if (chip.length > 1) box.insertAdjacentHTML('beforeend', `<button type="button" class="tg-tag-x" title="Hapus semua (${chip.length})" aria-label="Hapus semua">${IK.x}</button>`);
      box.classList.toggle('berchip', chip.length > 0);
      inp.placeholder = chip.length ? '' : (o.placeholder || '');
      if (dl) dl.segar();
    }
    const tambah = vs => { for (const v of vs) if (!chip.includes(v)) chip.push(v); };
    function komit() {
      const t = inp.value.trim();
      if (chip.length && t && !dariDaftar) { tambah([t]); inp.value = ''; gambar(); kirim(); }
      else if (chip.length && dariDaftar) inp.value = '';
      dariDaftar = false;
    }
    if (o.daftar) dl = pasangDaftarNilai(inp, o.daftar, v => {
      const x = pre + v, i = chip.indexOf(x);
      if (i >= 0) chip.splice(i, 1);
      else { if (!chip.length && o.pilihPertama) o.pilihPertama(); chip.push(x); }
      dariDaftar = true;
      gambar();
      kirim();
    }, { wadah: o.wadahDaftar, terpilih: () => new Set(chip.filter(v => !pre || v.startsWith(pre)).map(teksChip)) });
    inp.addEventListener('input', () => { dariDaftar = false; if (!chip.length) kirim(); });
    inp.addEventListener('paste', e => {
      const vs = pisahDaftar((e.clipboardData || window.clipboardData).getData('text'));
      if (!vs.length || (vs.length < 2 && !chip.length)) return; // satu nilai tanpa chip: tempel biasa
      e.preventDefault();
      const ketik = inp.value.trim();
      if (!chip.length && ketik) tambah([ketik]);
      tambah(vs);
      inp.value = '';
      dariDaftar = false;
      gambar();
      kirim();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && chip.length && inp.value.trim() && !dariDaftar) {
        e.preventDefault();
        e.stopImmediatePropagation();
        komit();
      } else if (e.key === 'Backspace' && !inp.value && chip.length) {
        chip.pop();
        gambar();
        kirim();
      }
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp && box.isConnected) komit(); }, 130));
    // klik area kotak (di luar chip / tombol) = fokus ke kotak ketik; tombol chip tidak mencuri fokus
    box.addEventListener('mousedown', e => {
      if (e.target.closest('button')) e.preventDefault();
      else if (e.target !== inp) { e.preventDefault(); inp.focus(); }
    });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-chip]');
      if (b) { chip.splice(+b.dataset.chip, 1); gambar(); kirim(); inp.focus(); return; }
      if (e.target.closest('.tg-tag-x')) { chip = []; inp.value = ''; gambar(); kirim(); inp.focus(); }
    });
    gambar();
    return {
      input: inp,
      nilai: nilaiKini,
      komit,
      kosongkan() { chip = []; inp.value = ''; dariDaftar = false; gambar(); kirim(); }
    };
  }
  document.addEventListener('pointerdown', e => {
    if (menuAktif && !menuAktif.el.contains(e.target) && !menuAktif.jangkar.contains(e.target)) tutupMenu();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuAktif) { const j = menuAktif.jangkar; tutupMenu(); if (j && j.focus) j.focus(); } });
  addEventListener('resize', tutupMenu);
  // gulir halaman menutup menu; gulir di dalam tabel tidak (bisa terjadi sendiri saat hasil saringan memendek)
  addEventListener('scroll', e => {
    if (menuAktif && !menuAktif.el.contains(e.target) && !(e.target.classList && e.target.classList.contains('tg-gulir'))) tutupMenu();
  }, true);

  function buatTabel(wadah, cfg) {
    const SEMUA = cfg.kolom;
    const PER_KEY = new Map(SEMUA.map(k => [k.key, k]));
    const nilai = (k, r) => (k.nilai ? k.nilai(r) : r[k.key]);
    const kosongNilai = v => v == null || v === '' || v === '-';

    // tipe kolom (perataan, urutan, operator) dari isi bila tidak ditentukan
    const contoh = cfg.data().slice(0, 300);
    for (const k of SEMUA) {
      if (k.tipe) continue;
      const v = contoh.map(r => nilai(k, r)).filter(x => !kosongNilai(x));
      k.tipe = v.length && v.every(x => typeof x === 'number') ? 'angka' : v.length && v.every(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x)) ? 'tanggal' : 'teks';
    }
    const lebarAwal = k => k.lebar || (k.tipe === 'angka' ? 120 : k.tipe === 'tanggal' ? 110 : 150);

    const id = cfg.id;
    // lebar kolom Actions; tabel dengan satu tombol aksi boleh lebih sempit (lebarAksi)
    const LEBAR_AKSI = cfg.lebarAksi || 92;
    const baca = n => (id ? simpan.baca(n + ':' + id) : null);
    const tulis = (n, v) => { if (id) simpan.tulis(n + ':' + id, v); };
    const bawaanKolom = () => (cfg.kolomBawaan || SEMUA.map(k => k.key)).filter(k => PER_KEY.has(k));
    const bawaanPin = () => bawaanKolom().slice(0, cfg.beku || 0);

    // kunci tersimpan dinaikkan (kolom3, pin3, lebar3) saat nama kolom diseragamkan dengan Excel, supaya tata letak lama tidak terbaca
    const pinTersimpan = baca('pin3');
    const st = {
      saring: {}, hal: 1, ukuran: 50, pilih: new Set(), urut: [], // urut: [{ key, arah: 'naik'|'turun' }], level pertama dulu
      lebar: baca('lebar3') || {},
      kolom: bawaanKolom(), // kolom dan urutannya tetap (tanpa pemilih kolom / seret judul)
      pin: Array.isArray(pinTersimpan) ? pinTersimpan.filter(k => PER_KEY.has(k)) : bawaanPin(),
      aktif: null,      // { i (indeks di hasil saringan), key }
      jangkar: null,    // ujung lain rentang (Shift)
      kolPilih: [],     // kolom yang dipilih utuh lewat judulnya
      agregat: simpan.baca('agregat') || 'jumlah',
      rows: [], awal: 0, isi: []
    };
    if (!st.kolom.length) st.kolom = bawaanKolom();
    // kolom pin selalu paling kiri, urut sesuai daftar kolom
    function rapikanPin() {
      st.pin = st.pin.filter(k => st.kolom.includes(k));
      st.kolom = st.kolom.filter(k => st.pin.includes(k)).concat(st.kolom.filter(k => !st.pin.includes(k)));
    }
    rapikanPin();
    const tampil = () => st.kolom.map(k => PER_KEY.get(k));
    const lebar = k => st.lebar[k.key] || lebarAwal(k);
    const simpanKolom = () => tulis('pin3', st.pin);

    // posisi kiri kolom menempel (centang, nomor, kolom pin). Kolom pin paling banyak 60% lebar tabel supaya area geser
    // tetap lega; di layar sempit sisa pin ikut bergulir (pilihan pin tetap tersimpan).
    function posisiKiri() {
      let x = (cfg.centang ? LEBAR_CEK : 0) + (cfg.nomor ? LEBAR_NO : 0);
      const batas = (wadah.clientWidth || Infinity) * 0.6;
      const kiri = {};
      let akhir = null;
      for (const k of tampil()) {
        if (!st.pin.includes(k.key) || (akhir && x + lebar(k) > batas)) break;
        kiri[k.key] = x; x += lebar(k); akhir = k.key;
      }
      return { kiri, lebarTetap: x, akhir };
    }

    // ---------- kerangka ----------
    function gambarKepala() {
      const ks = tampil();
      const { kiri, akhir: akhirPin } = posisiKiri();
      const tetapKiri = (cfg.centang ? LEBAR_CEK : 0);
      const totalLebar = (cfg.centang ? LEBAR_CEK : 0) + (cfg.nomor ? LEBAR_NO : 0) + ks.reduce((s, k) => s + lebar(k), 0) + (cfg.aksi ? LEBAR_AKSI : 0);
      const th = k => {
        const pin = k.key in kiri;
        const kelas = ['t-' + k.tipe, pin && 'tg-pin', k.key === akhirPin && 'tg-pin-akhir'].filter(Boolean).join(' ');
        return `<th data-kol="${esc(k.key)}" class="${kelas}"${pin ? ` style="left:${kiri[k.key]}px"` : ''}>
          <div class="tg-th"><button type="button" class="tg-th-label" data-label="${esc(k.key)}" title="${esc(k.label)}"><span class="judul-kolom">${esc(k.label)}</span><span class="tg-urut"></span></button>
          <button type="button" class="tg-th-menu" data-menu="${esc(k.key)}" aria-haspopup="menu" aria-expanded="false" aria-label="Menu kolom ${esc(k.label)}" title="Menu kolom">${IK.bawah}</button></div>
          <span class="tg-ubah" data-ubah="${esc(k.key)}" aria-hidden="true"></span></th>`;
      };
      wadah.innerHTML = `
        <div class="tg">
          <div class="tg-pilihan" hidden></div>
          <div class="tg-gulir" tabindex="0" aria-label="Tabel">
            <table class="tg-tabel" style="width:${totalLebar}px">
              <colgroup>${cfg.centang ? `<col style="width:${LEBAR_CEK}px">` : ''}${cfg.nomor ? `<col style="width:${LEBAR_NO}px">` : ''}${ks.map(k => `<col style="width:${lebar(k)}px">`).join('')}${cfg.aksi ? `<col style="width:${LEBAR_AKSI}px">` : ''}</colgroup>
              <thead><tr>
                ${cfg.centang ? `<th class="tg-cek tg-tetap" style="left:0"><label class="tg-cek-isi" title="Pilih semua di halaman ini"><input type="checkbox" data-semua aria-label="Pilih semua di halaman ini"></label></th>` : ''}
                ${cfg.nomor ? `<th class="tg-no tg-tetap t-angka" style="left:${tetapKiri}px"><span class="judul-kolom">No</span></th>` : ''}
                ${ks.map(th).join('')}
                ${cfg.aksi ? '<th class="tg-aksi"><span class="judul-kolom">Aksi</span></th>' : ''}
              </tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="tg-status">
            <div class="tg-status-kiri"></div>
            <div class="tg-status-kanan"><button type="button" class="tg-agregat" hidden aria-haspopup="menu" aria-expanded="false"></button><nav class="tg-pager" aria-label="Paginasi"></nav></div>
          </div>
        </div>`;
      const g = ambil('.tg-gulir');
      g.addEventListener('scroll', () => { if (virtual()) jadwalVirtual(); }, { passive: true });
      tandaiKepala();
    }
    const ambil = s => wadah.querySelector(s);

    // ---------- saring dan urut ----------
    const adaSaring = () => Object.entries(st.saring).some(([k, v]) => v !== '' && st.kolom.includes(k));
    function terfilter() {
      const aktif = Object.entries(st.saring).filter(([k, v]) => v !== '' && PER_KEY.has(k));
      let rows = cfg.data();
      if (aktif.length) {
        const uji = aktif.map(([key, v]) => [PER_KEY.get(key), buatUji(v)]);
        rows = rows.filter(r => uji.every(([k, u]) => {
          const x = nilai(k, r);
          return !kosongNilai(x) && u(k.tipe === 'tanggal' ? teksTanggal(x) : x);
        }));
      }
      return urutkan(rows);
    }
    // urut berlapis: level pertama dulu, nilai yang sama diurutkan level berikutnya.
    // Kosong selalu di bawah; kolom angka sebagai angka, kolom tanggal menurut waktu, teks urutan alami ("seri 2" sebelum "seri 10")
    function urutkan(rows) {
      const L = st.urut.map(u => ({ k: PER_KEY.get(u.key), arah: u.arah === 'turun' ? -1 : 1 })).filter(u => u.k);
      if (!L.length) return rows;
      const kunci = (k, v) => {
        if (kosongNilai(v)) return null;
        if (k.tipe === 'angka') { const n = keAngka(v); return n == null ? String(v) : n; }
        if (k.tipe === 'tanggal') { const w = keWaktu(v); return w == null ? String(v) : w; }
        return v;
      };
      return rows.map((r, i) => [r, L.map(u => kunci(u.k, nilai(u.k, r))), i]).sort((a, b) => {
        for (let j = 0; j < L.length; j++) {
          const x = a[1][j], y = b[1][j];
          if (x == null || y == null) { if ((x == null) !== (y == null)) return x == null ? 1 : -1; continue; }
          const c = typeof x === 'number' && typeof y === 'number' ? x - y
            : typeof x === 'number' ? -1 : typeof y === 'number' ? 1 : urutTeks(String(x), String(y));
          if (c) return c * L[j].arah;
        }
        return a[2] - b[2];
      }).map(a => a[0]);
    }
    const levelUrut = key => st.urut.findIndex(u => u.key === key);

    // ---------- isi tabel ----------
    const virtual = () => st.isi.length > VIRTUAL;
    let rentangVirtual = [0, 0];
    function htmlBaris(r, iHal) {
      const ks = tampil();
      const { kiri, akhir: akhirPin } = posisiKiri();
      const i = st.awal + iHal;
      const kelas = [st.pilih.has(r.id) && 'dipilih', cfg.kelasBaris && cfg.kelasBaris(r)].filter(Boolean).join(' ');
      return `<tr data-id="${r.id}" data-i="${i}" class="${kelas}">
        ${cfg.centang ? `<td class="tg-cek tg-tetap" style="left:0"><label class="tg-cek-isi"><input type="checkbox" data-pilih="${r.id}" ${st.pilih.has(r.id) ? 'checked' : ''} aria-label="Pilih baris"></label></td>` : ''}
        ${cfg.nomor ? `<td class="tg-no tg-tetap t-angka" style="left:${cfg.centang ? LEBAR_CEK : 0}px">${i + 1}</td>` : ''}
        ${ks.map(k => {
          const v = nilai(k, r);
          const pin = k.key in kiri;
          const teks = k.isi ? k.isi(r) : esc(kosongNilai(v) ? '-' : k.tipe === 'angka' ? fmtAngka(v) : v);
          const judul = !k.isi && k.tipe === 'teks' && v != null && String(v).length > lebar(k) / 8 ? ` title="${esc(v)}"` : '';
          return `<td data-k="${esc(k.key)}" class="t-${k.tipe}${pin ? ' tg-pin' : ''}${k.key === akhirPin ? ' tg-pin-akhir' : ''}"${pin ? ` style="left:${kiri[k.key]}px"` : ''}${judul}>${teks}</td>`;
        }).join('')}
        ${cfg.aksi ? `<td class="tg-aksi">${cfg.aksi(r)}</td>` : ''}
      </tr>`;
    }
    const jumlahKolom = () => st.kolom.length + (cfg.centang ? 1 : 0) + (cfg.nomor ? 1 : 0) + (cfg.aksi ? 1 : 0);
    function gambarBadan(paksa) {
      const tbody = ambil('tbody');
      if (!st.isi.length) {
        tbody.innerHTML = `<tr class="tg-kosong"><td colspan="${jumlahKolom()}"><div class="tg-kosong-isi">${IK.kosong}<span>Data tidak ditemukan</span>${adaSaring() ? '<button type="button" class="tautan" data-hapus-saring>Hapus filter kolom</button>' : ''}</div></td></tr>`;
        return;
      }
      if (!virtual()) {
        tbody.innerHTML = st.isi.map(htmlBaris).join('');
        rentangVirtual = [0, st.isi.length];
      } else {
        const g = ambil('.tg-gulir');
        const atas = Math.max(0, Math.floor(g.scrollTop / TINGGI) - 15);
        const bawah = Math.min(st.isi.length, Math.ceil((g.scrollTop + g.clientHeight) / TINGGI) + 15);
        if (!paksa && atas >= rentangVirtual[0] && bawah <= rentangVirtual[1]) return;
        const a = Math.max(0, atas - 20), b = Math.min(st.isi.length, bawah + 20);
        rentangVirtual = [a, b];
        const n = jumlahKolom();
        tbody.innerHTML = (a ? `<tr class="tg-pengisi"><td colspan="${n}" style="height:${a * TINGGI}px"></td></tr>` : '') +
          st.isi.slice(a, b).map((r, j) => htmlBaris(r, a + j)).join('') +
          (b < st.isi.length ? `<tr class="tg-pengisi"><td colspan="${n}" style="height:${(st.isi.length - b) * TINGGI}px"></td></tr>` : '');
      }
      tandaiPilihan();
    }
    let jadwal = 0;
    function jadwalVirtual() { if (!jadwal) jadwal = requestAnimationFrame(() => { jadwal = 0; gambarBadan(false); }); }

    function render(keAtas) {
      const rows = terfilter();
      st.rows = rows;
      const total = rows.length;
      const ukuran = st.ukuran || Math.max(1, total);
      const jmlHal = Math.max(1, Math.ceil(total / ukuran));
      if (st.hal > jmlHal) st.hal = jmlHal;
      st.awal = (st.hal - 1) * ukuran;
      st.isi = rows.slice(st.awal, st.awal + ukuran);
      if (st.aktif && (st.aktif.i >= total || !st.kolom.includes(st.aktif.key))) st.aktif = st.jangkar = null;
      st.kolPilih = st.kolPilih.filter(k => st.kolom.includes(k));
      if (keAtas) ambil('.tg-gulir').scrollTop = 0;
      gambarBadan(true);
      tandaiKepala();
      const semua = ambil('[data-semua]');
      if (semua) semua.checked = st.isi.length > 0 && st.isi.every(r => st.pilih.has(r.id));
      gambarPilihanStrip();
      gambarStatus(total, jmlHal);
      if (cfg.ingat && id) simpan.tulis('tabel:' + id, keadaan());
      if (cfg.setelahRender) cfg.setelahRender(total);
    }

    // judul: tanda urut, kolom tersaring, kolom terpilih / kolom sel aktif
    function tandaiKepala() {
      wadah.querySelectorAll('thead th[data-kol]').forEach(th => {
        const key = th.dataset.kol;
        const lv = levelUrut(key);
        const urut = lv < 0 ? null : st.urut[lv].arah;
        if (urut) th.setAttribute('aria-sort', urut === 'turun' ? 'descending' : 'ascending'); else th.removeAttribute('aria-sort');
        th.querySelector('.tg-urut').innerHTML = urut ? (urut === 'turun' ? IK.turun : IK.naik) + (st.urut.length > 1 ? `<sup>${lv + 1}</sup>` : '') : '';
        const disaring = !!st.saring[key];
        const m = th.querySelector('.tg-th-menu');
        m.classList.toggle('aktif', disaring);
        m.innerHTML = disaring ? IK.saring : IK.bawah;
        m.title = disaring ? 'Filter: ' + pisahDaftar(st.saring[key]).map(v => v.replace(/^=/, '')).join(', ') : 'Menu kolom';
        th.classList.toggle('tg-kol-pilih', st.kolPilih.includes(key));
        th.classList.toggle('tg-kol-aktif', !!st.aktif && st.aktif.key === key && !st.kolPilih.length);
      });
    }

    // ---------- status bar dan paginasi ----------
    // tanpa "dari M" (jumlah sebelum saringan kolom): menghitungnya memanggil ulang data() di tiap render (permintaan 5 Nov 2026)
    function gambarStatus(total, jmlHal) {
      const kiri = ambil('.tg-status-kiri');
      kiri.innerHTML = `<span class="tg-jumlah${adaSaring() ? ' terfilter' : ''}"><b>${total.toLocaleString('id-ID')}</b> baris</span>` +
        (cfg.ringkas && total ? `<span class="tg-ringkas">${cfg.ringkas(st.rows)}</span>` : '') +
        (adaSaring() ? `<button type="button" class="tautan" data-hapus-saring title="Hapus semua filter kolom">Hapus filter kolom</button>` : '');
      const b = (hal, ik, label, mati) => `<button type="button" class="tg-btn-ikon" data-hal="${hal}" title="${label}" aria-label="${label}"${mati ? ' disabled' : ''}>${ik}</button>`;
      ambil('.tg-pager').innerHTML =
        b(1, IK.awal, 'Halaman pertama', st.hal <= 1) + b(st.hal - 1, IK.mundur, 'Halaman sebelumnya', st.hal <= 1) +
        `<span class="tg-hal"><input data-goto value="${st.hal}" inputmode="numeric" aria-label="Nomor halaman" title="Nomor halaman"><span>/ ${jmlHal.toLocaleString('id-ID')}</span></span>` +
        b(st.hal + 1, IK.maju, 'Halaman berikutnya', st.hal >= jmlHal) + b(jmlHal, IK.akhir, 'Halaman terakhir', st.hal >= jmlHal) +
        `<select data-ukuran title="Baris per halaman" aria-label="Baris per halaman">${UKURAN.map(n => `<option value="${n}" ${n === st.ukuran ? 'selected' : ''}>${n ? n + ' / halaman' : 'Semua (' + total.toLocaleString('id-ID') + ')'}</option>`).join('')}</select>`;
      gambarAgregat();
    }

    // strip di atas tabel: jumlah terpilih, "pilih semua hasil saringan", "batalkan pilihan"
    function gambarPilihanStrip() {
      const el = ambil('.tg-pilihan');
      if (!cfg.centang || !st.pilih.size) { el.hidden = true; return; }
      const fmt = n => n.toLocaleString('id-ID');
      const halPenuh = st.isi.length > 0 && st.isi.every(r => st.pilih.has(r.id));
      const semuaHasil = st.rows.length > 0 && st.rows.every(r => st.pilih.has(r.id));
      // stripRingkas: jumlah terpilih sudah tampil di luar tabel, strip hanya untuk "pilih semua hasil saringan"
      if (cfg.stripRingkas && !(halPenuh && st.rows.length > st.isi.length)) { el.hidden = true; return; }
      let teks = `<b>${fmt(st.pilih.size)}</b> dipilih.`;
      if (semuaHasil && st.rows.length > st.isi.length) teks = `Semua <b>${fmt(st.rows.length)}</b> baris hasil filter dipilih.`;
      else if (halPenuh && st.rows.length > st.isi.length) teks = `Semua <b>${fmt(st.isi.length)}</b> baris di halaman ini dipilih. <button type="button" class="tautan" data-pilih-semua>Pilih semua ${fmt(st.rows.length)} baris</button>`;
      el.innerHTML = `<span class="tg-pilihan-ik">${IK.cek}</span><span>${teks}</span><button type="button" class="tautan" data-batal-pilih>Batal Pilih</button>`;
      el.hidden = false;
    }

    // ---------- pilihan sel / kolom (ala Excel) ----------
    function kotakPilihan() {
      const keys = st.kolom;
      if (st.kolPilih.length) return { semuaBaris: true, kolom: keys.filter(k => st.kolPilih.includes(k)) };
      if (!st.aktif) return null;
      const j = st.jangkar || st.aktif;
      const c1 = keys.indexOf(st.aktif.key), c2 = keys.indexOf(j.key);
      return { i1: Math.min(st.aktif.i, j.i), i2: Math.max(st.aktif.i, j.i), kolom: keys.slice(Math.min(c1, c2), Math.max(c1, c2) + 1) };
    }
    function tandaiPilihan() {
      const p = kotakPilihan();
      const set = p ? new Set(p.kolom) : null;
      const banyak = p && (p.semuaBaris || p.i1 !== p.i2 || p.kolom.length > 1);
      wadah.querySelectorAll('tbody tr[data-i]').forEach(tr => {
        const i = Number(tr.dataset.i);
        const barisMasuk = p && (p.semuaBaris || (i >= p.i1 && i <= p.i2));
        tr.classList.toggle('tg-baris-aktif', !!st.aktif && st.aktif.i === i && !st.kolPilih.length);
        for (const td of tr.children) {
          const k = td.dataset.k;
          if (!k) continue;
          td.classList.toggle('tg-sel', !!(banyak && barisMasuk && set.has(k)));
          td.classList.toggle('tg-sel-aktif', !!st.aktif && !st.kolPilih.length && st.aktif.i === i && st.aktif.key === k);
        }
      });
      tandaiKepala();
      gambarAgregat();
    }
    function barisPilihan(p) { return p.semuaBaris ? st.isi : st.rows.slice(Math.max(p.i1, st.awal), Math.min(p.i2, st.awal + st.isi.length - 1) + 1); }
    function hitungAgregat() {
      const p = kotakPilihan();
      if (!p || (!p.semuaBaris && p.i1 === p.i2 && p.kolom.length === 1)) return null;
      const ks = p.kolom.map(k => PER_KEY.get(k));
      let hitung = 0, n = 0, jumlah = 0, min = Infinity, maks = -Infinity;
      for (const r of barisPilihan(p)) {
        for (const k of ks) {
          const v = nilai(k, r);
          if (kosongNilai(v)) continue;
          hitung++;
          const a = typeof v === 'number' ? v : null;
          if (a == null) continue;
          n++; jumlah += a; if (a < min) min = a; if (a > maks) maks = a;
        }
      }
      return { jumlah: n ? jumlah : null, rata: n ? jumlah / n : null, hitung, hitungAngka: n, min: n ? min : null, maks: n ? maks : null, adaAngka: n > 0 };
    }
    function gambarAgregat() {
      const el = ambil('.tg-agregat');
      if (!el) return;
      const a = hitungAgregat();
      if (!a) { el.hidden = true; return; }
      const jenis = a.adaAngka ? st.agregat : 'hitung';
      const label = AGREGAT.find(x => x[0] === jenis)[1];
      el.hidden = false;
      el.innerHTML = `${label}: <b>${a[jenis] == null ? '-' : fmtAngka(a[jenis])}</b>${IK.bawah}`;
    }
    function bukaAgregat(jangkar) {
      const a = hitungAgregat();
      if (!a) return;
      const el = document.createElement('div');
      el.className = 'tg-menu';
      el.setAttribute('role', 'menu');
      el.innerHTML = AGREGAT.map(([k, l]) => `<button type="button" class="tg-mi" data-agregat="${k}" role="menuitemradio" aria-checked="${k === st.agregat}"${!a.adaAngka && k !== 'hitung' ? ' disabled' : ''}><span class="tg-mi-cek">${k === st.agregat ? IK.cek : ''}</span>${l}<span class="tg-mi-nilai">${a[k] == null ? '-' : fmtAngka(a[k])}</span></button>`).join('');
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-agregat]');
        if (!b) return;
        st.agregat = b.dataset.agregat;
        simpan.tulis('agregat', st.agregat);
        tutupMenu();
        gambarAgregat();
      });
      pasangMenu(el, jangkar, { kanan: true });
    }

    function aturAktif(i, key, perluas) {
      const maks = st.rows.length - 1;
      if (maks < 0) return;
      i = Math.max(st.awal, Math.min(Math.min(maks, st.awal + st.isi.length - 1), i));
      st.kolPilih = [];
      st.aktif = { i, key };
      if (!perluas) st.jangkar = { i, key };
      tandaiPilihan();
      tampakkan(i, key);
    }
    // gulir supaya sel aktif terlihat (di luar kolom menempel dan judul)
    function tampakkan(i, key) {
      const g = ambil('.tg-gulir');
      const iHal = i - st.awal;
      const tinggiKepala = ambil('thead').offsetHeight;
      const atas = iHal * TINGGI, bawah = atas + TINGGI;
      if (atas < g.scrollTop) g.scrollTop = atas;
      else if (bawah > g.scrollTop + g.clientHeight - tinggiKepala) g.scrollTop = bawah - g.clientHeight + tinggiKepala;
      const { kiri, lebarTetap } = posisiKiri();
      if (key in kiri) return;
      let x = lebarTetap;
      for (const k of tampil()) { if (k.key in kiri) continue; if (k.key === key) break; x += lebar(k); }
      const w = lebar(PER_KEY.get(key));
      const kiriTampak = g.scrollLeft + lebarTetap, kananTampak = g.scrollLeft + g.clientWidth - (cfg.aksi ? LEBAR_AKSI : 0);
      if (x < kiriTampak) g.scrollLeft = x - lebarTetap;
      else if (x + w > kananTampak) g.scrollLeft = x + w - g.clientWidth + (cfg.aksi ? LEBAR_AKSI : 0);
      if (virtual()) gambarBadan(false);
    }

    // teks salinan bertab (langsung bisa ditempel ke Excel); kolom utuh = sebatas baris halaman ini
    function teksSalin() {
      const p = kotakPilihan();
      if (!p) return null;
      const ks = p.kolom.map(k => PER_KEY.get(k));
      const sel = v => (kosongNilai(v) ? '' : String(v).replace(/[\t\n\r]+/g, ' '));
      if (p.semuaBaris) {
        return { teks: [ks.map(k => k.label).join('\t'), ...st.isi.map(r => ks.map(k => sel(nilai(k, r))).join('\t'))].join('\n'), baris: st.isi.length, kolom: ks.length, halaman: st.isi.length < st.rows.length };
      }
      const rows = barisPilihan(p);
      return { teks: rows.map(r => ks.map(k => sel(nilai(k, r))).join('\t')).join('\n'), baris: rows.length, kolom: ks.length };
    }

    // ---------- menu kolom (ringkas): Search paling atas (+ drop list nilai), lalu satu baris ikon urut / pin / lebar pas isi ----------
    // kolom berhak drop list: daftar: true, atau teks (bukan daftar: false) dengan <= BATAS_DAFTAR nilai unik (diperiksa sekali per tabel)
    const bisaDaftar = new Map();
    function punyaDaftar(k) {
      if (k.daftar != null) return !!k.daftar;
      if (k.tipe !== 'teks') return false;
      if (!bisaDaftar.has(k.key)) bisaDaftar.set(k.key, nilaiUnik(cfg.data(), r => nilai(k, r), BATAS_DAFTAR) != null);
      return bisaDaftar.get(k.key);
    }
    function bukaMenuKolom(key, jangkar) {
      if (menuAktif && menuAktif.jangkar === jangkar) { tutupMenu(); return; }
      const k = PER_KEY.get(key);
      // tanda centang hanya bila kolom ini satu-satunya urutan; pilih Sort biasa = ganti seluruh urutan
      const urut = st.urut.length === 1 && st.urut[0].key === key ? st.urut[0].arah : null;
      const dipin = st.pin.includes(key);
      const el = document.createElement('div');
      el.className = 'tg-menu tg-menu-kolom';
      el.setAttribute('role', 'menu');
      el.setAttribute('aria-label', 'Menu kolom ' + k.label);
      const LU = LABEL_URUT[k.tipe] || LABEL_URUT.teks;
      const ikon = (m, ik, judul, nyala) => `<button type="button" class="tg-mk${nyala ? ' aktif' : ''}" data-m="${m}" title="${judul}" aria-label="${judul}"${nyala != null ? ` aria-pressed="${!!nyala}"` : ''}>${ik}</button>`;
      el.innerHTML = `
        ${k.saring === false ? '' : `<div class="tg-menu-cari${st.saring[key] ? ' terisi' : ''}">${IK.cari}<div data-cari></div>
          <button type="button" class="tg-btn-ikon kecil" data-m="hapus-cari" title="Hapus" aria-label="Hapus pencarian"${st.saring[key] ? '' : ' hidden'}>${IK.x}</button></div>
        <div class="tg-menu-daftar"></div>`}
        <div class="tg-menu-ikon" role="group" aria-label="Aksi kolom">
          ${ikon('naik', IK[LU.naik[0]], LU.naik[1], urut === 'naik')}${ikon('turun', IK[LU.turun[0]], LU.turun[1], urut === 'turun')}
          ${ikon('kustom', IK.kustom + (st.urut.length > 1 ? `<span class="tg-mk-n">${st.urut.length}</span>` : ''), 'Urutan Kustom')}
          <span class="tg-mk-sela"></span>
          ${ikon('pin', IK.pin, dipin ? 'Lepas Kunci' : 'Kunci Kolom', dipin)}${ikon('pas', IK.pas, 'Lebar Otomatis')}
        </div>`;
      const wadahCari = el.querySelector('[data-cari]');
      let jeda = 0, kotak = null;
      const terapCari = () => {
        clearTimeout(jeda);
        const v = kotak.nilai();
        if ((st.saring[key] || '') === v) return;
        if (v) st.saring[key] = v; else delete st.saring[key];
        el.querySelector('.tg-menu-cari').classList.toggle('terisi', !!v);
        el.querySelector('[data-m="hapus-cari"]').hidden = !v;
        st.hal = 1;
        render(); // tanpa gulir ke atas: gulir menutup menu
      };
      // kotak bertumpuk: ketik satu nilai, tempel daftar (satu nilai per baris), atau centang beberapa nilai di drop list
      // (kolom bervariasi sedikit; centang = sama persis, menu tetap terbuka). Enter = terapkan dan tutup
      if (wadahCari) {
        kotak = pasangKotakDaftar(wadahCari, {
          nilai: st.saring[key] || '', label: 'Cari di ' + k.label, placeholder: 'Cari', prefiks: '=',
          daftar: punyaDaftar(k) ? () => nilaiUnik(cfg.data(), r => nilai(k, r)) : null, wadahDaftar: el.querySelector('.tg-menu-daftar'),
          ubah: () => { clearTimeout(jeda); jeda = setTimeout(terapCari, 220); }
        });
        kotak.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kotak.komit(); terapCari(); tutupMenu(); jangkar.focus(); } });
      }
      const cari = kotak && kotak.input;
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-m]');
        if (!b) return;
        const m = b.dataset.m;
        if (m === 'naik' || m === 'turun') { st.urut = urut === m ? [] : [{ key, arah: m }]; st.hal = 1; tutupMenu(); render(true); }
        else if (m === 'kustom') { tutupMenu(); bukaUrutKustom(); }
        else if (m === 'pin') { tutupMenu(); aturPin(key, !dipin); }
        else if (m === 'pas') { tutupMenu(); pasLebar(st.kolPilih.includes(key) ? st.kolPilih : [key]); }
        else if (m === 'hapus-cari') { kotak.kosongkan(); terapCari(); cari.focus(); }
      });
      pasangMenu(el, jangkar, { saatTutup: () => { if (kotak) { kotak.komit(); if (kotak.nilai() !== (st.saring[key] || '')) terapCari(); } } });
      if (cari) { cari.focus(); cari.select(); }
    }

    // ---------- Custom Sort: beberapa level seperti dialog Sort di Excel ----------
    // Sort by / Then by, kolom dari kolom yang tampil, arah berlabel sesuai tipe; naik/turun/hapus per level.
    // Level baru selalu kosong (pengguna memilih kolomnya sendiri); level yang tetap kosong diabaikan saat OK
    function bukaUrutKustom() {
      const kolom = tampil();
      const sah = key => kolom.some(k => k.key === key);
      let L = st.urut.filter(u => sah(u.key)).map(u => ({ ...u }));
      if (!L.length) L = [{ key: '', arah: 'naik' }];
      const lap = document.createElement('div');
      lap.className = 'modal-latar';
      lap.innerHTML = `<div class="modal tg-urut-dialog" role="dialog" aria-modal="true" aria-label="Urutan Kustom">
        <div class="modal-kepala">Urutan Kustom<button class="tutup" data-u="batal" aria-label="Tutup">×</button></div>
        <div class="modal-isi"><div class="tg-urut-daftar" data-u="daftar"></div></div>
        <div class="modal-kaki"><button class="btn btn-garis tg-urut-hapus" data-u="hapus-semua">Reset</button><span class="tg-urut-sela"></span><button class="btn btn-garis" data-u="batal">Batal</button><button class="btn btn-biru" data-u="ok">OK</button></div>
      </div>`;
      const opsiKolom = key => `<option value=""${key ? '' : ' selected'}></option>` + kolom.map(k => `<option value="${esc(k.key)}"${k.key === key ? ' selected' : ''}>${esc(k.label)}</option>`).join('');
      const opsiArah = u => {
        if (!u.key) return '<option value="naik"></option>';
        const LU = LABEL_URUT[PER_KEY.get(u.key).tipe] || LABEL_URUT.teks;
        return ['naik', 'turun'].map(a => `<option value="${a}"${u.arah === a ? ' selected' : ''}>${LU[a][1].replace(/^Urutkan /, '')}</option>`).join('');
      };
      const gambar = () => {
        lap.querySelector('[data-u="daftar"]').innerHTML = L.map((u, i) => `<div class="tg-urut-level" data-i="${i}">
          <span class="tg-urut-label">${i ? 'Lalu menurut' : 'Urutkan menurut'}</span>
          <select class="sel" data-f="key" data-i="${i}" aria-label="Kolom, level ${i + 1}">${opsiKolom(u.key)}</select>
          <select class="sel" data-f="arah" data-i="${i}" aria-label="Urutan, level ${i + 1}"${u.key ? '' : ' disabled'}>${opsiArah(u)}</select>
          <span class="tg-urut-alat">
            <button type="button" class="tg-btn-ikon kecil" data-u="naik" data-i="${i}" title="Naik" aria-label="Naikkan level"${i ? '' : ' disabled'}>${IK.atas}</button>
            <button type="button" class="tg-btn-ikon kecil" data-u="turun" data-i="${i}" title="Turun" aria-label="Turunkan level"${i < L.length - 1 ? '' : ' disabled'}>${IK.bawah}</button>
            <button type="button" class="tg-btn-ikon kecil" data-u="hapus" data-i="${i}" title="Hapus Level" aria-label="Hapus level">${IK.x}</button>
          </span>
          ${i === L.length - 1 ? `<button type="button" class="tg-urut-tambah" data-u="tambah" title="Tambah Level" aria-label="Tambah level">${IK.tambah}</button>` : '<span></span>'}</div>`).join('');
        // satu kolom satu level: kolom yang sudah dipakai level lain tidak bisa dipilih lagi
        lap.querySelectorAll('select[data-f="key"]').forEach(sel => {
          const i = +sel.dataset.i;
          sel.querySelectorAll('option').forEach(o => { o.disabled = L.some((u, j) => j !== i && u.key === o.value); });
        });
        lap.querySelector('[data-u="tambah"]').disabled = L.length >= kolom.length;
        lap.querySelector('[data-u="hapus-semua"]').hidden = !st.urut.length;
      };
      const tutup = () => { lap.remove(); document.removeEventListener('keydown', tombol, true); };
      const terap = urutan => { st.urut = urutan.filter(u => u.key); st.hal = 1; tutup(); render(true); };
      const tombol = e => {
        if (e.key === 'Escape') { e.stopPropagation(); tutup(); }
        else if (e.key === 'Enter' && !e.target.matches('select, button')) { e.preventDefault(); terap(L); }
      };
      document.addEventListener('keydown', tombol, true);
      lap.addEventListener('click', e => {
        if (e.target === lap) return tutup();
        const b = e.target.closest('button[data-u]');
        if (!b || b.disabled) return;
        const i = +b.dataset.i;
        switch (b.dataset.u) {
          case 'batal': return tutup();
          case 'ok': return terap(L);
          case 'hapus-semua': return terap([]);
          case 'tambah': L.push({ key: '', arah: 'naik' }); break;
          case 'hapus': L.splice(i, 1); if (!L.length) L.push({ key: '', arah: 'naik' }); break;
          case 'naik': [L[i - 1], L[i]] = [L[i], L[i - 1]]; break;
          case 'turun': [L[i + 1], L[i]] = [L[i], L[i + 1]]; break;
        }
        gambar();
      });
      lap.addEventListener('change', e => {
        const t = e.target, u = L[+t.dataset.i];
        if (!u) return;
        if (t.dataset.f === 'key') u.key = t.value; else u.arah = t.value;
        gambar();
      });
      gambar();
      (document.getElementById('lapisan') || document.body).appendChild(lap);
      const pertama = lap.querySelector('select');
      if (pertama) pertama.focus();
    }

    function aturPin(key, pin) {
      // urutan kolom tetap (tidak bisa digeser): pin = pindah ke blok kiri, lepas pin = kembali ke tempat asalnya
      st.pin = pin ? st.pin.filter(k => k !== key).concat(key) : st.pin.filter(k => k !== key);
      st.kolom = bawaanKolom();
      rapikanPin();
      simpanKolom();
      gambarUlang();
    }

    // ---------- lebar: tarik tepi judul, dobel-klik / menu = pas isi ----------
    let kanvas = null;
    function lebarPas(key) {
      const th = ambil(`thead th[data-kol="${CSS.escape(key)}"]`);
      if (!th) return null;
      const ctx = kanvas || (kanvas = document.createElement('canvas').getContext('2d'));
      const font = el => { const g = getComputedStyle(el); return g.fontStyle + ' ' + g.fontWeight + ' ' + g.fontSize + ' ' + g.fontFamily; };
      const judul = th.querySelector('.judul-kolom');
      ctx.font = font(judul);
      let maks = ctx.measureText(judul.textContent).width + 44;
      const tds = wadah.querySelectorAll(`tbody td[data-k="${CSS.escape(key)}"]`);
      if (tds.length) {
        ctx.font = font(tds[0]);
        for (const td of tds) maks = Math.max(maks, ctx.measureText(td.textContent.trim()).width + 26 + (td.querySelector('.flag') ? 14 : 0));
      }
      return Math.max(LEBAR_MIN, Math.min(LEBAR_MAKS, Math.ceil(maks)));
    }
    function pasLebar(keys) {
      for (const k of keys) { const w = lebarPas(k); if (w) st.lebar[k] = w; }
      tulis('lebar3', st.lebar);
      gambarUlang();
    }
    function simpanLebar(key, w) {
      if (w) st.lebar[key] = w; else delete st.lebar[key];
      tulis('lebar3', st.lebar);
      gambarUlang();
    }

    // judul digambar ulang (kolom / lebar / pin berubah) tanpa kehilangan posisi gulir
    function gambarUlang() {
      const g = ambil('.tg-gulir');
      const x = g ? g.scrollLeft : 0, y = g ? g.scrollTop : 0;
      gambarKepala();
      const g2 = ambil('.tg-gulir');
      g2.scrollTop = y;
      render();
      g2.scrollLeft = x;
      if (cfg.saatKolomBerubah) cfg.saatKolomBerubah();
    }

    let abaikanKlik = false;
    const tahanKlik = () => { abaikanKlik = true; setTimeout(() => { abaikanKlik = false; }, 0); };

    // tarik tepi kanan judul = ubah lebar (judul kolom tidak bisa diseret untuk memindah kolom)
    wadah.addEventListener('pointerdown', e => {
      if (e.button !== 0 || document.body.classList.contains('kmt-mode')) return;
      const pegangan = e.target.closest('.tg-ubah');
      if (pegangan) {
        e.preventDefault();
        const key = pegangan.dataset.ubah;
        const th = pegangan.closest('th');
        const awalX = e.clientX, awalW = th.offsetWidth;
        const i = Array.prototype.indexOf.call(th.parentElement.children, th);
        const col = ambil('colgroup').children[i];
        const tabel = ambil('.tg-tabel');
        const awalTabel = tabel.offsetWidth;
        let w = awalW, digeser = false;
        pegangan.setPointerCapture(e.pointerId);
        wadah.classList.add('tg-ubah-lebar');
        const gerak = ev => {
          if (!digeser && Math.abs(ev.clientX - awalX) < 2) return;
          digeser = true;
          w = Math.max(LEBAR_MIN, Math.min(LEBAR_MAKS, Math.round(awalW + ev.clientX - awalX)));
          col.style.width = w + 'px';
          tabel.style.width = awalTabel + w - awalW + 'px';
        };
        const lepas = () => {
          pegangan.removeEventListener('pointermove', gerak);
          pegangan.removeEventListener('pointerup', lepas);
          pegangan.removeEventListener('pointercancel', lepas);
          wadah.classList.remove('tg-ubah-lebar');
          if (!digeser) return;
          tahanKlik();
          simpanLebar(key, w);
        };
        pegangan.addEventListener('pointermove', gerak);
        pegangan.addEventListener('pointerup', lepas);
        pegangan.addEventListener('pointercancel', lepas);
      }
    });
    wadah.addEventListener('dblclick', e => {
      const pegangan = !document.body.classList.contains('kmt-mode') && e.target.closest('.tg-ubah');
      if (pegangan) { pasLebar(st.kolPilih.includes(pegangan.dataset.ubah) ? st.kolPilih : [pegangan.dataset.ubah]); return; }
      // dobel-klik baris (bukan centang / tombol aksi) = buka detail baris
      const tr = cfg.dobelKlik && !document.body.classList.contains('kmt-mode') && !e.target.closest('input, button, a, .tg-aksi') && e.target.closest('tbody tr[data-id]');
      if (tr) { const r = cfg.data().find(x => x.id === Number(tr.dataset.id)); if (r) cfg.dobelKlik(r); }
    });

    // ---------- klik ----------
    let kolomTerakhir = null;
    wadah.addEventListener('click', e => {
      if (abaikanKlik) return;
      const h = e.target.closest('[data-hal]');
      if (h && !h.disabled) { st.hal = Number(h.dataset.hal); render(true); return; }
      const menu = e.target.closest('[data-menu]');
      if (menu) { bukaMenuKolom(menu.dataset.menu, menu); return; }
      // klik judul = pilih kolom utuh; Shift = sampai kolom itu, Ctrl = tambah/lepas
      const label = e.target.closest('.tg-th-label');
      if (label) {
        const key = label.dataset.label;
        if (e.shiftKey && kolomTerakhir && st.kolom.includes(kolomTerakhir)) {
          const a = st.kolom.indexOf(kolomTerakhir), b = st.kolom.indexOf(key);
          st.kolPilih = st.kolom.slice(Math.min(a, b), Math.max(a, b) + 1);
        } else if (e.ctrlKey || e.metaKey) {
          st.kolPilih = st.kolPilih.includes(key) ? st.kolPilih.filter(k => k !== key) : st.kolPilih.concat(key);
          kolomTerakhir = key;
        } else {
          st.kolPilih = st.kolPilih.length === 1 && st.kolPilih[0] === key ? [] : [key];
          kolomTerakhir = key;
        }
        st.aktif = st.jangkar = null;
        tandaiPilihan();
        ambil('.tg-gulir').focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('.tg-agregat')) { bukaAgregat(e.target.closest('.tg-agregat')); return; }
      if (e.target.closest('[data-pilih-semua]')) { st.rows.forEach(r => st.pilih.add(r.id)); render(); return; }
      if (e.target.closest('[data-batal-pilih]')) { st.pilih.clear(); render(); return; }
      if (e.target.closest('[data-hapus-saring]')) { st.saring = {}; st.hal = 1; render(true); return; }
      const a = e.target.closest('[data-aksi]');
      if (a && cfg.klikAksi) {
        const rid = Number(a.closest('tr').dataset.id);
        cfg.klikAksi(a.dataset.aksi, st.rows.find(r => r.id === rid) || root.SKPK_ASLI.PER_ID.get(rid), a);
        return;
      }
      // klik sel = sel aktif; Shift+klik = rentang
      const td = e.target.closest('tbody td[data-k]');
      if (td && !e.target.closest('a, button, input, label')) {
        const i = Number(td.parentElement.dataset.i);
        aturAktif(i, td.dataset.k, e.shiftKey && !!st.aktif);
        ambil('.tg-gulir').focus({ preventScroll: true });
      }
    });

    wadah.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.ukuran !== undefined) { st.ukuran = Number(t.value); st.hal = 1; render(true); }
      else if (t.dataset.pilih !== undefined) {
        const rid = Number(t.dataset.pilih);
        t.checked ? st.pilih.add(rid) : st.pilih.delete(rid);
        render();
      } else if (t.dataset.semua !== undefined) {
        st.isi.forEach(r => { t.checked ? st.pilih.add(r.id) : st.pilih.delete(r.id); });
        render();
      }
    });

    // ---------- keyboard: panah = sel aktif, Shift = rentang, Ctrl+A = semua kolom, Esc = lepas, Ctrl+C = salin ----------
    wadah.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.dataset.goto !== undefined) {
        const n = parseInt(e.target.value, 10);
        if (n > 0) { st.hal = n; render(true); }
        return;
      }
      if (!e.target.closest('.tg-gulir') || isian(e.target) || e.altKey) return;
      const keys = st.kolom;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); st.kolPilih = keys.slice(); st.aktif = st.jangkar = null; tandaiPilihan(); return; }
      if (e.key === 'Escape' && (st.aktif || st.kolPilih.length)) { st.aktif = st.jangkar = null; st.kolPilih = []; tandaiPilihan(); return; }
      if (ctrl && e.key === ' ' && st.aktif) { e.preventDefault(); st.kolPilih = [st.aktif.key]; st.aktif = st.jangkar = null; tandaiPilihan(); return; }
      const arah = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      const g = ambil('.tg-gulir');
      if (!st.aktif) {
        // tanpa sel aktif: panah kiri/kanan menggeser tabel satu kolom, Home/End ke ujung
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); g.scrollLeft += (e.key === 'ArrowRight' ? 1 : -1) * 160; }
        else if (arah && st.isi.length && e.key === 'ArrowDown' && !g.scrollTop) { e.preventDefault(); aturAktif(st.awal, keys[st.pin.length] || keys[0]); }
        return;
      }
      const ujung = st.awal + st.isi.length - 1;
      if (arah) {
        e.preventDefault();
        const c = keys.indexOf(st.aktif.key);
        const i = ctrl ? (arah[0] < 0 ? st.awal : arah[0] > 0 ? ujung : st.aktif.i) : st.aktif.i + arah[0];
        const ck = ctrl ? (arah[1] < 0 ? 0 : arah[1] > 0 ? keys.length - 1 : c) : Math.max(0, Math.min(keys.length - 1, c + arah[1]));
        aturAktif(i, keys[ck], e.shiftKey);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        aturAktif(ctrl ? (e.key === 'Home' ? st.awal : ujung) : st.aktif.i, e.key === 'Home' ? keys[0] : keys[keys.length - 1], e.shiftKey);
      } else if (e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault();
        const n = Math.max(1, Math.floor(g.clientHeight / TINGGI) - 1);
        aturAktif(st.aktif.i + (e.key === 'PageDown' ? n : -n), st.aktif.key, e.shiftKey);
      }
    });
    // event copy peramban: tidak perlu izin clipboard; teks yang diblok tetap disalin seperti biasa
    wadah.addEventListener('copy', e => {
      if (!e.target.closest || !e.target.closest('.tg-gulir') || isian(e.target)) return;
      const s = getSelection();
      if (s && String(s).trim()) return;
      const h = teksSalin();
      if (!h) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', h.teks);
      const fmt = n => n.toLocaleString('id-ID');
      pesan('Tersalin', `${fmt(h.baris)} baris × ${fmt(h.kolom)} kolom` + (h.halaman ? ' (halaman ini saja)' : ''));
    });

    // tarik isi tabel dengan mouse untuk menggeser (seperti tangan di peta); klik biasa tetap jalan
    wadah.addEventListener('pointerdown', e => {
      const g = e.target.closest('.tg-gulir');
      if (!g || e.pointerType !== 'mouse' || e.button !== 0 || e.shiftKey || document.body.classList.contains('kmt-mode')) return;
      if (!e.target.closest('tbody') || e.target.closest('input, button, a, select, label, textarea')) return;
      const x0 = e.clientX, y0 = e.clientY, l0 = g.scrollLeft, t0 = g.scrollTop;
      let jalan = false;
      const gerak = ev => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!jalan) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          jalan = true;
          g.classList.add('tg-ditarik');
          const s = getSelection();
          if (s) s.removeAllRanges();
        }
        ev.preventDefault();
        g.scrollLeft = l0 - dx;
        g.scrollTop = t0 - dy;
      };
      const lepas = () => {
        removeEventListener('pointermove', gerak);
        removeEventListener('pointerup', lepas);
        removeEventListener('pointercancel', lepas);
        g.classList.remove('tg-ditarik');
        if (jalan) tahanKlik();
      };
      addEventListener('pointermove', gerak);
      addEventListener('pointerup', lepas);
      addEventListener('pointercancel', lepas);
    });

    // ---------- keadaan (untuk diingat peramban dan tombol Urungkan) ----------
    function keadaan() {
      return { saring: { ...st.saring }, hal: st.hal, ukuran: st.ukuran, urut: st.urut.map(u => ({ ...u })), pilih: Array.from(st.pilih) };
    }
    function terimaKeadaan(k) {
      st.saring = Object.fromEntries(Object.entries(k.saring || {}).filter(([key, v]) => PER_KEY.has(key) && v));
      st.hal = k.hal || 1;
      st.ukuran = UKURAN.includes(k.ukuran) && k.ukuran ? k.ukuran : 50;
      // keadaan lama menyimpan satu urutan { key, arah }; sekarang daftar level
      const urut = Array.isArray(k.urut) ? k.urut : k.urut ? [k.urut] : [];
      st.urut = urut.filter((u, i) => u && PER_KEY.has(u.key) && (u.arah === 'naik' || u.arah === 'turun') && urut.findIndex(x => x && x.key === u.key) === i);
      st.pilih = new Set(k.pilih || []);
    }
    function pulihkan(k) { terimaKeadaan(k || {}); render(true); }
    // lebar layar berubah: jumlah kolom pin yang muat bisa berubah
    {
      let jeda = 0, lebarLama = 0;
      const ubah = () => {
        if (!wadah.isConnected) return removeEventListener('resize', ubah);
        clearTimeout(jeda);
        jeda = setTimeout(() => { if (st.pin.length && wadah.clientWidth !== lebarLama) { lebarLama = wadah.clientWidth; gambarUlang(); } }, 150);
      };
      addEventListener('resize', ubah);
    }

    const awal = cfg.ingat && id && simpan.baca('tabel:' + id);
    if (awal) terimaKeadaan(awal);

    gambarKepala();
    render();
    const api = {
      render: () => render(),
      terfilter,
      keadaan,
      pulihkan,
      // ada yang bisa dipulihkan: saringan, urutan, pilihan, atau bukan halaman pertama
      adaKeadaan: () => adaSaring() || st.urut.length > 0 || st.pilih.size > 0 || st.hal > 1,
      terhubung: () => wadah.isConnected,
      terpilih: () => Array.from(st.pilih),
      kolomTampil: () => tampil(),
      kosongkanPilihan() { st.pilih.clear(); render(); },
      // lepas centang baris yang memenuhi fn(id), mis. baris yang baru disembunyikan saringan luar
      lepasPilihan(fn) { let n = 0; for (const id of st.pilih) if (fn(id)) { st.pilih.delete(id); n++; } if (n) render(); return n; },
      reset() { st.saring = {}; st.hal = 1; st.urut = []; render(true); }
    };
    return api;
  }

  root.buatTabel = buatTabel;
  root.pasangDaftarNilai = pasangDaftarNilai;
  root.pasangKotakDaftar = pasangKotakDaftar;
  root.pisahDaftarSkpk = pisahDaftar;
  root.digitSajaSkpk = digitSaja;
  root.nilaiUnikSkpk = nilaiUnik;
  root.BATAS_DAFTAR_SKPK = BATAS_DAFTAR;
  root.esc = esc;
  root.keAngkaSkpk = keAngka;
})(window);
