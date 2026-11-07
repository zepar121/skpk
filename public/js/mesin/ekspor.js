/*
 * SKPK prototipe To-Be: ekspor hasil Browse ke CSV dan Excel (.xlsx), tanpa pustaka luar.
 * kols = [{ key, label, tipe ('angka' | 'tanggal' | 'kode' | 'teks'), lebar }], rows = objek baris (nilai mentah r[key]).
 * - CSV: UTF-8 dengan BOM, pemisah koma, kutip RFC 4180, angka mentah (titik desimal), tanggal ISO.
 *   Teks yang diawali = + - @ diberi kutip tunggal supaya tidak dibaca sebagai rumus oleh Excel.
 * - XLSX: satu ZIP tanpa kompresi (STORE). Sheet "Data" (header tebal, baris header dibekukan, autofilter;
 *   angka = angka, tanggal = tanggal Excel dd/mm/yyyy, kode dan teks = teks sehingga nol di depan tetap ada)
 *   dan sheet "Query" berisi pasangan [label, nilai] dari info.meta.
 */
(function (root) {
  'use strict';

  const kosong = v => v === '' || v === null || v === undefined;

  // ---------- CSV ----------
  function selCsv(v, tipe) {
    if (kosong(v)) return '';
    let s = String(v);
    if (tipe !== 'angka' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(kols, rows) {
    const baris = [kols.map(k => selCsv(k.label, 'teks')).join(',')];
    for (const r of rows) baris.push(kols.map(k => selCsv(r[k.key], k.tipe)).join(','));
    return '﻿' + baris.join('\r\n') + '\r\n';
  }

  // ---------- XML ----------
  // karakter kendali yang tidak sah di XML 1.0 dibuang
  const xml = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function hurufKolom(i) {
    let s = '';
    for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  }
  // tanggal ISO (YYYY-MM-DD...) -> nomor seri Excel; null bila bukan tanggal
  function seriTanggal(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
    if (!m) return null;
    return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
  }
  const S_HEADER = 1;
  const S_TANGGAL = 2;
  const S_TEBAL = 3;
  const S_TEKS = 4;
  function selTeks(ref, v, gaya) {
    return '<c r="' + ref + '" t="inlineStr"' + (gaya ? ' s="' + gaya + '"' : '') + '><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
  }
  function selXlsx(ref, v, tipe) {
    if (kosong(v)) return '';
    if (tipe === 'angka' && typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
    if (tipe === 'tanggal') {
      const n = seriTanggal(v);
      if (n !== null) return '<c r="' + ref + '" s="' + S_TANGGAL + '"><v>' + n + '</v></c>';
    }
    return selTeks(ref, v);
  }
  // formatKolom: kolom teks / kode diberi format Text (@) dan kolom tanggal dd/mm/yyyy, termasuk sel kosong (template import)
  const gayaKolom = k => (k.tipe === 'tanggal' ? S_TANGGAL : k.tipe === 'angka' ? 0 : S_TEKS);
  function sheetData(kols, rows, formatKolom) {
    const akhir = hurufKolom(kols.length - 1) + (rows.length + 1);
    const huruf = kols.map((k, i) => hurufKolom(i));
    const isi = [];
    isi.push('<row r="1">' + kols.map((k, i) => selTeks(huruf[i] + '1', k.label, S_HEADER)).join('') + '</row>');
    rows.forEach((r, j) => {
      const n = j + 2;
      isi.push('<row r="' + n + '">' + kols.map((k, i) => {
        if (formatKolom && gayaKolom(k) === S_TEKS && !kosong(r[k.key])) return selTeks(huruf[i] + n, r[k.key], S_TEKS);
        return selXlsx(huruf[i] + n, r[k.key], k.tipe);
      }).join('') + '</row>');
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + akhir + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols>' + kols.map((k, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.max(8, Math.min(60, Math.round((k.lebar || 120) / 7))) + '"' +
        (formatKolom && gayaKolom(k) ? ' style="' + gayaKolom(k) + '"' : '') + ' customWidth="1"/>').join('') + '</cols>' +
      '<sheetData>' + isi.join('') + '</sheetData>' +
      '<autoFilter ref="A1:' + akhir + '"/>' +
      '</worksheet>';
  }
  function sheetQuery(meta) {
    const isi = meta.map(([a, b], j) => '<row r="' + (j + 1) + '">' + selTeks('A' + (j + 1), a, S_TEBAL) + (kosong(b) ? '' : selTeks('B' + (j + 1), b)) + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="100" customWidth="1"/></cols>' +
      '<sheetData>' + isi + '</sheetData></worksheet>';
  }
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFC7CED9"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function xlsx(kols, rows, info) {
    info = info || {};
    const namaData = (info.sheet || 'Data').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    const berkas = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView/></bookViews>' +
        '<sheets><sheet name="' + xml(namaData) + '" sheetId="1" r:id="rId1"/><sheet name="' + xml(info.namaMeta || 'Query') + '" sheetId="2" r:id="rId2"/></sheets>' +
        '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' + xml(namaData.replace(/'/g, "''")) + '\'!$A$1:$' +
        hurufKolom(kols.length - 1) + '$' + (rows.length + 1) + '</definedName></definedNames>' +
        '</workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>'],
      ['xl/styles.xml', STYLES],
      ['xl/worksheets/sheet1.xml', sheetData(kols, rows, info.formatKolom)],
      ['xl/worksheets/sheet2.xml', sheetQuery(info.meta || [])]
    ];
    // meta: null = satu sheet saja (template import)
    if (info.meta === null) {
      return zip(berkas.filter(([n]) => n !== 'xl/worksheets/sheet2.xml').map(([n, s]) => [n, s
        .replace(/<Override PartName="\/xl\/worksheets\/sheet2\.xml"[^>]*\/>/, '')
        .replace(/<sheet name="[^"]*" sheetId="2" r:id="rId2"\/>/, '')
        .replace(/<Relationship Id="rId2"[^>]*\/>/, '')]));
    }
    return zip(berkas);
  }

  // ---------- ZIP (STORE, tanpa kompresi) ----------
  const TABEL_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = TABEL_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(berkas) {
    const enc = new TextEncoder();
    const d = new Date();
    const waktu = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const tgl = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const bagian = [];
    const pusat = [];
    let posisi = 0;
    for (const [nama, isi] of berkas) {
      const n = enc.encode(nama);
      const data = enc.encode(isi);
      const crc = crc32(data);
      const lokal = new DataView(new ArrayBuffer(30));
      lokal.setUint32(0, 0x04034b50, true);
      lokal.setUint16(4, 20, true);
      lokal.setUint16(6, 0x0800, true);
      lokal.setUint16(8, 0, true);
      lokal.setUint16(10, waktu, true);
      lokal.setUint16(12, tgl, true);
      lokal.setUint32(14, crc, true);
      lokal.setUint32(18, data.length, true);
      lokal.setUint32(22, data.length, true);
      lokal.setUint16(26, n.length, true);
      lokal.setUint16(28, 0, true);
      bagian.push(new Uint8Array(lokal.buffer), n, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, waktu, true);
      c.setUint16(14, tgl, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true);
      c.setUint32(24, data.length, true);
      c.setUint16(28, n.length, true);
      c.setUint32(42, posisi, true);
      pusat.push(new Uint8Array(c.buffer), n);
      posisi += 30 + n.length + data.length;
    }
    const besarPusat = pusat.reduce((s, b) => s + b.length, 0);
    const akhir = new DataView(new ArrayBuffer(22));
    akhir.setUint32(0, 0x06054b50, true);
    akhir.setUint16(8, berkas.length, true);
    akhir.setUint16(10, berkas.length, true);
    akhir.setUint32(12, besarPusat, true);
    akhir.setUint32(16, posisi, true);
    const semua = bagian.concat(pusat, [new Uint8Array(akhir.buffer)]);
    const hasil = new Uint8Array(semua.reduce((s, b) => s + b.length, 0));
    let i = 0;
    for (const b of semua) { hasil.set(b, i); i += b.length; }
    return hasil;
  }

  // ---------- unduh lewat peramban ----------
  function unduh(isi, namaFile, tipe) {
    const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const api = {
    csv,
    xlsx,
    unduh,
    TIPE: { csv: 'text/csv;charset=utf-8', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  };
  root.SkpkEkspor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
