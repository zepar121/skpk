// GET  /api/komentar  semua komentar dan balasan yang belum dihapus, terlama dulu
// POST /api/komentar  { halaman, jangkar, teks, nama, penulis, induk?, versi? } -> komentar baru
import { db, jawab, galat, teks } from '../../lib/db.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await (await db(env)).prepare('SELECT id, induk, halaman, jangkar, teks, nama, penulis, status, status_oleh, versi, dibuat, diubah FROM komentar WHERE dihapus = 0 ORDER BY id').all();
    return jawab(results);
  } catch (e) {
    return galat(e.message, 503);
  }
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return galat('Isi permintaan bukan JSON.'); }
  const isi = teks(b.teks, 4000);
  const nama = teks(b.nama, 80);
  const halaman = teks(b.halaman, 300);
  const jangkar = b.jangkar == null ? null : teks(typeof b.jangkar === 'string' ? b.jangkar : JSON.stringify(b.jangkar), 4000, false);
  const penulis = teks(b.penulis, 64, false);
  const versi = teks(b.versi, 40, false);
  const induk = b.induk == null ? null : Number.isInteger(b.induk) ? b.induk : NaN;
  if (!isi) return galat('Komentar kosong atau lebih dari 4000 karakter.');
  if (!nama) return galat('Nama wajib diisi (maks. 80 karakter).');
  if (!halaman || jangkar === null && b.jangkar != null || Number.isNaN(induk)) return galat('Data halaman atau posisi komentar tidak sah.');
  try {
    const d = await db(env);
    if (induk !== null && !(await d.prepare('SELECT id FROM komentar WHERE id = ? AND dihapus = 0').bind(induk).first())) return galat('Komentar yang dibalas tidak ditemukan.', 404);
    const baru = await d.prepare('INSERT INTO komentar (induk, halaman, jangkar, teks, nama, penulis, versi) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, induk, halaman, jangkar, teks, nama, penulis, status, status_oleh, versi, dibuat, diubah')
      .bind(induk, halaman, jangkar, isi, nama, penulis, versi).first();
    return jawab(baru, 201);
  } catch (e) {
    return galat(e.message, 503);
  }
}
