// Database komentar (Cloudflare D1, binding "DB"). Tabel dibuat otomatis pada permintaan pertama,
// jadi tidak perlu menjalankan SQL manual di dashboard. Komentar tidak pernah dihapus dari tabel:
// "hapus" hanya menandai dihapus = 1, supaya daftar masukan pengguna tetap utuh walau situs diperbarui.
export const SKEMA = `CREATE TABLE IF NOT EXISTS komentar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  induk INTEGER,
  halaman TEXT NOT NULL,
  jangkar TEXT,
  teks TEXT NOT NULL,
  nama TEXT NOT NULL,
  penulis TEXT,
  status TEXT NOT NULL DEFAULT 'baru',
  status_oleh TEXT,
  versi TEXT,
  dibuat TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  diubah TEXT,
  dihapus INTEGER NOT NULL DEFAULT 0
)`;

export const STATUS = ['baru', 'dikerjakan', 'selesai', 'ditolak'];

let siap = false;
export async function db(env) {
  if (!env.DB) throw new Error('Database komentar belum disambungkan (binding D1 "DB" belum diatur di Cloudflare Pages).');
  if (!siap) { await env.DB.prepare(SKEMA).run(); siap = true; }
  return env.DB;
}

export const jawab = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
export const galat = (pesan, status = 400) => jawab({ galat: pesan }, status);

// teks wajib (atau opsional) dengan batas panjang; null bila tidak sah
export function teks(v, maks, wajib = true) {
  const s = v == null ? '' : String(v).trim();
  if ((wajib && !s) || s.length > maks) return null;
  return s;
}
