/*
 * Tabel bersama SKPK Asli: judul kolom + saringan per kolom (teks / pilihan / tanggal), kolom Aksi menempel di kanan,
 * kotak centang opsional, dan paginasi gaya CEISA ("From 1 to 10 of N" atau "1-10 dari N data").
 *
 * buatTabel(wadah, {
 *   kolom: [{ key, label, lebar, saring: 'teks'|'pilih'|'tanggal'|false, nilai: r => teks untuk saringan, isi: r => html, opsi?: [] }],
 *   data: () => rows,            // dipanggil ulang tiap render (data bisa berubah karena advance filter)
 *   aksi: r => html,             // isi kolom Aksi (opsional)
 *   centang: true,               // kotak centang per baris
 *   beku: n,                     // n kolom pertama (plus centang/nomor) menempel di kiri, header menempel di atas
 *   gayaInfo: 'from' | 'dari',
 *   klikAksi: (nama, r) => {}
 * }) -> { render(), reset(), terpilih(), terfilter() }
 */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function buatTabel(wadah, cfg) {
    const st = { saring: {}, hal: 1, ukuran: 10, pilih: new Set() };
    const kolom = cfg.kolom;
    const nilai = (k, r) => (k.nilai ? k.nilai(r) : r[k.key]);

    // opsi untuk saringan pilihan diambil dari data bila tidak diberikan
    for (const k of kolom) {
      if (k.saring === 'pilih' && !k.opsi) {
        k.opsi = Array.from(new Set(cfg.data().map(r => nilai(k, r)).filter(v => v != null && v !== ''))).sort();
      }
    }

    // kolom beku dibuat selebar k.lebar saja (kotak cari size=1 supaya tidak melebarkan kolom)
    const sel = (k, i) => {
      const ringkas = cfg.beku && i < cfg.beku;
      const lebar = k.lebar ? ` style="min-width:${k.lebar}px;max-width:${k.lebar + (ringkas ? 0 : 60)}px"` : '';
      let saring = '';
      if (k.saring === 'teks') saring = `<div class="saring-teks"><span class="ik">${root.IKON.cari}</span><input class="inp" data-saring="${k.key}" placeholder="Cari ${esc(k.label)}"${ringkas ? ' size="1"' : ''}></div>`;
      else if (k.saring === 'pilih') saring = `<select class="sel kosong" data-saring="${k.key}"><option value="">Cari ${esc(k.label)}</option>${k.opsi.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
      else if (k.saring === 'tanggal') saring = `<div class="saring-teks"><span class="ik">${root.IKON.cari}</span><input class="inp" data-saring="${k.key}" data-tanggal placeholder="Select date"${ringkas ? ' size="1"' : ''} onfocus="this.type='date'" onblur="if(!this.value)this.type='text'"></div>`;
      return `<th${lebar}><span class="judul-kolom">${esc(k.label)}</span>${saring}</th>`;
    };

    wadah.innerHTML = `
      <div class="tbl-luar"><div class="tbl-gulir${cfg.beku ? ' kunci' : ''}"><table class="tbl">
        <thead><tr>
          ${cfg.centang ? '<th class="sel-cek" style="vertical-align:middle"><input type="checkbox" data-semua aria-label="Pilih semua"></th>' : ''}
          ${cfg.nomor ? '<th style="vertical-align:middle;width:60px;text-align:center">No</th>' : ''}
          ${kolom.map(sel).join('')}
          ${cfg.aksi ? '<th class="aksi">Aksi</th>' : ''}
        </tr></thead>
        <tbody></tbody>
      </table></div></div>
      <div class="pg"></div>`;
    const tbody = wadah.querySelector('tbody');
    const pg = wadah.querySelector('.pg');

    function terfilter() {
      const aktif = Object.entries(st.saring).filter(([, v]) => v !== '');
      const rows = cfg.data();
      if (!aktif.length) return rows;
      const ks = aktif.map(([key, v]) => [kolom.find(k => k.key === key), v.toLowerCase()]);
      return rows.filter(r => ks.every(([k, v]) => {
        const x = nilai(k, r);
        if (x == null) return false;
        return k.saring === 'pilih' ? String(x).toLowerCase() === v : String(x).toLowerCase().includes(v);
      }));
    }

    // posisi kiri tiap kolom beku = jumlah lebar kolom sebelumnya, diukur dari judul kolom setelah digambar.
    // Di layar sempit kolom beku dikurangi dari kanan supaya paling banyak 72% lebar tabel, sisanya tetap bisa digeser.
    function aturBeku() {
      const n = cfg.beku + (cfg.centang ? 1 : 0) + (cfg.nomor ? 1 : 0);
      const th = wadah.querySelectorAll('thead th');
      const batas = wadah.querySelector('.tbl-gulir').clientWidth * 0.72;
      const kiri = [];
      let x = 0;
      for (let i = 0; i < n && i < th.length; i++) {
        if (kiri.length > 1 && x + th[i].offsetWidth > batas) break;
        kiri.push(x);
        x += th[i].offsetWidth;
      }
      wadah.querySelectorAll('.beku').forEach(c => { c.classList.remove('beku', 'beku-akhir'); c.style.left = ''; });
      wadah.querySelectorAll('thead tr, tbody tr').forEach(tr => {
        kiri.forEach((l, i) => {
          const c = tr.children[i];
          if (!c || c.colSpan > 1) return;
          c.classList.add('beku');
          c.classList.toggle('beku-akhir', i === kiri.length - 1);
          c.style.left = l + 'px';
        });
      });
    }

    function render() {
      const rows = terfilter();
      const total = rows.length;
      const jmlHal = Math.max(1, Math.ceil(total / st.ukuran));
      if (st.hal > jmlHal) st.hal = jmlHal;
      const awal = (st.hal - 1) * st.ukuran;
      const isi = rows.slice(awal, awal + st.ukuran);
      const lebarSpan = kolom.length + (cfg.centang ? 1 : 0) + (cfg.nomor ? 1 : 0) + (cfg.aksi ? 1 : 0);
      tbody.innerHTML = isi.length ? isi.map((r, i) => `
        <tr data-id="${r.id}" class="${st.pilih.has(r.id) ? 'dipilih' : ''}">
          ${cfg.centang ? `<td class="sel-cek"><input type="checkbox" data-pilih="${r.id}" ${st.pilih.has(r.id) ? 'checked' : ''} aria-label="Pilih baris"></td>` : ''}
          ${cfg.nomor ? `<td style="text-align:center">${awal + i + 1}</td>` : ''}
          ${kolom.map((k, j) => `<td class="kecil"${k.lebar ? ` style="min-width:${k.lebar}px;max-width:${k.lebar + (cfg.beku && j < cfg.beku ? 0 : 60)}px"` : ''}>${k.isi ? k.isi(r) : esc(r[k.key] == null ? '-' : r[k.key])}</td>`).join('')}
          ${cfg.aksi ? `<td class="aksi">${cfg.aksi(r)}</td>` : ''}
        </tr>`).join('') : `<tr><td class="kosong-tbl" colspan="${lebarSpan}">Data tidak ditemukan</td></tr>`;

      const semua = wadah.querySelector('[data-semua]');
      if (semua) semua.checked = isi.length > 0 && isi.every(r => st.pilih.has(r.id));
      if (cfg.beku) aturBeku();

      // nomor halaman: 1..5, …, terakhir (seperti CEISA)
      const nomor = [];
      const mulai = Math.max(1, Math.min(st.hal - 2, jmlHal - 4));
      for (let n = mulai; n <= Math.min(jmlHal, mulai + 4); n++) nomor.push(n);
      const tombol = nomor.map(n => `<button data-hal="${n}" class="${n === st.hal ? 'aktif' : ''}">${n}</button>`).join('');
      const ujung = nomor[nomor.length - 1] < jmlHal ? `<span class="elip">•••</span><button data-hal="${jmlHal}">${jmlHal}</button>` : '';
      const info = cfg.gayaInfo === 'dari'
        ? `${total ? awal + 1 : 0}-${Math.min(awal + st.ukuran, total)} dari ${total} data`
        : `From ${total ? awal + 1 : 0} to ${Math.min(awal + st.ukuran, total)} of ${total}`;
      const goto = `<input class="inp" data-goto aria-label="Go to page">`;
      pg.innerHTML = `<span>${info}</span>
        <button data-hal="${st.hal - 1}" ${st.hal <= 1 ? 'disabled' : ''} aria-label="Sebelumnya">‹</button>${tombol}${ujung}
        <button data-hal="${st.hal + 1}" ${st.hal >= jmlHal ? 'disabled' : ''} aria-label="Berikutnya">›</button>
        <select class="sel" data-ukuran>${[10, 20, 50, 100].map(n => `<option value="${n}" ${n === st.ukuran ? 'selected' : ''}>${n} / page</option>`).join('')}</select>
        ${cfg.gayaInfo === 'dari' ? `<span>Go to</span>${goto}` : ''}`;
      if (cfg.gayaInfo !== 'dari') {
        let g = wadah.querySelector('.pg-goto');
        if (!g) { g = document.createElement('div'); g.className = 'pg-goto'; wadah.appendChild(g); }
        g.innerHTML = `<span>Go to page:</span>${goto}`;
      }
      if (cfg.setelahRender) cfg.setelahRender(total);
    }

    wadah.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.saring !== undefined) {
        // input tanggal memberi yyyy-mm-dd, sama dengan nilai mentah kolom tanggal
        st.saring[t.dataset.saring] = t.value;
        if (t.tagName === 'SELECT') t.classList.toggle('kosong', !t.value);
        st.hal = 1;
        render();
      }
    });
    wadah.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.ukuran !== undefined) { st.ukuran = Number(t.value); st.hal = 1; render(); }
      else if (t.dataset.pilih !== undefined) {
        const id = Number(t.dataset.pilih);
        t.checked ? st.pilih.add(id) : st.pilih.delete(id);
        t.closest('tr').classList.toggle('dipilih', t.checked);
        render();
      } else if (t.dataset.semua !== undefined) {
        tbody.querySelectorAll('[data-pilih]').forEach(c => { const id = Number(c.dataset.pilih); t.checked ? st.pilih.add(id) : st.pilih.delete(id); });
        render();
      }
    });
    wadah.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.dataset.goto !== undefined) {
        const n = parseInt(e.target.value, 10);
        if (n > 0) { st.hal = n; render(); }
      }
    });
    wadah.addEventListener('click', e => {
      const h = e.target.closest('[data-hal]');
      if (h && !h.disabled) { st.hal = Number(h.dataset.hal); render(); return; }
      const a = e.target.closest('[data-aksi]');
      if (a && cfg.klikAksi) {
        const id = Number(a.closest('tr').dataset.id);
        cfg.klikAksi(a.dataset.aksi, cfg.data().find(r => r.id === id) || root.SKPK_ASLI.PER_ID.get(id), a);
      }
    });

    render();
    return {
      render,
      terfilter,
      terpilih: () => Array.from(st.pilih),
      kosongkanPilihan() { st.pilih.clear(); render(); },
      reset() {
        st.saring = {}; st.hal = 1;
        wadah.querySelectorAll('[data-saring]').forEach(i => { i.value = ''; if (i.dataset.tanggal !== undefined) i.type = 'text'; if (i.tagName === 'SELECT') i.classList.add('kosong'); });
        render();
      }
    };
  }

  root.buatTabel = buatTabel;
  root.esc = esc;
})(window);
