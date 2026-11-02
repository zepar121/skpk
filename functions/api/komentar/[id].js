// PATCH  /api/komentar/:id  { status, oleh }    ubah status (baru / dikerjakan / selesai / ditolak)
// DELETE /api/komentar/:id  { penulis }          tandai dihapus; hanya penulisnya (peramban yang sama)
import { db, jawab, galat, teks, STATUS } from '../../../lib/db.js';

const idDari = p => (/^\d+$/.test(p.id) ? Number(p.id) : null);

export async function onRequestPatch({ request, env, params }) {
  const id = idDari(params);
  let b;
  try { b = await request.json(); } catch { return galat('Isi permintaan bukan JSON.'); }
  if (id === null || !STATUS.includes(b.status)) return galat('Status tidak dikenal.');
  try {
    const r = await (await db(env)).prepare("UPDATE komentar SET status = ?, status_oleh = ?, diubah = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND dihapus = 0 RETURNING id, induk, halaman, jangkar, teks, nama, penulis, status, status_oleh, versi, dibuat, diubah")
      .bind(b.status, teks(b.oleh, 80, false) || null, id).first();
    return r ? jawab(r) : galat('Komentar tidak ditemukan.', 404);
  } catch (e) {
    return galat(e.message, 503);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const id = idDari(params);
  let b = {};
  try { b = await request.json(); } catch { /* tanpa isi */ }
  if (id === null || !b.penulis) return galat('Permintaan hapus tidak sah.');
  try {
    const d = await db(env);
    const k = await d.prepare('SELECT penulis FROM komentar WHERE id = ? AND dihapus = 0').bind(id).first();
    if (!k) return galat('Komentar tidak ditemukan.', 404);
    if (k.penulis !== b.penulis) return galat('Hanya penulis komentar yang bisa menghapusnya.', 403);
    await d.prepare("UPDATE komentar SET dihapus = 1, diubah = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? OR induk = ?").bind(id, id).run();
    return jawab({ ok: true });
  } catch (e) {
    return galat(e.message, 503);
  }
}
