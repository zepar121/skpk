// Samarkan HANYA kolom Nm Imp (nama importir) di data asli sebelum situs di-online-kan.
//   node scripts/samarkan-data.mjs [folder sumber]
// Sumber bawaan: ..\website-skpk\public\data (bc20.js, notul.js asli). Hasil: public/data/bc20.js dan notul.js di folder ini.
// Yang diganti hanya nilai kolom "Nm Imp" (bc20 dan notul) menjadi nama lorem ipsum, mis. "PT LOREM DOLOR". Kolom lain,
// termasuk semua NPWP, Nm Ind, Nm Pemasok, Nm Pengirim, Nama Ppjk, No Aju, dan No Api, dibiarkan persis seperti sumbernya.
// Penggantian tetap (urutan abjad) dan sama di bc20 dan notul. Nama dengan variasi tulisan ("PT.", titik, koma) dianggap satu.
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
  fs.writeFileSync(path.join(TUJUAN, file), awal.replace(/dari .*?\. /, 'dari data asli, hanya Nm Imp yang disamarkan (scripts/samarkan-data.mjs). ') + JSON.stringify(data) + ';\n');
}
const kolomNmImp = berkas => berkas.flatMap(b => b.data.kolom.filter(k => k.label === 'Nm Imp'));
const nilaiKolom = k => ('c' in k ? [k.c] : k.k || []).filter(v => v !== null && v !== '');
function ganti(k, fn) {
  if ('c' in k) k.c = k.c == null ? k.c : fn(k.c);
  else if (k.k) k.k = k.k.map(v => (v == null ? v : fn(v)));
}

// variasi penulisan ("PT.", titik, koma, "CO., LTD") dianggap satu nama
const kunciNama = s => String(s).toUpperCase().replace(/^[:\s]+/, '').replace(/\b(PT|CV|TBK|CO|LTD|INC|CORP|CORPORATION|LIMITED)\b/g, '').replace(/[^A-Z0-9]/g, '');
// pasangan kata lorem ipsum yang unik untuk ±1.500 nama
const LOREM = ['LOREM', 'IPSUM', 'DOLOR', 'AMET', 'CONSECTETUR', 'ADIPISCING', 'ELIT', 'SED', 'TEMPOR', 'INCIDIDUNT', 'LABORE',
  'MAGNA', 'ALIQUA', 'ENIM', 'MINIM', 'VENIAM', 'NOSTRUD', 'EXERCITATION', 'ULLAMCO', 'LABORIS', 'NISI', 'ALIQUIP', 'COMMODO',
  'CONSEQUAT', 'DUIS', 'AUTE', 'IRURE', 'REPREHENDERIT', 'VOLUPTATE', 'VELIT', 'ESSE', 'CILLUM', 'FUGIAT', 'NULLA', 'PARIATUR',
  'EXCEPTEUR', 'SINT', 'OCCAECAT', 'CUPIDATAT', 'PROIDENT'];
const namaLorem = i => {
  const n = LOREM.length, a = i % n, b = (a + 1 + Math.floor(i / n)) % n;
  return 'PT ' + LOREM[a] + ' ' + LOREM[b];
};

const berkas = [baca('bc20.js'), baca('notul.js')];
const kolom = kolomNmImp(berkas);
const kunci = Array.from(new Set(kolom.flatMap(nilaiKolom).map(kunciNama))).filter(Boolean).sort();
const peta = new Map(kunci.map((k, i) => [k, namaLorem(i)]));
kolom.forEach(k => ganti(k, v => (v === '-' ? v : peta.get(kunciNama(v)) || v)));

tulis('bc20.js', berkas[0]);
tulis('notul.js', berkas[1]);
console.log(`Nm Imp disamarkan: ${kunci.length} nama -> ${TUJUAN}`);
