// Pintu masuk Cloudflare Worker (situs di *.workers.dev). /api/komentar* dijawab oleh handler yang sama dengan
// Pages Functions (functions/api/), semua alamat lain dilayani dari hasil build (dist) lewat binding ASSETS.
import { onRequestGet, onRequestPost } from '../functions/api/komentar.js';
import { onRequestPatch, onRequestDelete } from '../functions/api/komentar/[id].js';
import { galat } from '../lib/db.js';

const DAFTAR = { GET: onRequestGet, POST: onRequestPost };
const SATU = { PATCH: onRequestPatch, DELETE: onRequestDelete };

export default {
  async fetch(request, env) {
    const m = new URL(request.url).pathname.match(/^\/api\/komentar(?:\/([^/]+))?\/?$/);
    if (!m) return env.ASSETS.fetch(request);
    const handler = (m[1] === undefined ? DAFTAR : SATU)[request.method];
    if (!handler) return galat('Metode tidak didukung.', 405);
    return handler({ request, env, params: { id: m[1] } });
  }
};
