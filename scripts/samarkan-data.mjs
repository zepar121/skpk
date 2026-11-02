// Samarkan identitas di data asli sebelum situs di-online-kan (repo GitHub dan situs terbuka untuk umum).
//   node scripts/samarkan-data.mjs [folder sumber]
// Sumber bawaan: ..\website-skpk\public\data (bc20.js, notul.js asli). Hasil: public/data/bc20.js dan notul.js di folder ini.
// Yang diganti: nama importir / pemilik barang / PPJK / pemasok / pengirim, NPWP (semua format), No API, bagian identitas
// pengaju di No Aju, dan nama file sumber notul. Uraian barang, HS, tarif, nilai, tanggal, kantor, dan negara tetap,
// supaya flag dan hitungan tetap sama. Penggantian tetap (urutan abjad), dan sama di bc20 dan notul, jadi pencocokan
// riwayat notul ke data PIB tidak putus.
import fs from 'node:fs';
import path from 'node:path';

const AKAR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SUMBER = path.resolve(process.argv[2] || path.join(AKAR, '..', 'website-skpk', 'public', 'data'));
const TUJUAN = path.join(AKAR, 'public', 'data');

function baca(file) {
  const t = fs.readFileSync(path.join(SUMBER, file), 'utf8');
  return { awal: t.slice(0, t.indexOf('{')), data: JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) };
}
function tulis(file, { awal, data }) {
  fs.writeFileSync(path.join(TUJUAN, file), awal.replace(/dari .*?\. /, 'dari data asli, identitas disamarkan (scripts/samarkan-data.mjs). ') + JSON.stringify(data) + ';\n');
}
const kolomSemua = (berkas, label) => berkas.flatMap(b => b.data.kolom.filter(k => label.includes(k.label)));
const nilaiKolom = k => ('c' in k ? [k.c] : k.k || []).filter(v => v !== null && v !== '');
// ganti nilai teks di kolom (kamus k atau konstanta c); kolom angka (v) tidak dipakai untuk identitas
function ganti(k, fn) {
  if ('c' in k) k.c = k.c == null ? k.c : fn(k.c);
  else if (k.k) k.k = k.k.map(v => (v == null ? v : fn(v)));
}

// nama: variasi penulisan ("PT.", titik, koma, "CO., LTD") dianggap satu nama
const kunciNama = s => String(s).toUpperCase().replace(/^[:\s]+/, '').replace(/\b(PT|CV|TBK|CO|LTD|INC|CORP|CORPORATION|LIMITED)\b/g, '').replace(/[^A-Z0-9]/g, '');
function petaNama(nilai, awalan) {
  const kunci = Array.from(new Set(nilai.map(kunciNama))).filter(Boolean).sort();
  const peta = new Map(kunci.map((k, i) => [k, awalan + ' ' + String(i + 1).padStart(3, '0')]));
  return v => (v === '-' ? v : peta.get(kunciNama(v)) || v);
}

// NPWP: 9 digit pertama (identitas wajib pajak) diganti; kode cabang dan bentuk penulisan tetap
const npwp9Dari = s => {
  const d = String(s).replace(/\D/g, '');
  if (d.length === 9) return d;
  if (d.length >= 16 && d[0] === '0') return d.slice(1, 10);
  if (d.length >= 15) return d.slice(0, 9);
  return null;
};

const berkas = [baca('bc20.js'), baca('notul.js')];
const [bc20, notul] = berkas;

const LABEL_IMPORTIR = ['Nm Imp', 'Nm Ind'];
const LABEL_PPJK = ['Nama Ppjk', 'Nm Ppjk'];
const LABEL_PEMASOK = ['Nm Pemasok', 'Nm Pengirim'];
const LABEL_NPWP = ['Npwp9', 'Npwp Imp', 'Npwp Ind', 'Npwp Ppjk', 'Id Imp', 'Id Ind', 'Id Ppjk'];

for (const [label, awalan] of [[LABEL_IMPORTIR, 'PT IMPORTIR'], [LABEL_PPJK, 'PT PPJK'], [LABEL_PEMASOK, 'PEMASOK']]) {
  const kol = kolomSemua(berkas, label);
  const fn = petaNama(kol.flatMap(nilaiKolom), awalan);
  kol.forEach(k => ganti(k, fn));
}

const kolNpwp = kolomSemua(berkas, LABEL_NPWP);
const semua9 = Array.from(new Set(kolNpwp.flatMap(nilaiKolom).map(npwp9Dari).filter(Boolean))).sort();
const peta9 = new Map(semua9.map((n, i) => [n, '9' + String(i + 1).padStart(8, '0')]));
kolNpwp.forEach(k => ganti(k, v => {
  const n = npwp9Dari(v);
  return n && peta9.has(n) ? String(v).replace(n, peta9.get(n)) : v;
}));

kolomSemua(berkas, ['No Api']).forEach(k => { const peta = new Map(); ganti(k, v => { if (!peta.has(v)) peta.set(v, 'API-' + String(peta.size + 1).padStart(4, '0')); return peta.get(v); }); });

// No Aju: 6 digit kantor + 6 karakter identitas pengaju + tanggal + nomor urut; identitas pengaju diganti
const kolAju = kolomSemua(berkas, ['No Aju']);
const pengaju = Array.from(new Set(kolAju.flatMap(nilaiKolom).filter(v => String(v).length === 26).map(v => v.slice(6, 12)))).sort();
const petaAju = new Map(pengaju.map((p, i) => [p, 'Z' + String(i + 1).padStart(5, '0')]));
kolAju.forEach(k => ganti(k, v => (String(v).length === 26 ? v.slice(0, 6) + petaAju.get(v.slice(6, 12)) + v.slice(12) : v)));

notul.data.file = 'notul (disamarkan).xlsx';

tulis('bc20.js', bc20);
tulis('notul.js', notul);
console.log(`Disamarkan: ${semua9.length} NPWP, ${pengaju.length} pengaju No Aju -> ${TUJUAN}`);
